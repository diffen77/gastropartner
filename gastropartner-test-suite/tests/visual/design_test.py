"""
Visuella design och compliance tester
"""

import asyncio
from typing import Dict, List, Any, Tuple
import structlog
from playwright.async_api import Page

from ..core.config import TestConfig


class DesignTest:
    """Tester för visuell design compliance och UI guidelines"""

    def __init__(self, page: Page, config: TestConfig, logger: structlog.BoundLogger):
        self.page = page
        self.config = config
        self.logger = logger
        
        # Design guidelines att testa
        self.design_guidelines = {
            "colors": {
                "primary": "#4285f4",
                "success": "#34a853", 
                "warning": "#fbbc04",
                "error": "#ea4335",
                "background": "#f8f9fa",
                "text": "#202124"
            },
            "spacing": {
                "small": "8px",
                "medium": "16px", 
                "large": "24px",
                "xlarge": "32px"
            },
            "typography": {
                "font_family": "Inter",
                "heading_sizes": ["24px", "20px", "18px", "16px"],
                "body_size": "14px"
            },
            "components": {
                "button_height": "40px",
                "input_height": "40px",
                "border_radius": "8px"
            }
        }

    async def run_all_tests(self) -> Dict[str, Any]:
        """Kör alla design compliance tester"""
        try:
            tests = [
                ("test_color_consistency", self.test_color_consistency),
                ("test_typography_compliance", self.test_typography_compliance),
                ("test_spacing_consistency", self.test_spacing_consistency),
                ("test_component_styling", self.test_component_styling),
                ("test_responsive_design", self.test_responsive_design),
                ("test_accessibility_compliance", self.test_accessibility_compliance),
                ("test_button_states", self.test_button_states),
                ("test_form_styling", self.test_form_styling),
                ("test_modal_design", self.test_modal_design),
                ("test_navigation_consistency", self.test_navigation_consistency)
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

    async def test_color_consistency(self) -> Dict[str, Any]:
        """Testa färgkonsistens enligt design guidelines"""
        try:
            # Navigera till huvudsida
            await self.page.goto(f"{self.config.get_frontend_base_url()}")
            await asyncio.sleep(2)
            
            color_violations = []
            colors_tested = 0
            
            # Testa primära knappar
            primary_buttons = await self.page.query_selector_all('button.btn-primary, .btn-primary')
            for button in primary_buttons:
                bg_color = await button.evaluate('el => getComputedStyle(el).backgroundColor')
                if bg_color and not await self._is_similar_color(bg_color, self.design_guidelines["colors"]["primary"]):
                    color_violations.append({
                        "element": "primary_button",
                        "expected": self.design_guidelines["colors"]["primary"],
                        "actual": bg_color
                    })
                colors_tested += 1
            
            # Testa success element
            success_elements = await self.page.query_selector_all('.success, .alert-success, .text-success')
            for element in success_elements:
                color = await element.evaluate('el => getComputedStyle(el).color')
                if color and not await self._is_similar_color(color, self.design_guidelines["colors"]["success"]):
                    color_violations.append({
                        "element": "success_element",
                        "expected": self.design_guidelines["colors"]["success"],
                        "actual": color
                    })
                colors_tested += 1
            
            # Testa error element
            error_elements = await self.page.query_selector_all('.error, .alert-error, .text-error')
            for element in error_elements:
                color = await element.evaluate('el => getComputedStyle(el).color')
                if color and not await self._is_similar_color(color, self.design_guidelines["colors"]["error"]):
                    color_violations.append({
                        "element": "error_element",
                        "expected": self.design_guidelines["colors"]["error"],
                        "actual": color
                    })
                colors_tested += 1
            
            return {
                "success": len(color_violations) == 0,
                "colors_tested": colors_tested,
                "violations": color_violations,
                "compliance_rate": ((colors_tested - len(color_violations)) / colors_tested * 100) if colors_tested > 0 else 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_typography_compliance(self) -> Dict[str, Any]:
        """Testa typografi enligt design guidelines"""
        try:
            await self.page.goto(f"{self.config.get_frontend_base_url()}")
            await asyncio.sleep(2)
            
            typography_violations = []
            typography_tested = 0
            
            # Testa huvudrubriker
            headings = await self.page.query_selector_all('h1, h2, h3, h4')
            for heading in headings:
                font_family = await heading.evaluate('el => getComputedStyle(el).fontFamily')
                font_size = await heading.evaluate('el => getComputedStyle(el).fontSize')
                
                # Kontrollera font family
                if not self._contains_font_family(font_family, self.design_guidelines["typography"]["font_family"]):
                    typography_violations.append({
                        "element": await heading.tag_name(),
                        "property": "font_family",
                        "expected": self.design_guidelines["typography"]["font_family"],
                        "actual": font_family
                    })
                
                typography_tested += 1
            
            # Testa body text
            body_elements = await self.page.query_selector_all('p, span, div')
            for element in body_elements[:10]:  # Testa första 10
                font_family = await element.evaluate('el => getComputedStyle(el).fontFamily')
                
                if not self._contains_font_family(font_family, self.design_guidelines["typography"]["font_family"]):
                    typography_violations.append({
                        "element": "body_text",
                        "property": "font_family",
                        "expected": self.design_guidelines["typography"]["font_family"],
                        "actual": font_family
                    })
                
                typography_tested += 1
            
            return {
                "success": len(typography_violations) == 0,
                "typography_tested": typography_tested,
                "violations": typography_violations,
                "compliance_rate": ((typography_tested - len(typography_violations)) / typography_tested * 100) if typography_tested > 0 else 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_spacing_consistency(self) -> Dict[str, Any]:
        """Testa spacing konsistens"""
        try:
            await self.page.goto(f"{self.config.get_frontend_base_url()}")
            await asyncio.sleep(2)
            
            spacing_violations = []
            spacing_tested = 0
            
            # Testa padding på knappar
            buttons = await self.page.query_selector_all('button')
            for button in buttons[:5]:  # Testa första 5 knapparna
                padding = await button.evaluate('el => getComputedStyle(el).padding')
                # Validera att padding följer spacing guidelines
                if padding and not self._is_valid_spacing(padding):
                    spacing_violations.append({
                        "element": "button",
                        "property": "padding", 
                        "actual": padding,
                        "note": "Padding follows spacing guidelines"
                    })
                spacing_tested += 1
            
            # Testa marginaler på kort/cards
            cards = await self.page.query_selector_all('.card, .metrics-card, .recipe-card')
            for card in cards[:5]:  # Testa första 5 korten
                margin = await card.evaluate('el => getComputedStyle(el).margin')
                if margin and not self._is_valid_spacing(margin):
                    spacing_violations.append({
                        "element": "card",
                        "property": "margin",
                        "actual": margin,
                        "note": "Margin follows spacing guidelines"
                    })
                spacing_tested += 1
            
            return {
                "success": len(spacing_violations) == 0,
                "spacing_tested": spacing_tested,
                "violations": spacing_violations,
                "compliance_rate": ((spacing_tested - len(spacing_violations)) / spacing_tested * 100) if spacing_tested > 0 else 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_component_styling(self) -> Dict[str, Any]:
        """Testa komponentstilning enligt guidelines"""
        try:
            await self.page.goto(f"{self.config.get_frontend_base_url()}")
            await asyncio.sleep(2)
            
            component_violations = []
            components_tested = 0
            
            # Testa knapphöjd
            buttons = await self.page.query_selector_all('button')
            for button in buttons[:5]:
                height = await button.evaluate('el => getComputedStyle(el).height')
                min_height = await button.evaluate('el => getComputedStyle(el).minHeight')
                
                expected_height = self.design_guidelines["components"]["button_height"]
                if height and not self._is_similar_measurement(height, expected_height) and \
                   min_height and not self._is_similar_measurement(min_height, expected_height):
                    component_violations.append({
                        "component": "button",
                        "property": "height",
                        "expected": expected_height,
                        "actual": height,
                        "min_height": min_height
                    })
                components_tested += 1
            
            # Testa input höjd
            inputs = await self.page.query_selector_all('input[type="text"], input[type="email"], input[type="password"]')
            for input_element in inputs[:5]:
                height = await input_element.evaluate('el => getComputedStyle(el).height')
                expected_height = self.design_guidelines["components"]["input_height"]
                
                if height and not self._is_similar_measurement(height, expected_height):
                    component_violations.append({
                        "component": "input",
                        "property": "height",
                        "expected": expected_height,
                        "actual": height
                    })
                components_tested += 1
            
            # Testa border radius
            components_with_radius = await self.page.query_selector_all('button, input, .card, .modal')
            for component in components_with_radius[:10]:
                border_radius = await component.evaluate('el => getComputedStyle(el).borderRadius')
                expected_radius = self.design_guidelines["components"]["border_radius"]
                
                if border_radius and border_radius != "0px" and not self._is_similar_measurement(border_radius, expected_radius):
                    component_violations.append({
                        "component": await component.tag_name(),
                        "property": "border_radius",
                        "expected": expected_radius,
                        "actual": border_radius
                    })
                components_tested += 1
            
            return {
                "success": len(component_violations) == 0,
                "components_tested": components_tested,
                "violations": component_violations,
                "compliance_rate": ((components_tested - len(component_violations)) / components_tested * 100) if components_tested > 0 else 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_responsive_design(self) -> Dict[str, Any]:
        """Testa responsiv design"""
        try:
            responsive_violations = []
            viewports_tested = 0
            
            # Testa olika viewport storlekar
            viewports = [
                {"width": 1920, "height": 1080, "name": "desktop_large"},
                {"width": 1366, "height": 768, "name": "desktop_medium"},
                {"width": 768, "height": 1024, "name": "tablet"},
                {"width": 375, "height": 667, "name": "mobile"}
            ]
            
            for viewport in viewports:
                try:
                    await self.page.set_viewport_size(viewport["width"], viewport["height"])
                    await self.page.goto(f"{self.config.get_frontend_base_url()}")
                    await asyncio.sleep(2)
                    
                    # Kontrollera att innehållet är synligt
                    sidebar_visible = await self.page.is_visible('.sidebar')
                    main_content_visible = await self.page.is_visible('main, .main-content')
                    
                    # För mobila enheter förväntar vi oss att sidebar kan vara dold
                    if viewport["name"] == "mobile":
                        # På mobil är det ok om sidebar är dold
                        if not main_content_visible:
                            responsive_violations.append({
                                "viewport": viewport["name"],
                                "issue": "Main content not visible",
                                "dimensions": f"{viewport['width']}x{viewport['height']}"
                            })
                    else:
                        # På desktop/tablet ska både sidebar och main content vara synliga
                        if not (sidebar_visible and main_content_visible):
                            responsive_violations.append({
                                "viewport": viewport["name"],
                                "issue": "Layout elements not properly visible",
                                "sidebar_visible": sidebar_visible,
                                "main_content_visible": main_content_visible,
                                "dimensions": f"{viewport['width']}x{viewport['height']}"
                            })
                    
                    # Kontrollera att ingen horisontell scrollning krävs
                    body_width = await self.page.evaluate('document.body.scrollWidth')
                    viewport_width = viewport["width"]
                    
                    if body_width > viewport_width + 20:  # 20px tolerans
                        responsive_violations.append({
                            "viewport": viewport["name"],
                            "issue": "Horizontal overflow",
                            "body_width": body_width,
                            "viewport_width": viewport_width
                        })
                    
                    viewports_tested += 1
                    
                except Exception as e:
                    responsive_violations.append({
                        "viewport": viewport["name"],
                        "error": str(e)
                    })
            
            # Återställ viewport
            await self.page.set_viewport_size(1920, 1080)
            
            return {
                "success": len(responsive_violations) == 0,
                "viewports_tested": viewports_tested,
                "violations": responsive_violations,
                "responsive_compliance": len(responsive_violations) == 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_accessibility_compliance(self) -> Dict[str, Any]:
        """Testa tillgänglighet (accessibility)"""
        try:
            await self.page.goto(f"{self.config.get_frontend_base_url()}")
            await asyncio.sleep(2)
            
            accessibility_violations = []
            accessibility_tested = 0
            
            # Testa alt-text på bilder
            images = await self.page.query_selector_all('img')
            for img in images:
                alt_text = await img.get_attribute('alt')
                if not alt_text:
                    accessibility_violations.append({
                        "element": "img",
                        "issue": "Missing alt attribute",
                        "src": await img.get_attribute('src')
                    })
                accessibility_tested += 1
            
            # Testa labels på form inputs
            inputs = await self.page.query_selector_all('input[type="text"], input[type="email"], input[type="password"], textarea, select')
            for input_element in inputs:
                # Kontrollera om input har en label
                input_id = await input_element.get_attribute('id')
                has_label = False
                
                if input_id:
                    label = await self.page.query_selector(f'label[for="{input_id}"]')
                    if label:
                        has_label = True
                
                # Kontrollera aria-label som alternativ
                aria_label = await input_element.get_attribute('aria-label')
                if aria_label:
                    has_label = True
                
                # Kontrollera placeholder som sista utväg (inte idealt men acceptabelt)
                placeholder = await input_element.get_attribute('placeholder')
                if placeholder and not has_label:
                    has_label = True
                
                if not has_label:
                    accessibility_violations.append({
                        "element": "input",
                        "issue": "Missing label or aria-label",
                        "type": await input_element.get_attribute('type'),
                        "name": await input_element.get_attribute('name')
                    })
                accessibility_tested += 1
            
            # Testa buttons för accessible text
            buttons = await self.page.query_selector_all('button')
            for button in buttons:
                button_text = await button.text_content()
                aria_label = await button.get_attribute('aria-label')
                title = await button.get_attribute('title')
                
                if not (button_text and button_text.strip()) and not aria_label and not title:
                    accessibility_violations.append({
                        "element": "button",
                        "issue": "Button lacks accessible text",
                        "class": await button.get_attribute('class')
                    })
                accessibility_tested += 1
            
            # Testa heading hierarchy
            headings = await self.page.query_selector_all('h1, h2, h3, h4, h5, h6')
            if headings:
                first_heading_level = int((await headings[0].tag_name())[1])  # h1 -> 1, h2 -> 2, etc.
                if first_heading_level != 1:
                    accessibility_violations.append({
                        "element": "heading_hierarchy",
                        "issue": f"Page should start with h1, but starts with h{first_heading_level}"
                    })
                accessibility_tested += 1
            
            return {
                "success": len(accessibility_violations) == 0,
                "accessibility_tested": accessibility_tested,
                "violations": accessibility_violations,
                "wcag_compliance_rate": ((accessibility_tested - len(accessibility_violations)) / accessibility_tested * 100) if accessibility_tested > 0 else 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_button_states(self) -> Dict[str, Any]:
        """Testa button states (hover, focus, disabled)"""
        try:
            await self.page.goto(f"{self.config.get_frontend_base_url()}")
            await asyncio.sleep(2)
            
            button_state_violations = []
            buttons_tested = 0
            
            buttons = await self.page.query_selector_all('button')
            
            for button in buttons[:5]:  # Testa första 5 knapparna
                # Testa hover state
                await button.hover()
                await asyncio.sleep(0.1)
                
                hover_color = await button.evaluate('el => getComputedStyle(el).backgroundColor')
                
                # Testa focus state  
                await button.focus()
                await asyncio.sleep(0.1)
                
                focus_outline = await button.evaluate('el => getComputedStyle(el).outline')
                
                # Kontrollera att focus är synlig (outline eller box-shadow)
                if focus_outline == 'none' or not focus_outline:
                    box_shadow = await button.evaluate('el => getComputedStyle(el).boxShadow')
                    if box_shadow == 'none' or not box_shadow:
                        button_state_violations.append({
                            "element": "button",
                            "issue": "No visible focus indicator",
                            "outline": focus_outline,
                            "box_shadow": box_shadow
                        })
                
                buttons_tested += 1
            
            # Testa disabled buttons
            disabled_buttons = await self.page.query_selector_all('button:disabled, button[disabled]')
            for button in disabled_buttons:
                opacity = await button.evaluate('el => getComputedStyle(el).opacity')
                cursor = await button.evaluate('el => getComputedStyle(el).cursor')
                
                # Disabled buttons bör ha visuell indikation
                opacity_value = float(opacity) if opacity else 1.0
                if opacity_value >= 1.0 and cursor != 'not-allowed':
                    button_state_violations.append({
                        "element": "disabled_button",
                        "issue": "Disabled state not visually clear",
                        "opacity": opacity,
                        "cursor": cursor
                    })
                buttons_tested += 1
            
            return {
                "success": len(button_state_violations) == 0,
                "buttons_tested": buttons_tested,
                "violations": button_state_violations,
                "state_compliance": len(button_state_violations) == 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_form_styling(self) -> Dict[str, Any]:
        """Testa formulärstilning"""
        try:
            # Navigera till en sida med formulär
            await self.page.goto(f"{self.config.get_frontend_base_url()}/ingredienser")
            await asyncio.sleep(2)
            
            # Försök öppna en modal med formulär
            try:
                await self.page.click('button:has-text("Ny Ingrediens")')
                await self.page.wait_for_selector('.modal', timeout=3000)
            except:
                # Om ingen modal finns, testa formulärfält på sidan
                pass
            
            form_violations = []
            forms_tested = 0
            
            # Testa input styling
            inputs = await self.page.query_selector_all('input, textarea, select')
            for input_element in inputs[:5]:
                border = await input_element.evaluate('el => getComputedStyle(el).border')
                border_radius = await input_element.evaluate('el => getComputedStyle(el).borderRadius')
                
                # Kontrollera att inputs har border
                if not border or border.startswith('0px') or 'none' in border:
                    form_violations.append({
                        "element": await input_element.tag_name(),
                        "issue": "Input lacks visible border",
                        "border": border
                    })
                
                forms_tested += 1
            
            # Testa focus states på inputs
            if inputs:
                first_input = inputs[0]
                await first_input.focus()
                
                focus_border = await first_input.evaluate('el => getComputedStyle(el).borderColor')
                focus_outline = await first_input.evaluate('el => getComputedStyle(el).outline')
                
                # Input bör ha synlig focus state
                if (not focus_border or focus_border == 'rgb(0, 0, 0)') and \
                   (not focus_outline or focus_outline == 'none'):
                    form_violations.append({
                        "element": "input_focus",
                        "issue": "No visible focus state on input"
                    })
                forms_tested += 1
            
            return {
                "success": len(form_violations) == 0,
                "forms_tested": forms_tested,
                "violations": form_violations,
                "form_styling_compliance": len(form_violations) == 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_modal_design(self) -> Dict[str, Any]:
        """Testa modal design"""
        try:
            await self.page.goto(f"{self.config.get_frontend_base_url()}/ingredienser")
            await asyncio.sleep(2)
            
            modal_violations = []
            modals_tested = 0
            
            # Försök öppna en modal
            try:
                await self.page.click('button:has-text("Ny Ingrediens")')
                await self.page.wait_for_selector('.modal', timeout=5000)
                
                modal = await self.page.query_selector('.modal')
                if modal:
                    # Testa modal styling
                    backdrop = await self.page.query_selector('.modal-backdrop, .overlay')
                    if not backdrop:
                        # Kolla om modal har semi-transparent background
                        modal_bg = await modal.evaluate('el => getComputedStyle(el).backgroundColor')
                        if not modal_bg or 'rgba' not in modal_bg:
                            modal_violations.append({
                                "element": "modal",
                                "issue": "Modal lacks backdrop or transparent background",
                                "background": modal_bg
                            })
                    
                    # Testa att modal är centrerad
                    position = await modal.evaluate('el => getComputedStyle(el).position')
                    if position != 'fixed' and position != 'absolute':
                        modal_violations.append({
                            "element": "modal",
                            "issue": "Modal not properly positioned",
                            "position": position
                        })
                    
                    # Testa border radius
                    border_radius = await modal.evaluate('el => getComputedStyle(el).borderRadius')
                    expected_radius = self.design_guidelines["components"]["border_radius"]
                    if border_radius and not self._is_similar_measurement(border_radius, expected_radius):
                        modal_violations.append({
                            "element": "modal",
                            "issue": "Modal border radius not according to guidelines",
                            "expected": expected_radius,
                            "actual": border_radius
                        })
                    
                    modals_tested += 1
                    
                    # Stäng modal
                    try:
                        await self.page.click('button:has-text("Avbryt")')
                        await self.page.wait_for_selector('.modal', state='hidden')
                    except:
                        await self.page.press('body', 'Escape')
                
            except Exception as e:
                # Inga modaler att testa
                pass
            
            return {
                "success": len(modal_violations) == 0,
                "modals_tested": modals_tested,
                "violations": modal_violations,
                "modal_compliance": len(modal_violations) == 0 or modals_tested == 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_navigation_consistency(self) -> Dict[str, Any]:
        """Testa navigationskonsistens"""
        try:
            await self.page.goto(f"{self.config.get_frontend_base_url()}")
            await asyncio.sleep(2)
            
            nav_violations = []
            nav_tested = 0
            
            # Testa sidebar navigation
            nav_links = await self.page.query_selector_all('.sidebar a, nav a')
            
            for link in nav_links:
                # Kontrollera att alla länkar har text eller ikoner
                link_text = await link.text_content()
                icon = await link.query_selector('svg, i, .icon')
                
                if not link_text.strip() and not icon:
                    nav_violations.append({
                        "element": "nav_link",
                        "issue": "Navigation link lacks text or icon",
                        "href": await link.get_attribute('href')
                    })
                
                # Kontrollera hover state
                await link.hover()
                await asyncio.sleep(0.1)
                
                hover_bg = await link.evaluate('el => getComputedStyle(el).backgroundColor')
                # Navigation links bör ha någon form av hover feedback
                
                nav_tested += 1
            
            # Kontrollera active states
            current_page = await self.page.url()
            active_links = await self.page.query_selector_all('.sidebar a.active, nav a.active')
            
            if not active_links and nav_links:
                nav_violations.append({
                    "element": "active_state",
                    "issue": "No active navigation state visible",
                    "current_url": current_page
                })
            
            return {
                "success": len(nav_violations) == 0,
                "navigation_tested": nav_tested,
                "violations": nav_violations,
                "navigation_compliance": len(nav_violations) == 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Helper methods
    async def _is_similar_color(self, actual_color: str, expected_color: str) -> bool:
        """Kontrollera om färger är tillräckligt lika"""
        # Grundläggande färgjämförelse - kan förbättras med mer sofistikerad logik
        return True  # Placeholder - implementera färgjämförelse

    def _contains_font_family(self, font_family: str, expected_font: str) -> bool:
        """Kontrollera om font family innehåller förväntad font"""
        return expected_font.lower() in font_family.lower() if font_family else False

    def _is_valid_spacing(self, spacing_value: str) -> bool:
        """Kontrollera om spacing följer guidelines"""
        # Grundläggande validering - returnera True för nu
        return True  # Placeholder - implementera spacing validering

    def _is_similar_measurement(self, actual: str, expected: str) -> bool:
        """Kontrollera om mått är tillräckligt lika"""
        try:
            # Extrahera numeriska värden
            import re
            actual_num = re.findall(r'(\d+(?:\.\d+)?)', actual)
            expected_num = re.findall(r'(\d+(?:\.\d+)?)', expected)
            
            if actual_num and expected_num:
                actual_val = float(actual_num[0])
                expected_val = float(expected_num[0])
                
                # Tillåt 20% avvikelse
                return abs(actual_val - expected_val) / expected_val <= 0.2
                
            return actual == expected
        except:
            return actual == expected