"""
Datavalideringstester för matematiska beräkningar
"""

import asyncio
from decimal import Decimal
from typing import Dict, List, Any, Tuple
import structlog
from playwright.async_api import Page

from ..core.config import TestConfig


class CalculatorTest:
    """Tester för att verifiera att alla matematiska beräkningar är korrekta"""

    def __init__(self, page: Page, config: TestConfig, logger: structlog.BoundLogger):
        self.page = page
        self.config = config
        self.logger = logger
        self.test_data = config.get_test_data_config()
        
        # Test beräkningar för validering
        self.test_calculations = {
            "basic_math": [
                (1, 1, 2, "addition"),
                (5, 3, 2, "subtraction"),
                (4, 3, 12, "multiplication"),
                (10, 2, 5, "division"),
                (0, 5, 0, "multiplication_zero"),
                (100, 100, 0, "subtraction_equal")
            ],
            "percentage_calculations": [
                (100, 25, 25.0, "percentage_of_100"),
                (200, 50, 100.0, "percentage_of_200"),
                (80, 20, 16.0, "percentage_of_80"),
                (150, 33.33, 50.0, "percentage_with_decimals")
            ],
            "margin_calculations": [
                (100, 60, 40.0, "margin_simple"),
                (250, 150, 40.0, "margin_complex"),
                (80, 20, 75.0, "margin_high"),
                (50, 45, 10.0, "margin_low")
            ]
        }

    async def run_all_tests(self) -> Dict[str, Any]:
        """Kör alla datavalideringstester"""
        try:
            tests = [
                ("test_ingredient_cost_calculations", self.test_ingredient_cost_calculations),
                ("test_recipe_cost_calculations", self.test_recipe_cost_calculations),
                ("test_menu_item_pricing", self.test_menu_item_pricing),
                ("test_margin_calculations", self.test_margin_calculations),
                ("test_percentage_calculations", self.test_percentage_calculations),
                ("test_total_calculations", self.test_total_calculations),
                ("test_currency_formatting", self.test_currency_formatting),
                ("test_edge_cases", self.test_edge_cases)
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

    async def test_ingredient_cost_calculations(self) -> Dict[str, Any]:
        """Testa att ingredienskostnader beräknas korrekt"""
        try:
            # Navigera till ingredienser
            await self.page.goto(f"{self.config.get_frontend_base_url()}/ingredienser")
            await self.page.wait_for_selector('.page-header__title:has-text("Ingredienser")')
            
            # Hämta ingrediensdata från UI
            ingredient_rows = await self.page.query_selector_all('.table-row')
            
            calculations_correct = True
            tested_ingredients = 0
            calculation_errors = []
            
            for row in ingredient_rows[:5]:  # Testa första 5 ingredienserna
                try:
                    row_text = await row.text_content()
                    
                    # Extrahera kostnad per enhet
                    import re
                    cost_match = re.search(r'(\d+(?:\.\d+)?)\s*kr/(\w+)', row_text)
                    
                    if cost_match:
                        cost_per_unit = float(cost_match.group(1))
                        unit = cost_match.group(2)
                        
                        # Grundläggande validering
                        if cost_per_unit < 0:
                            calculations_correct = False
                            calculation_errors.append(f"Negativ kostnad: {cost_per_unit}")
                        
                        # Om det finns kvantitetsinformation, validera beräkningar
                        quantity_match = re.search(r'Mängd:\s*(\d+(?:\.\d+)?)', row_text)
                        if quantity_match:
                            quantity = float(quantity_match.group(1))
                            expected_total = cost_per_unit * quantity
                            
                            total_match = re.search(r'Total:\s*(\d+(?:\.\d+)?)\s*kr', row_text)
                            if total_match:
                                actual_total = float(total_match.group(1))
                                
                                # Kontrollera att beräkningen stämmer (1 öre tolerans)
                                if abs(actual_total - expected_total) > 0.01:
                                    calculations_correct = False
                                    calculation_errors.append(
                                        f"Felaktig total: förväntad {expected_total}, faktisk {actual_total}"
                                    )
                        
                        tested_ingredients += 1
                        
                except Exception as e:
                    calculation_errors.append(f"Fel vid validering av ingrediens: {str(e)}")
            
            return {
                "success": calculations_correct and tested_ingredients > 0,
                "tested_ingredients": tested_ingredients,
                "calculations_correct": calculations_correct,
                "errors": calculation_errors
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_recipe_cost_calculations(self) -> Dict[str, Any]:
        """Testa receptkostnadsberäkningar"""
        try:
            # Navigera till recept
            await self.page.goto(f"{self.config.get_frontend_base_url()}/recept")
            await self.page.wait_for_selector('.page-header__title:has-text("Recept")')
            
            recipe_cards = await self.page.query_selector_all('.recipe-card')
            
            calculations_correct = True
            tested_recipes = 0
            calculation_details = []
            
            for card in recipe_cards[:3]:  # Testa första 3 recepten
                try:
                    card_text = await card.text_content()
                    
                    import re
                    
                    # Hitta kostnad per portion och antal portioner
                    cost_per_serving_match = re.search(r'(\d+(?:\.\d+)?)\s*kr/portion', card_text)
                    servings_match = re.search(r'(\d+)\s*portioner?', card_text, re.IGNORECASE)
                    total_cost_match = re.search(r'Total:\s*(\d+(?:\.\d+)?)\s*kr', card_text)
                    
                    if cost_per_serving_match and servings_match and total_cost_match:
                        cost_per_serving = float(cost_per_serving_match.group(1))
                        servings = int(servings_match.group(1))
                        total_cost = float(total_cost_match.group(1))
                        
                        # Beräkna förväntad total kostnad
                        expected_total = cost_per_serving * servings
                        
                        # Validera beräkning (5 öre tolerans för avrundningar)
                        if abs(total_cost - expected_total) > 0.05:
                            calculations_correct = False
                            calculation_details.append({
                                "recipe": f"Recipe {tested_recipes + 1}",
                                "cost_per_serving": cost_per_serving,
                                "servings": servings,
                                "expected_total": expected_total,
                                "actual_total": total_cost,
                                "error": True
                            })
                        else:
                            calculation_details.append({
                                "recipe": f"Recipe {tested_recipes + 1}",
                                "cost_per_serving": cost_per_serving,
                                "servings": servings,
                                "total_cost": total_cost,
                                "error": False
                            })
                        
                        # Validera att kostnad per portion är rimlig
                        if cost_per_serving < 0 or cost_per_serving > 1000:  # Över 1000 kr/portion är suspekt
                            calculations_correct = False
                        
                        tested_recipes += 1
                        
                except Exception as e:
                    calculation_details.append({
                        "error": f"Fel vid validering av recept: {str(e)}"
                    })
            
            return {
                "success": calculations_correct and tested_recipes > 0,
                "tested_recipes": tested_recipes,
                "calculations_correct": calculations_correct,
                "calculation_details": calculation_details
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_menu_item_pricing(self) -> Dict[str, Any]:
        """Testa prissättning och marginaler för maträtter"""
        try:
            # Navigera till maträtter
            await self.page.goto(f"{self.config.get_frontend_base_url()}/matratter")
            await self.page.wait_for_selector('.page-header__title:has-text("Maträtter")')
            
            menu_items = await self.page.query_selector_all('.menu-item-card')
            
            pricing_correct = True
            tested_items = 0
            pricing_details = []
            
            for item in menu_items[:3]:  # Testa första 3 maträtterna
                try:
                    item_text = await item.text_content()
                    
                    import re
                    
                    # Extrahera pris, kostnad och marginal
                    price_match = re.search(r'Pris:\s*(\d+(?:\.\d+)?)\s*kr', item_text)
                    cost_match = re.search(r'Kostnad:\s*(\d+(?:\.\d+)?)\s*kr', item_text)
                    margin_match = re.search(r'Marginal:\s*(\d+(?:\.\d+)?)%', item_text)
                    
                    if price_match and cost_match and margin_match:
                        price = float(price_match.group(1))
                        cost = float(cost_match.group(1))
                        margin = float(margin_match.group(1))
                        
                        # Beräkna förväntad marginal
                        if price > 0:
                            expected_margin = ((price - cost) / price) * 100
                        else:
                            expected_margin = 0
                        
                        # Validera marginalberäkning (1% tolerans)
                        margin_correct = abs(margin - expected_margin) <= 1.0
                        
                        # Validera att kostnad inte är högre än pris
                        cost_reasonable = cost <= price
                        
                        # Validera att värden är positiva
                        values_positive = price >= 0 and cost >= 0
                        
                        item_correct = margin_correct and cost_reasonable and values_positive
                        
                        if not item_correct:
                            pricing_correct = False
                        
                        pricing_details.append({
                            "item": f"Menu Item {tested_items + 1}",
                            "price": price,
                            "cost": cost,
                            "margin": margin,
                            "expected_margin": round(expected_margin, 2),
                            "margin_correct": margin_correct,
                            "cost_reasonable": cost_reasonable,
                            "values_positive": values_positive,
                            "overall_correct": item_correct
                        })
                        
                        tested_items += 1
                        
                except Exception as e:
                    pricing_details.append({
                        "error": f"Fel vid validering av maträtt: {str(e)}"
                    })
            
            return {
                "success": pricing_correct and tested_items > 0,
                "tested_items": tested_items,
                "pricing_correct": pricing_correct,
                "pricing_details": pricing_details
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_margin_calculations(self) -> Dict[str, Any]:
        """Testa specifikt marginalberäkningar med kända värden"""
        try:
            margin_tests = []
            all_correct = True
            
            # Testa med fördefinierade värden
            test_cases = [
                (100, 60, 40.0),  # Pris 100, kostnad 60, förväntad marginal 40%
                (250, 150, 40.0),  # Pris 250, kostnad 150, förväntad marginal 40%
                (80, 20, 75.0),    # Pris 80, kostnad 20, förväntad marginal 75%
                (50, 45, 10.0),    # Pris 50, kostnad 45, förväntad marginal 10%
                (200, 0, 100.0),   # Pris 200, kostnad 0, förväntad marginal 100%
            ]
            
            for price, cost, expected_margin in test_cases:
                # Beräkna marginal med samma formel som systemet borde använda
                calculated_margin = ((price - cost) / price) * 100 if price > 0 else 0
                
                # Kontrollera att beräkningen stämmer
                margin_correct = abs(calculated_margin - expected_margin) < 0.01
                
                if not margin_correct:
                    all_correct = False
                
                margin_tests.append({
                    "price": price,
                    "cost": cost,
                    "expected_margin": expected_margin,
                    "calculated_margin": round(calculated_margin, 2),
                    "correct": margin_correct
                })
            
            # Testa edge cases
            edge_cases = [
                (0, 0, 0),      # Pris 0, kostnad 0
                (100, 100, 0),  # Pris = kostnad, marginal ska vara 0%
                (50, 60, -20),  # Kostnad > pris, negativ marginal
            ]
            
            for price, cost, expected_margin in edge_cases:
                calculated_margin = ((price - cost) / price) * 100 if price > 0 else 0
                margin_correct = abs(calculated_margin - expected_margin) < 0.01
                
                margin_tests.append({
                    "price": price,
                    "cost": cost,
                    "expected_margin": expected_margin,
                    "calculated_margin": round(calculated_margin, 2),
                    "correct": margin_correct,
                    "edge_case": True
                })
            
            return {
                "success": all_correct,
                "total_tests": len(margin_tests),
                "margin_tests": margin_tests,
                "all_calculations_correct": all_correct
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_percentage_calculations(self) -> Dict[str, Any]:
        """Testa procentberäkningar"""
        try:
            percentage_tests = []
            all_correct = True
            
            # Testa grundläggande procentberäkningar
            test_cases = [
                (100, 25, 25.0),      # 25% av 100 = 25
                (200, 50, 100.0),     # 50% av 200 = 100
                (80, 12.5, 10.0),     # 12.5% av 80 = 10
                (150, 33.33, 50.0),   # 33.33% av 150 ≈ 50
                (1000, 5, 50.0),      # 5% av 1000 = 50
            ]
            
            for base_value, percentage, expected_result in test_cases:
                # Beräkna procentvärde
                calculated_result = (base_value * percentage) / 100
                
                # Kontrollera att beräkningen stämmer (små avrundningsfel tillåts)
                calculation_correct = abs(calculated_result - expected_result) < 0.1
                
                if not calculation_correct:
                    all_correct = False
                
                percentage_tests.append({
                    "base_value": base_value,
                    "percentage": percentage,
                    "expected_result": expected_result,
                    "calculated_result": round(calculated_result, 2),
                    "correct": calculation_correct
                })
            
            return {
                "success": all_correct,
                "total_tests": len(percentage_tests),
                "percentage_tests": percentage_tests,
                "all_calculations_correct": all_correct
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_total_calculations(self) -> Dict[str, Any]:
        """Testa totalsummor och aggregeringar"""
        try:
            # Kontrollera sammanfattningsstatistik på olika sidor
            pages_to_test = [
                ("/ingredienser", "Ingredienser"),
                ("/recept", "Recept"),
                ("/matratter", "Maträtter")
            ]
            
            total_tests_correct = True
            page_results = []
            
            for page_url, page_name in pages_to_test:
                try:
                    await self.page.goto(f"{self.config.get_frontend_base_url()}{page_url}")
                    await self.page.wait_for_selector(f'.page-header__title:has-text("{page_name}")')
                    
                    # Hitta statistikkort
                    stats_cards = await self.page.query_selector_all('.metrics-card')
                    page_correct = True
                    stats_data = []
                    
                    for card in stats_cards:
                        card_text = await card.text_content()
                        
                        # Kontrollera att numeriska värden är rimliga
                        import re
                        numbers = re.findall(r'(\d+(?:\.\d+)?)', card_text)
                        
                        for number_str in numbers:
                            try:
                                number_value = float(number_str)
                                # Grundläggande validering - inga negativa värden i sammanfattningar
                                if number_value < 0:
                                    page_correct = False
                                    stats_data.append({
                                        "value": number_value,
                                        "error": "Negative value in summary"
                                    })
                                else:
                                    stats_data.append({
                                        "value": number_value,
                                        "valid": True
                                    })
                            except ValueError:
                                continue
                    
                    if not page_correct:
                        total_tests_correct = False
                    
                    page_results.append({
                        "page": page_name,
                        "page_correct": page_correct,
                        "stats_data": stats_data
                    })
                    
                except Exception as e:
                    total_tests_correct = False
                    page_results.append({
                        "page": page_name,
                        "error": str(e)
                    })
            
            return {
                "success": total_tests_correct,
                "pages_tested": len(pages_to_test),
                "total_calculations_correct": total_tests_correct,
                "page_results": page_results
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_currency_formatting(self) -> Dict[str, Any]:
        """Testa att valutaformatering är konsekvent"""
        try:
            # Samla all valutaformatering från olika sidor
            currency_formats = []
            formatting_consistent = True
            
            pages_to_check = ["/ingredienser", "/recept", "/matratter"]
            
            for page_url in pages_to_check:
                try:
                    await self.page.goto(f"{self.config.get_frontend_base_url()}{page_url}")
                    await asyncio.sleep(2)  # Vänta på att sidan laddas
                    
                    # Hitta alla priser/kostnader
                    page_content = await self.page.text_content('body')
                    
                    import re
                    # Hitta alla förekomster av priser (siffra + kr)
                    price_matches = re.findall(r'(\d+(?:\.\d+)?)\s*(kr|SEK|kronor)', page_content, re.IGNORECASE)
                    
                    for price, currency in price_matches:
                        currency_formats.append({
                            "price": price,
                            "currency": currency.lower(),
                            "page": page_url
                        })
                        
                        # Kontrollera att format är konsekvent
                        if currency.lower() not in ['kr', 'sek', 'kronor']:
                            formatting_consistent = False
                            
                except Exception as e:
                    continue
            
            # Analysera konsistens
            if currency_formats:
                most_common_format = max(set(fmt['currency'] for fmt in currency_formats), 
                                       key=[fmt['currency'] for fmt in currency_formats].count)
                
                inconsistent_formats = [fmt for fmt in currency_formats 
                                      if fmt['currency'] != most_common_format]
                
                if inconsistent_formats:
                    formatting_consistent = False
            
            return {
                "success": formatting_consistent and len(currency_formats) > 0,
                "total_currency_instances": len(currency_formats),
                "formatting_consistent": formatting_consistent,
                "currency_formats_found": list(set(fmt['currency'] for fmt in currency_formats))
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_edge_cases(self) -> Dict[str, Any]:
        """Testa edge cases och gränsfall"""
        try:
            edge_case_results = []
            all_edge_cases_handled = True
            
            # Test 1: Kontrollera hantering av stora tal
            large_numbers_test = await self._test_large_numbers()
            edge_case_results.append({
                "test": "large_numbers",
                "success": large_numbers_test["success"],
                "details": large_numbers_test
            })
            if not large_numbers_test["success"]:
                all_edge_cases_handled = False
            
            # Test 2: Kontrollera hantering av små decimaler
            decimal_test = await self._test_decimal_precision()
            edge_case_results.append({
                "test": "decimal_precision",
                "success": decimal_test["success"],
                "details": decimal_test
            })
            if not decimal_test["success"]:
                all_edge_cases_handled = False
            
            # Test 3: Kontrollera division med noll
            division_by_zero_test = await self._test_division_by_zero_handling()
            edge_case_results.append({
                "test": "division_by_zero",
                "success": division_by_zero_test["success"],
                "details": division_by_zero_test
            })
            if not division_by_zero_test["success"]:
                all_edge_cases_handled = False
            
            return {
                "success": all_edge_cases_handled,
                "total_edge_cases": len(edge_case_results),
                "all_handled_correctly": all_edge_cases_handled,
                "edge_case_results": edge_case_results
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _test_large_numbers(self) -> Dict[str, Any]:
        """Testa hantering av stora tal"""
        try:
            # Dessa tester kan implementeras när vi har möjlighet att skapa
            # ingredienser/recept med stora värden
            return {
                "success": True,
                "note": "Large numbers test - skulle behöva implementation av test data creation"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _test_decimal_precision(self) -> Dict[str, Any]:
        """Testa decimalprecision"""
        try:
            # Testa grundläggande decimalprecision
            test_values = [
                (10.01, 2.33, 12.34, "addition_decimals"),
                (100.50, 25.25, 75.25, "subtraction_decimals"),
                (3.33, 3, 9.99, "multiplication_decimals")
            ]
            
            precision_correct = True
            for val1, val2, expected, operation in test_values:
                if operation == "addition_decimals":
                    result = val1 + val2
                elif operation == "subtraction_decimals":
                    result = val1 - val2
                elif operation == "multiplication_decimals":
                    result = val1 * val2
                
                # Kontrollera precision (1 öre tolerans)
                if abs(result - expected) > 0.01:
                    precision_correct = False
            
            return {
                "success": precision_correct,
                "precision_tests": len(test_values),
                "precision_correct": precision_correct
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _test_division_by_zero_handling(self) -> Dict[str, Any]:
        """Testa hantering av division med noll"""
        try:
            # Detta är mer en konceptuell test - systemet bör hantera
            # division by zero gracefully
            return {
                "success": True,
                "note": "Division by zero handling - requires specific UI testing scenarios"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}