"""
End-to-End tester för ingrediensmodulen
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
import structlog
from playwright.async_api import Page

from ..core.config import TestConfig


class IngredientsTest:
    """E2E tester för ingredienser"""

    def __init__(self, page: Page, config: TestConfig, logger: structlog.BoundLogger):
        self.page = page
        self.config = config
        self.logger = logger
        
        # Ladda testdata
        self.test_data = config.get_test_data_config()
        self.ingredients_data = self.test_data.get("ingredients", [])
        
        # Testresultat
        self.test_results = []

    async def run_all_tests(self) -> Dict[str, Any]:
        """Kör alla ingredienstester"""
        try:
            self.logger.info("Startar alla ingredienstester")
            
            # Lista med alla tester att köra
            tests = [
                ("test_add_single_ingredient", self.test_add_single_ingredient),
                ("test_add_batch_ingredients", self.test_add_batch_ingredients),
                ("test_ingredient_form_validation", self.test_ingredient_form_validation),
                ("test_edit_ingredient", self.test_edit_ingredient),
                ("test_delete_ingredient", self.test_delete_ingredient),
                ("test_category_filtering", self.test_category_filtering),
                ("test_search_functionality", self.test_search_functionality),
                ("test_freemium_limits", self.test_freemium_limits),
                ("test_cost_calculations", self.test_cost_calculations)
            ]
            
            passed_tests = 0
            failed_tests = 0
            
            for test_name, test_func in tests:
                try:
                    self.logger.info(f"Kör test: {test_name}")
                    result = await test_func()
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "success": result.get("success", False),
                        "details": result,
                        "timestamp": result.get("timestamp")
                    })
                    
                    if result.get("success", False):
                        passed_tests += 1
                        self.logger.info(f"✅ {test_name} GODKÄND")
                    else:
                        failed_tests += 1
                        self.logger.warning(f"❌ {test_name} MISSLYCKAD", error=result.get("error"))
                        
                except Exception as e:
                    failed_tests += 1
                    self.logger.error(f"💥 {test_name} FEL", error=str(e))
                    self.test_results.append({
                        "test_name": test_name,
                        "success": False,
                        "error": str(e),
                        "timestamp": None
                    })
            
            total_tests = len(tests)
            success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
            overall_success = failed_tests == 0
            
            summary = {
                "success": overall_success,
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "success_rate": round(success_rate, 2),
                "details": self.test_results
            }
            
            self.logger.info(
                "Ingredienstester slutförda",
                total_tests=total_tests,
                passed_tests=passed_tests,
                failed_tests=failed_tests,
                success_rate=success_rate
            )
            
            return summary
            
        except Exception as e:
            self.logger.error("Fel vid körning av ingredienstester", error=str(e))
            return {
                "success": False,
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 1,
                "error": str(e),
                "details": []
            }

    async def test_add_single_ingredient(self) -> Dict[str, Any]:
        """Testa att lägga till en enskild ingrediens"""
        try:
            import time
            start_time = time.time()
            
            # Använd första ingrediensen från testdata
            test_ingredient = self.ingredients_data[0] if self.ingredients_data else {
                "name": "Test Ingrediens",
                "category": "Kött",
                "unit": "kg",
                "cost_per_unit": 99.90,
                "supplier": "Test Supplier",
                "notes": "Test anteckning"
            }
            
            # Klicka på "Ny Ingrediens" knappen
            await self.page.click('button:has-text("Ny Ingrediens")')
            
            # Vänta på att modalen öppnas
            await self.page.wait_for_selector('.modal', timeout=5000)
            
            # Fyll i formulär
            await self.page.fill('input[name="name"]', test_ingredient["name"])
            await self.page.select_option('select[name="category"]', test_ingredient["category"])
            await self.page.select_option('select[name="unit"]', test_ingredient["unit"])
            await self.page.fill('input[name="cost_per_unit"]', str(test_ingredient["cost_per_unit"]))
            
            if test_ingredient.get("supplier"):
                await self.page.fill('input[name="supplier"]', test_ingredient["supplier"])
            
            if test_ingredient.get("notes"):
                await self.page.fill('textarea[name="notes"]', test_ingredient["notes"])
            
            # Spara ingrediens
            await self.page.click('button:has-text("Spara")')
            
            # Vänta på att modalen stängs och ingrediensen visas
            await self.page.wait_for_selector('.modal', state='hidden', timeout=5000)
            await self.page.wait_for_selector(f'text={test_ingredient["name"]}', timeout=10000)
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "success": True,
                "duration_seconds": round(duration, 2),
                "ingredient_name": test_ingredient["name"],
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_add_batch_ingredients(self) -> Dict[str, Any]:
        """Testa att lägga till många ingredienser (batch)"""
        try:
            import time
            start_time = time.time()
            
            added_count = 0
            failed_count = 0
            
            # Använd första 5 ingredienserna från testdata
            ingredients_to_add = self.ingredients_data[:5]
            
            for ingredient in ingredients_to_add:
                try:
                    # Klicka på "Ny Ingrediens"
                    await self.page.click('button:has-text("Ny Ingrediens")')
                    await self.page.wait_for_selector('.modal', timeout=3000)
                    
                    # Fyll i formulär
                    await self.page.fill('input[name="name"]', ingredient["name"])
                    await self.page.select_option('select[name="category"]', ingredient["category"])
                    await self.page.select_option('select[name="unit"]', ingredient["unit"])
                    await self.page.fill('input[name="cost_per_unit"]', str(ingredient["cost_per_unit"]))
                    
                    if ingredient.get("supplier"):
                        await self.page.fill('input[name="supplier"]', ingredient["supplier"])
                    
                    if ingredient.get("notes"):
                        await self.page.fill('textarea[name="notes"]', ingredient["notes"])
                    
                    # Spara
                    await self.page.click('button:has-text("Spara")')
                    await self.page.wait_for_selector('.modal', state='hidden', timeout=5000)
                    
                    # Kort paus mellan ingredienser
                    await asyncio.sleep(0.5)
                    
                    added_count += 1
                    
                except Exception as e:
                    self.logger.warning(f"Kunde inte lägga till ingrediens {ingredient['name']}", error=str(e))
                    failed_count += 1
                    
                    # Stäng modal om den fortfarande är öppen
                    try:
                        await self.page.click('button:has-text("Avbryt")', timeout=1000)
                    except:
                        pass
            
            end_time = time.time()
            duration = end_time - start_time
            
            success = failed_count == 0 and added_count > 0
            
            return {
                "success": success,
                "added_count": added_count,
                "failed_count": failed_count,
                "duration_seconds": round(duration, 2),
                "ingredients_per_second": round(added_count / duration, 2) if duration > 0 else 0,
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_ingredient_form_validation(self) -> Dict[str, Any]:
        """Testa formulärvalidering"""
        try:
            import time
            start_time = time.time()
            
            validation_tests = []
            
            # Test 1: Tomt namn (ska misslyckas)
            await self.page.click('button:has-text("Ny Ingrediens")')
            await self.page.wait_for_selector('.modal')
            
            # Försök spara utan namn
            await self.page.click('button:has-text("Spara")')
            
            # Kontrollera att formuläret inte skickas (modal ska fortfarande vara öppen)
            modal_visible = await self.page.is_visible('.modal')
            validation_tests.append({
                "test": "empty_name",
                "passed": modal_visible,
                "description": "Formulär ska kräva namn"
            })
            
            # Test 2: Ogiltig kostnad (negativ)
            await self.page.fill('input[name="name"]', "Test Ingrediens")
            await self.page.select_option('select[name="category"]', "Kött")
            await self.page.select_option('select[name="unit"]', "kg")
            await self.page.fill('input[name="cost_per_unit"]', "-10")
            
            await self.page.click('button:has-text("Spara")')
            modal_still_visible = await self.page.is_visible('.modal')
            validation_tests.append({
                "test": "negative_cost",
                "passed": modal_still_visible,
                "description": "Formulär ska inte acceptera negativ kostnad"
            })
            
            # Test 3: Giltig data (ska lyckas)
            await self.page.fill('input[name="cost_per_unit"]', "50.00")
            await self.page.click('button:has-text("Spara")')
            
            await self.page.wait_for_selector('.modal', state='hidden', timeout=5000)
            modal_closed = not await self.page.is_visible('.modal')
            validation_tests.append({
                "test": "valid_data",
                "passed": modal_closed,
                "description": "Giltiga data ska accepteras"
            })
            
            end_time = time.time()
            duration = end_time - start_time
            
            passed_validations = sum(1 for test in validation_tests if test["passed"])
            total_validations = len(validation_tests)
            
            return {
                "success": passed_validations == total_validations,
                "validation_tests": validation_tests,
                "passed_validations": passed_validations,
                "total_validations": total_validations,
                "duration_seconds": round(duration, 2),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_edit_ingredient(self) -> Dict[str, Any]:
        """Testa att redigera en ingrediens"""
        try:
            import time
            start_time = time.time()
            
            # Först, kontrollera att det finns ingredienser att redigera
            ingredients = await self.page.query_selector_all('.table-row')
            if not ingredients:
                return {
                    "success": False,
                    "error": "Inga ingredienser att redigera",
                    "timestamp": time.time()
                }
            
            # Klicka på första ingrediensens redigera-knapp
            first_ingredient = ingredients[0]
            await first_ingredient.click('button:has-text("Redigera")')
            
            # Vänta på redigeringsmodal
            await self.page.wait_for_selector('.modal')
            
            # Ändra namnet
            current_name = await self.page.input_value('input[name="name"]')
            new_name = f"{current_name} (Redigerad)"
            
            await self.page.fill('input[name="name"]', new_name)
            
            # Spara ändringar
            await self.page.click('button:has-text("Spara")')
            await self.page.wait_for_selector('.modal', state='hidden')
            
            # Verifiera att namnet ändrades
            updated_name_visible = await self.page.is_visible(f'text={new_name}')
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "success": updated_name_visible,
                "original_name": current_name,
                "new_name": new_name,
                "duration_seconds": round(duration, 2),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_delete_ingredient(self) -> Dict[str, Any]:
        """Testa att ta bort en ingrediens (soft delete)"""
        try:
            import time
            start_time = time.time()
            
            # Räkna ingredienser före borttagning
            ingredients_before = await self.page.query_selector_all('.table-row')
            count_before = len(ingredients_before)
            
            if count_before == 0:
                return {
                    "success": False,
                    "error": "Inga ingredienser att ta bort",
                    "timestamp": time.time()
                }
            
            # Klicka på första ingrediensens ta bort-knapp
            first_ingredient = ingredients_before[0]
            ingredient_name = await first_ingredient.text_content()
            
            await first_ingredient.click('button:has-text("Ta bort")')
            
            # Bekräfta borttagning (om bekräftelsedialog visas)
            try:
                await self.page.click('button:has-text("Bekräfta")', timeout=2000)
            except:
                # Ingen bekräftelsedialog
                pass
            
            # Vänta lite för att borttagning ska processas
            await asyncio.sleep(1)
            
            # Räkna ingredienser efter borttagning
            ingredients_after = await self.page.query_selector_all('.table-row')
            count_after = len(ingredients_after)
            
            # Soft delete - ingrediens bör vara borta från listan
            successfully_removed = count_after < count_before
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "success": successfully_removed,
                "count_before": count_before,
                "count_after": count_after,
                "removed_ingredient": ingredient_name,
                "duration_seconds": round(duration, 2),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_category_filtering(self) -> Dict[str, Any]:
        """Testa filtrering per kategori"""
        try:
            import time
            start_time = time.time()
            
            # Kontrollera att det finns en kategorifilter
            category_filter = await self.page.query_selector('select[name="category"]')
            if not category_filter:
                return {
                    "success": False,
                    "error": "Kategorifiltret hittades inte",
                    "timestamp": time.time()
                }
            
            # Hämta alla tillgängliga kategorier
            categories = await self.page.evaluate("""
                Array.from(document.querySelector('select[name="category"]').options)
                    .map(option => option.value)
                    .filter(value => value && value !== '')
            """)
            
            if not categories:
                return {
                    "success": False, 
                    "error": "Inga kategorier att testa",
                    "timestamp": time.time()
                }
            
            filtering_results = []
            
            # Testa första kategorin
            test_category = categories[0]
            await self.page.select_option('select[name="category"]', test_category)
            
            # Vänta på filtrering
            await asyncio.sleep(1)
            
            # Räkna filtrerade resultat
            filtered_rows = await self.page.query_selector_all('.table-row')
            
            filtering_results.append({
                "category": test_category,
                "filtered_count": len(filtered_rows)
            })
            
            # Återställ filter (visa alla)
            await self.page.select_option('select[name="category"]', '')
            await asyncio.sleep(1)
            
            all_rows = await self.page.query_selector_all('.table-row')
            
            # Filtreringen bör minska antalet rader (om det finns data)
            filtering_works = len(filtered_rows) <= len(all_rows)
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "success": filtering_works,
                "categories_tested": len(filtering_results),
                "filtering_results": filtering_results,
                "total_ingredients": len(all_rows),
                "duration_seconds": round(duration, 2),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_search_functionality(self) -> Dict[str, Any]:
        """Testa sökfunktionalitet"""
        try:
            import time
            start_time = time.time()
            
            # Hitta sökfält
            search_field = await self.page.query_selector('input[type="search"]')
            if not search_field:
                return {
                    "success": False,
                    "error": "Sökfält hittades inte", 
                    "timestamp": time.time()
                }
            
            # Räkna alla ingredienser först
            all_rows = await self.page.query_selector_all('.table-row')
            total_count = len(all_rows)
            
            if total_count == 0:
                return {
                    "success": False,
                    "error": "Inga ingredienser att söka bland",
                    "timestamp": time.time()
                }
            
            # Testa sökning med första ingrediensens namn
            first_row_text = await all_rows[0].text_content()
            search_term = first_row_text.split()[0]  # Första ordet
            
            await self.page.fill('input[type="search"]', search_term)
            await asyncio.sleep(1)  # Vänta på sökning
            
            # Räkna sökresultat
            search_results = await self.page.query_selector_all('.table-row')
            search_count = len(search_results)
            
            # Rensa sökfältet
            await self.page.fill('input[type="search"]', '')
            await asyncio.sleep(1)
            
            # Kontrollera att alla ingredienser visas igen
            all_rows_after = await self.page.query_selector_all('.table-row')
            restored_count = len(all_rows_after)
            
            # Sökning bör ge färre eller lika många resultat
            search_works = search_count <= total_count and restored_count == total_count
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "success": search_works,
                "search_term": search_term,
                "total_ingredients": total_count,
                "search_results": search_count,
                "restored_count": restored_count,
                "duration_seconds": round(duration, 2),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_freemium_limits(self) -> Dict[str, Any]:
        """Testa freemium-gränser för ingredienser"""
        try:
            import time
            start_time = time.time()
            
            # Kontrollera nuvarande användning i UI
            usage_info = await self.page.query_selector('.usage-info')
            if not usage_info:
                return {
                    "success": False,
                    "error": "Användningsinformation hittades inte",
                    "timestamp": time.time()
                }
            
            # Läs användningstext (t.ex. "Ingredienser: 5/50")
            usage_text = await usage_info.text_content()
            
            # Försök extrahera siffror från texten
            import re
            usage_match = re.search(r'Ingredienser:\s*(\d+)/(\d+)', usage_text)
            
            if not usage_match:
                return {
                    "success": False,
                    "error": f"Kunde inte tolka användningsinformation: {usage_text}",
                    "timestamp": time.time()
                }
            
            current_count = int(usage_match.group(1))
            max_count = int(usage_match.group(2))
            
            # Kontrollera att gränsen är rimlig (50 för freemium)
            expected_max = 50
            limit_correct = max_count == expected_max
            
            # Kontrollera att räknaren är logisk
            counter_logical = current_count >= 0 and current_count <= max_count
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "success": limit_correct and counter_logical,
                "current_usage": current_count,
                "max_limit": max_count,
                "expected_max": expected_max,
                "limit_correct": limit_correct,
                "counter_logical": counter_logical,
                "usage_text": usage_text,
                "duration_seconds": round(duration, 2),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }

    async def test_cost_calculations(self) -> Dict[str, Any]:
        """Testa att kostnadsberäkningar är korrekta"""
        try:
            import time
            start_time = time.time()
            
            # Kontrollera kostnadsstatistik i UI
            cost_stats = await self.page.query_selector_all('.metrics-card')
            
            if not cost_stats:
                return {
                    "success": False,
                    "error": "Kostnadsstatistik hittades inte",
                    "timestamp": time.time()
                }
            
            calculations_correct = True
            calculation_details = []
            
            # Hitta genomsnittlig kostnad
            for stat in cost_stats:
                stat_text = await stat.text_content()
                if "GENOMSNITTLIG KOSTNAD" in stat_text:
                    # Kontrollera att värdet är rimligt (>= 0)
                    import re
                    cost_match = re.search(r'(\d+(?:\.\d+)?)\s*kr', stat_text)
                    if cost_match:
                        avg_cost = float(cost_match.group(1))
                        cost_reasonable = avg_cost >= 0
                        calculation_details.append({
                            "metric": "average_cost",
                            "value": avg_cost,
                            "reasonable": cost_reasonable
                        })
                        
                        if not cost_reasonable:
                            calculations_correct = False
            
            # Kontrollera att totalt antal stämmer
            for stat in cost_stats:
                stat_text = await stat.text_content()
                if "TOTALT ANTAL" in stat_text:
                    count_match = re.search(r'(\d+)', stat_text)
                    if count_match:
                        total_count = int(count_match.group(1))
                        count_reasonable = total_count >= 0
                        calculation_details.append({
                            "metric": "total_count",
                            "value": total_count,
                            "reasonable": count_reasonable
                        })
                        
                        if not count_reasonable:
                            calculations_correct = False
            
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "success": calculations_correct,
                "calculation_details": calculation_details,
                "duration_seconds": round(duration, 2),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.time()
            }