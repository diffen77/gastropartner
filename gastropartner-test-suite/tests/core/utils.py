"""
Hjälpfunktioner för GastroPartner Test Suite
"""

import json
import time
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import structlog
from playwright.async_api import Page


class TestUtils:
    """Hjälpfunktioner för tester"""
    
    def __init__(self, page: Page, logger: structlog.BoundLogger):
        self.page = page
        self.logger = logger

    async def cleanup_test_data(self, environment: str) -> Dict[str, Any]:
        """Rensa testdata efter testkörning"""
        try:
            if environment == "production":
                # Aldrig rensa data i production
                return {"success": True, "message": "Skippad - production environment"}
            
            cleanup_results = {
                "ingredients_deleted": 0,
                "recipes_deleted": 0,
                "menu_items_deleted": 0,
                "success": True
            }
            
            # Rensa test-ingredienser (de som börjar med "Test")
            await self._cleanup_ingredients(cleanup_results)
            
            # Rensa test-recept
            await self._cleanup_recipes(cleanup_results)
            
            # Rensa test-maträtter
            await self._cleanup_menu_items(cleanup_results)
            
            self.logger.info(
                "Testdata rensad",
                ingredients_deleted=cleanup_results["ingredients_deleted"],
                recipes_deleted=cleanup_results["recipes_deleted"],
                menu_items_deleted=cleanup_results["menu_items_deleted"]
            )
            
            return cleanup_results
            
        except Exception as e:
            self.logger.error("Fel vid cleanup av testdata", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "ingredients_deleted": 0,
                "recipes_deleted": 0,
                "menu_items_deleted": 0
            }

    async def _cleanup_ingredients(self, results: Dict[str, Any]) -> None:
        """Rensa test-ingredienser"""
        try:
            # Navigera till ingredienser
            await self.page.goto(f"{self._get_base_url()}/ingredienser")
            await self.page.wait_for_selector('.page-header__title:has-text("Ingredienser")')
            
            # Hitta ingredienser som börjar med "Test"
            test_ingredients = []
            ingredient_rows = await self.page.query_selector_all('.table-row')
            
            for row in ingredient_rows:
                row_text = await row.text_content()
                if "Test" in row_text or "Marginaltest" in row_text or "Test Ingrediens" in row_text:
                    test_ingredients.append(row)
            
            # Ta bort test-ingredienser
            for ingredient_row in test_ingredients:
                try:
                    delete_button = await ingredient_row.query_selector('button:has-text("Ta bort")')
                    if delete_button:
                        await delete_button.click()
                        
                        # Hantera bekräftelsedialog om den finns
                        try:
                            await self.page.click('button:has-text("Bekräfta")', timeout=2000)
                        except:
                            pass
                        
                        await asyncio.sleep(0.5)  # Kort paus
                        results["ingredients_deleted"] += 1
                        
                except Exception as e:
                    self.logger.warning("Kunde inte ta bort test-ingrediens", error=str(e))
                    
        except Exception as e:
            self.logger.warning("Fel vid cleanup av ingredienser", error=str(e))

    async def _cleanup_recipes(self, results: Dict[str, Any]) -> None:
        """Rensa test-recept"""
        try:
            await self.page.goto(f"{self._get_base_url()}/recept")
            await self.page.wait_for_selector('.page-header__title:has-text("Recept")')
            
            # Hitta test-recept
            test_recipes = []
            recipe_elements = await self.page.query_selector_all('.recipe-card, .table-row')
            
            for element in recipe_elements:
                element_text = await element.text_content()
                if "Test" in element_text or "Receptval" in element_text:
                    test_recipes.append(element)
            
            # Ta bort test-recept
            for recipe in test_recipes:
                try:
                    delete_button = await recipe.query_selector('button:has-text("Ta bort")')
                    if delete_button:
                        await delete_button.click()
                        
                        try:
                            await self.page.click('button:has-text("Bekräfta")', timeout=2000)
                        except:
                            pass
                        
                        await asyncio.sleep(0.5)
                        results["recipes_deleted"] += 1
                        
                except Exception as e:
                    self.logger.warning("Kunde inte ta bort test-recept", error=str(e))
                    
        except Exception as e:
            self.logger.warning("Fel vid cleanup av recept", error=str(e))

    async def _cleanup_menu_items(self, results: Dict[str, Any]) -> None:
        """Rensa test-maträtter"""
        try:
            await self.page.goto(f"{self._get_base_url()}/matratter")
            await self.page.wait_for_selector('.page-header__title:has-text("Maträtter")')
            
            # Hitta test-maträtter
            test_menu_items = []
            menu_item_elements = await self.page.query_selector_all('.menu-item-card, .table-row')
            
            for element in menu_item_elements:
                element_text = await element.text_content()
                if "Test" in element_text or "Marginaltest" in element_text:
                    test_menu_items.append(element)
            
            # Ta bort test-maträtter
            for menu_item in test_menu_items:
                try:
                    delete_button = await menu_item.query_selector('button:has-text("Ta bort")')
                    if delete_button:
                        await delete_button.click()
                        
                        try:
                            await self.page.click('button:has-text("Bekräfta")', timeout=2000)
                        except:
                            pass
                        
                        await asyncio.sleep(0.5)
                        results["menu_items_deleted"] += 1
                        
                except Exception as e:
                    self.logger.warning("Kunde inte ta bort test-maträtt", error=str(e))
                    
        except Exception as e:
            self.logger.warning("Fel vid cleanup av maträtter", error=str(e))

    def _get_base_url(self) -> str:
        """Hämta bas-URL från sidans aktuella URL"""
        try:
            current_url = self.page.url
            if "localhost" in current_url:
                return "http://localhost:3000"
            elif "staging" in current_url:
                return "https://staging.gastropartner.se"
            else:
                return "https://gastropartner.se"
        except:
            return "http://localhost:3000"

    async def wait_for_stable_page(self, timeout: int = 10000) -> bool:
        """Vänta på att sidan blir stabil (ingen mer laddning)"""
        try:
            await self.page.wait_for_load_state("networkidle", timeout=timeout)
            await asyncio.sleep(1)  # Extra paus för säkerhets skull
            return True
        except:
            return False

    async def take_screenshot_if_error(self, test_name: str, error: Exception) -> str:
        """Ta skärmdump vid fel"""
        try:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            screenshot_path = Path("screenshots") / f"error_{test_name}_{timestamp}.png"
            
            # Skapa katalog
            screenshot_path.parent.mkdir(exist_ok=True, parents=True)
            
            await self.page.screenshot(path=str(screenshot_path), full_page=True)
            
            self.logger.info("Skärmdump tagen vid fel", 
                           test_name=test_name, 
                           screenshot=str(screenshot_path),
                           error=str(error))
            
            return str(screenshot_path)
            
        except Exception as e:
            self.logger.warning("Kunde inte ta skärmdump", error=str(e))
            return ""

    async def verify_element_visible(self, selector: str, timeout: int = 5000) -> bool:
        """Verifiera att element är synligt"""
        try:
            await self.page.wait_for_selector(selector, state="visible", timeout=timeout)
            return True
        except:
            return False

    async def get_element_text_safe(self, selector: str) -> str:
        """Hämta elementtext säkert"""
        try:
            element = await self.page.query_selector(selector)
            if element:
                return await element.text_content() or ""
            return ""
        except:
            return ""

    async def click_element_safe(self, selector: str) -> bool:
        """Klicka på element säkert"""
        try:
            await self.page.click(selector)
            return True
        except:
            return False

    async def fill_input_safe(self, selector: str, value: str) -> bool:
        """Fyll i input säkert"""
        try:
            await self.page.fill(selector, value)
            return True
        except:
            return False


class TestDataGenerator:
    """Generera testdata för olika moduler"""
    
    @staticmethod
    def generate_ingredient_data(count: int = 5) -> List[Dict[str, Any]]:
        """Generera ingrediensdata för tester"""
        base_ingredients = [
            {"name": "Test Nötfärs", "category": "Kött", "unit": "kg", "cost_per_unit": 89.90, "supplier": "Test Leverantör"},
            {"name": "Test Potatis", "category": "Grönsaker", "unit": "kg", "cost_per_unit": 12.50, "supplier": "Test Farm"},
            {"name": "Test Lök", "category": "Grönsaker", "unit": "kg", "cost_per_unit": 8.90, "supplier": "Test Farm"},
            {"name": "Test Mjölk", "category": "Mejeri", "unit": "liter", "cost_per_unit": 15.90, "supplier": "Test Mejeri"},
            {"name": "Test Ägg", "category": "Mejeri", "unit": "st", "cost_per_unit": 3.20, "supplier": "Test Äggfarm"},
            {"name": "Test Smör", "category": "Mejeri", "unit": "kg", "cost_per_unit": 65.00, "supplier": "Test Mejeri"},
            {"name": "Test Ris", "category": "Torrvaror", "unit": "kg", "cost_per_unit": 18.50, "supplier": "Test Import"},
            {"name": "Test Tomater", "category": "Grönsaker", "unit": "kg", "cost_per_unit": 25.90, "supplier": "Test Växthus"}
        ]
        
        return base_ingredients[:count]

    @staticmethod
    def generate_recipe_data(count: int = 3) -> List[Dict[str, Any]]:
        """Generera receptdata för tester"""
        base_recipes = [
            {
                "name": "Test Köttfärssås",
                "servings": 4,
                "description": "Klassisk köttfärssås för test",
                "ingredients": [
                    {"name": "Test Nötfärs", "quantity": 0.5},
                    {"name": "Test Lök", "quantity": 0.2},
                    {"name": "Test Tomater", "quantity": 0.4}
                ]
            },
            {
                "name": "Test Pannkakor",
                "servings": 8,
                "description": "Enkla pannkakor för test",
                "ingredients": [
                    {"name": "Test Mjölk", "quantity": 0.5},
                    {"name": "Test Ägg", "quantity": 3},
                    {"name": "Test Smör", "quantity": 0.05}
                ]
            },
            {
                "name": "Test Stekt Ris",
                "servings": 4,
                "description": "Asiatisk risrätt för test",
                "ingredients": [
                    {"name": "Test Ris", "quantity": 0.3},
                    {"name": "Test Ägg", "quantity": 2},
                    {"name": "Test Lök", "quantity": 0.1}
                ]
            }
        ]
        
        return base_recipes[:count]

    @staticmethod
    def generate_menu_item_data(count: int = 3) -> List[Dict[str, Any]]:
        """Generera maträttsdata för tester"""
        base_menu_items = [
            {
                "name": "Test Köttfärssås med Pasta",
                "description": "Hemlagad köttfärssås serverad med pasta",
                "category": "Huvudrätter",
                "price": 125.00,
                "recipe": "Test Köttfärssås"
            },
            {
                "name": "Test Pannkakor med Sylt",
                "description": "Nybakade pannkakor med hemmagjord sylt",
                "category": "Desserter", 
                "price": 85.00,
                "recipe": "Test Pannkakor"
            },
            {
                "name": "Test Asiatisk Stekt Ris",
                "description": "Wokad ris med ägg och grönsaker",
                "category": "Huvudrätter",
                "price": 98.00,
                "recipe": "Test Stekt Ris"
            }
        ]
        
        return base_menu_items[:count]


class PerformanceMonitor:
    """Övervaka prestanda under tester"""
    
    def __init__(self, page: Page, logger: structlog.BoundLogger):
        self.page = page
        self.logger = logger
        self.metrics = {}

    async def start_monitoring(self) -> None:
        """Starta prestanda övervaking"""
        try:
            # Aktivera prestanda mätningar i Playwright
            await self.page.evaluate("""
                window.performance.mark('test-start');
                window.testMetrics = {
                    startTime: performance.now(),
                    navigationStart: performance.timing.navigationStart,
                    loadComplete: null
                };
            """)
        except Exception as e:
            self.logger.warning("Kunde inte starta prestanda övervaking", error=str(e))

    async def measure_page_load(self) -> Dict[str, Any]:
        """Mät sidladdningstid"""
        try:
            metrics = await self.page.evaluate("""
                () => {
                    const timing = performance.timing;
                    return {
                        navigationStart: timing.navigationStart,
                        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                        loadComplete: timing.loadEventEnd - timing.navigationStart,
                        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || null,
                        largestContentfulPaint: null // Skulle behöva Web Vitals library
                    };
                }
            """)
            
            return {
                "success": True,
                "metrics": metrics,
                "dom_ready_ms": metrics.get("domContentLoaded", 0),
                "page_load_ms": metrics.get("loadComplete", 0)
            }
            
        except Exception as e:
            self.logger.error("Fel vid mätning av sidladdningstid", error=str(e))
            return {"success": False, "error": str(e)}

    async def measure_interaction_time(self, interaction_name: str) -> Dict[str, Any]:
        """Mät interaktionstid"""
        try:
            start_time = time.time()
            
            # Returnera en callback för att avsluta mätningen
            def finish_measurement():
                end_time = time.time()
                duration = (end_time - start_time) * 1000  # Konvertera till ms
                
                self.metrics[interaction_name] = {
                    "duration_ms": duration,
                    "timestamp": end_time
                }
                
                return {
                    "success": True,
                    "interaction": interaction_name,
                    "duration_ms": round(duration, 2)
                }
            
            return {"start_time": start_time, "finish": finish_measurement}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_all_metrics(self) -> Dict[str, Any]:
        """Hämta alla insamlade mätvärden"""
        return {
            "success": True,
            "metrics": self.metrics,
            "total_interactions": len(self.metrics)
        }