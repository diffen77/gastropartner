"""
End-to-End tester för receptmodulen
"""

import asyncio
from typing import Dict, List, Any
import structlog
from playwright.async_api import Page

from ..core.config import TestConfig


class RecipesTest:
    """E2E tester för recept"""

    def __init__(self, page: Page, config: TestConfig, logger: structlog.BoundLogger):
        self.page = page
        self.config = config
        self.logger = logger
        self.test_data = config.get_test_data_config()

    async def run_all_tests(self) -> Dict[str, Any]:
        """Kör alla recepttester"""
        try:
            tests = [
                ("test_create_recipe", self.test_create_recipe),
                ("test_recipe_cost_calculation", self.test_recipe_cost_calculation),
                ("test_edit_recipe", self.test_edit_recipe),
                ("test_ingredient_selection", self.test_ingredient_selection),
                ("test_servings_calculation", self.test_servings_calculation)
            ]
            
            passed_tests = 0
            failed_tests = 0
            test_results = []
            
            for test_name, test_func in tests:
                try:
                    result = await test_func()
                    test_results.append({
                        "test_name": test_name,
                        "success": result.get("success", False),
                        "details": result
                    })
                    
                    if result.get("success", False):
                        passed_tests += 1
                    else:
                        failed_tests += 1
                        
                except Exception as e:
                    failed_tests += 1
                    test_results.append({
                        "test_name": test_name,
                        "success": False,
                        "error": str(e)
                    })
            
            return {
                "success": failed_tests == 0,
                "total_tests": len(tests),
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "details": test_results
            }
            
        except Exception as e:
            return {
                "success": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 1,
                "error": str(e)
            }

    async def test_create_recipe(self) -> Dict[str, Any]:
        """Testa att skapa ett recept"""
        try:
            # Använd testdata för recept
            recipe_data = self.test_data.get("recipes", [{}])[0]
            
            # Klicka "Nytt Recept"
            await self.page.click('button:has-text("Nytt Recept")')
            await self.page.wait_for_selector('.modal')
            
            # Fyll i receptinfo
            await self.page.fill('input[name="name"]', recipe_data.get("name", "Test Recept"))
            await self.page.fill('input[name="servings"]', str(recipe_data.get("servings", 4)))
            
            if recipe_data.get("description"):
                await self.page.fill('textarea[name="description"]', recipe_data["description"])
            
            # Spara recept
            await self.page.click('button:has-text("Spara")')
            await self.page.wait_for_selector('.modal', state='hidden')
            
            # Verifiera att receptet visas
            await self.page.wait_for_selector(f'text={recipe_data.get("name", "Test Recept")}')
            
            return {"success": True, "recipe_name": recipe_data.get("name", "Test Recept")}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_recipe_cost_calculation(self) -> Dict[str, Any]:
        """Testa att receptkostnader beräknas korrekt"""
        try:
            # Kontrollera att kostnader visas för befintliga recept
            cost_elements = await self.page.query_selector_all('.recipe-cost')
            
            calculations_correct = True
            for cost_element in cost_elements[:3]:  # Testa första 3
                cost_text = await cost_element.text_content()
                
                # Extrahera kostnad (förväntar format som "45.50 kr")
                import re
                cost_match = re.search(r'(\d+\.?\d*)', cost_text)
                if cost_match:
                    cost_value = float(cost_match.group(1))
                    if cost_value < 0:
                        calculations_correct = False
                else:
                    calculations_correct = False
            
            return {
                "success": calculations_correct,
                "costs_checked": len(cost_elements)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_edit_recipe(self) -> Dict[str, Any]:
        """Testa att redigera recept"""
        try:
            # Hitta första receptet att redigera
            recipe_rows = await self.page.query_selector_all('.table-row')
            if not recipe_rows:
                return {"success": False, "error": "Inga recept att redigera"}
            
            # Klicka redigera på första receptet
            await recipe_rows[0].click('button:has-text("Redigera")')
            await self.page.wait_for_selector('.modal')
            
            # Ändra namnet
            current_name = await self.page.input_value('input[name="name"]')
            new_name = f"{current_name} (Uppdaterat)"
            await self.page.fill('input[name="name"]', new_name)
            
            # Spara
            await self.page.click('button:has-text("Spara")')
            await self.page.wait_for_selector('.modal', state='hidden')
            
            # Verifiera ändring
            name_updated = await self.page.is_visible(f'text={new_name}')
            
            return {
                "success": name_updated,
                "original_name": current_name,
                "new_name": new_name
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_ingredient_selection(self) -> Dict[str, Any]:
        """Testa val av ingredienser för recept"""
        try:
            # Skapa nytt recept för att testa ingrediensval
            await self.page.click('button:has-text("Nytt Recept")')
            await self.page.wait_for_selector('.modal')
            
            # Fyll i basinfo
            await self.page.fill('input[name="name"]', "Test Ingrediensval")
            await self.page.fill('input[name="servings"]', "4")
            
            # Kontrollera att ingrediensväljare finns
            ingredient_selector = await self.page.query_selector('select[name="ingredient"]')
            if not ingredient_selector:
                return {"success": False, "error": "Ingrediensväljare hittades inte"}
            
            # Välj första tillgängliga ingrediens
            ingredient_options = await self.page.evaluate("""
                Array.from(document.querySelector('select[name="ingredient"]').options)
                    .map(option => ({value: option.value, text: option.text}))
                    .filter(option => option.value)
            """)
            
            if not ingredient_options:
                return {"success": False, "error": "Inga ingredienser tillgängliga"}
            
            # Välj första ingrediensen
            first_ingredient = ingredient_options[0]
            await self.page.select_option('select[name="ingredient"]', first_ingredient["value"])
            await self.page.fill('input[name="quantity"]', "1")
            
            # Lägg till ingrediens
            await self.page.click('button:has-text("Lägg till")')
            
            # Kontrollera att ingrediensen lades till i listan
            ingredient_added = await self.page.is_visible(f'text={first_ingredient["text"]}')
            
            # Avbryt (vi vill inte spara detta testrecept)
            await self.page.click('button:has-text("Avbryt")')
            
            return {
                "success": ingredient_added,
                "selected_ingredient": first_ingredient["text"],
                "available_ingredients": len(ingredient_options)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_servings_calculation(self) -> Dict[str, Any]:
        """Testa att portionsberäkningar fungerar"""
        try:
            # Hitta recept med kostnadsinformation
            recipe_elements = await self.page.query_selector_all('.recipe-card')
            
            if not recipe_elements:
                return {"success": False, "error": "Inga recept att testa"}
            
            calculations_correct = True
            tested_recipes = 0
            
            for recipe_element in recipe_elements[:2]:  # Testa första 2 recepten
                # Hämta receptinfo
                recipe_text = await recipe_element.text_content()
                
                # Leta efter portions- och kostnadsinformation
                import re
                
                # Sök efter portioner (t.ex. "4 portioner")
                servings_match = re.search(r'(\d+)\s*portioner?', recipe_text, re.IGNORECASE)
                
                # Sök efter total kostnad och kostnad per portion
                total_cost_match = re.search(r'Total:\s*(\d+\.?\d*)\s*kr', recipe_text)
                per_serving_match = re.search(r'(\d+\.?\d*)\s*kr/portion', recipe_text)
                
                if servings_match and total_cost_match and per_serving_match:
                    servings = int(servings_match.group(1))
                    total_cost = float(total_cost_match.group(1))
                    cost_per_serving = float(per_serving_match.group(1))
                    
                    # Beräkna förväntat värde
                    expected_cost_per_serving = total_cost / servings
                    
                    # Kontrollera att beräkningen stämmer (tillåt små avrundningsfel)
                    if abs(cost_per_serving - expected_cost_per_serving) > 0.02:
                        calculations_correct = False
                    
                    tested_recipes += 1
            
            return {
                "success": calculations_correct and tested_recipes > 0,
                "tested_recipes": tested_recipes,
                "calculations_correct": calculations_correct
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}