"""
Testrapportering för GastroPartner Test Suite
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional
import structlog
from jinja2 import Template

from .config import TestConfig


class TestReporter:
    """Hantera testrapportering och resultat"""

    def __init__(self, output_dir: Path, environment: str, config: TestConfig):
        self.output_dir = output_dir
        self.environment = environment
        self.config = config
        self.logger = structlog.get_logger()
        
        # Skapa output directory
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
        # Test session info
        self.session_id = f"test_session_{int(time.time())}"
        self.start_time = datetime.now(timezone.utc)
        self.test_results: Dict[str, Any] = {}
        
        self.logger.info(
            "Testrapportör initierad",
            session_id=self.session_id,
            environment=environment,
            output_dir=str(output_dir)
        )

    async def add_test_results(self, test_module: str, results: Dict[str, Any]) -> None:
        """Lägg till testresultat för en modul"""
        self.test_results[test_module] = {
            **results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "module": test_module
        }
        
        self.logger.info(
            "Testresultat tillagda",
            module=test_module,
            success=results.get("success", False),
            total_tests=results.get("total_tests", 0),
            passed_tests=results.get("passed_tests", 0),
            failed_tests=results.get("failed_tests", 0)
        )

    async def generate_final_report(self, all_results: Dict[str, Any]) -> str:
        """Generera slutlig testrapport"""
        try:
            # Sammanfatta resultat
            summary = self._calculate_summary(all_results)
            
            # Skapa rapport data
            report_data = {
                "session_id": self.session_id,
                "environment": self.environment,
                "start_time": self.start_time.isoformat(),
                "end_time": datetime.now(timezone.utc).isoformat(),
                "duration_seconds": (datetime.now(timezone.utc) - self.start_time).total_seconds(),
                "summary": summary,
                "results": all_results,
                "config": {
                    "environment": self.config.get_environment(),
                    "browser_settings": self.config.get_browser_settings(),
                    "timeouts": self.config.get_timeouts()
                }
            }
            
            # Spara JSON rapport
            json_report_path = self.output_dir / f"test_report_{self.session_id}.json"
            with open(json_report_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            # Generera HTML rapport
            html_report_path = await self._generate_html_report(report_data)
            
            self.logger.info(
                "Testrapport genererad",
                json_report=str(json_report_path),
                html_report=str(html_report_path),
                total_tests=summary["total_tests"],
                success_rate=summary["success_rate"]
            )
            
            return str(html_report_path)
            
        except Exception as e:
            self.logger.error("Fel vid rapportgenerering", error=str(e))
            return ""

    def _calculate_summary(self, all_results: Dict[str, Any]) -> Dict[str, Any]:
        """Beräkna sammanfattning av alla testresultat"""
        total_tests = sum(result.get("total_tests", 0) for result in all_results.values())
        passed_tests = sum(result.get("passed_tests", 0) for result in all_results.values())
        failed_tests = sum(result.get("failed_tests", 0) for result in all_results.values())
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        overall_success = all(result.get("success", False) for result in all_results.values())
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": round(success_rate, 2),
            "overall_success": overall_success,
            "modules_tested": len(all_results),
            "modules_passed": sum(1 for result in all_results.values() if result.get("success", False))
        }


    async def _generate_html_report(self, report_data: Dict[str, Any]) -> str:
        """Generera HTML rapport"""
        try:
            html_template = """
            <!DOCTYPE html>
            <html lang="sv">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>GastroPartner Test Report - {{ report_data.session_id }}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        margin: 0; padding: 20px;
                        background: #f8f9fa; color: #202124;
                    }
                    .header { 
                        background: white; padding: 30px; border-radius: 8px;
                        margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .header h1 { margin: 0; color: #4285f4; }
                    .header .meta { margin-top: 10px; color: #5f6368; }
                    .summary { 
                        display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px; margin-bottom: 20px;
                    }
                    .summary-card { 
                        background: white; padding: 20px; border-radius: 8px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .summary-card h3 { margin: 0 0 10px 0; color: #5f6368; font-size: 14px; }
                    .summary-card .value { font-size: 32px; font-weight: 600; margin-bottom: 5px; }
                    .success { color: #34a853; }
                    .failed { color: #ea4335; }
                    .warning { color: #fbbc04; }
                    .results { 
                        background: white; padding: 30px; border-radius: 8px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .module { 
                        border: 1px solid #e8eaed; border-radius: 8px;
                        margin-bottom: 20px; overflow: hidden;
                    }
                    .module-header { 
                        background: #f1f3f4; padding: 15px; 
                        border-bottom: 1px solid #e8eaed;
                    }
                    .module-header h3 { margin: 0; display: flex; align-items: center; }
                    .module-content { padding: 15px; }
                    .status-badge { 
                        display: inline-block; padding: 4px 8px;
                        border-radius: 4px; font-size: 12px; font-weight: 500;
                        margin-left: 10px;
                    }
                    .status-success { background: #e8f5e8; color: #137333; }
                    .status-failed { background: #fce8e6; color: #d93025; }
                    .test-detail { 
                        background: #f8f9fa; padding: 15px; 
                        border-radius: 4px; margin: 10px 0;
                        border-left: 4px solid #e8eaed;
                    }
                    .test-case {
                        background: #ffffff; padding: 12px; 
                        border-radius: 4px; margin: 8px 0;
                        border: 1px solid #e8eaed;
                    }
                    .test-case.passed {
                        border-left: 4px solid #34a853;
                        background: #f8fff8;
                    }
                    .test-case.failed {
                        border-left: 4px solid #ea4335;
                        background: #fffaf8;
                    }
                    .test-case-title {
                        font-weight: 600;
                        margin-bottom: 6px;
                        color: #202124;
                    }
                    .test-case-description {
                        color: #5f6368;
                        font-size: 14px;
                        margin-bottom: 8px;
                    }
                    .test-case-result {
                        font-size: 13px;
                        font-family: 'Monaco', 'Menlo', monospace;
                        background: #f1f3f4;
                        padding: 8px;
                        border-radius: 3px;
                        margin-top: 8px;
                    }
                    .test-case-status {
                        display: inline-block;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    .test-case-status.passed {
                        background: #e8f5e8;
                        color: #137333;
                    }
                    .test-case-status.failed {
                        background: #fce8e6;
                        color: #d93025;
                    }
                    .footer { 
                        margin-top: 40px; padding: 20px; 
                        background: white; border-radius: 8px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        text-align: center; color: #5f6368;
                    }
                </style>
                <script src="/static/archon-integration.js"></script>
            </head>
            <body>
                <div class="header">
                    <h1>🧪 GastroPartner Test Report</h1>
                    <div class="meta">
                        Session: {{ report_data.session_id }} |
                        Miljö: {{ report_data.environment }} |
                        Tid: {{ report_data.start_time[:19] }} - {{ report_data.end_time[:19] }} |
                        Varaktighet: {{ "%.1f"|format(report_data.duration_seconds) }}s
                    </div>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <h3>TOTALT ANTAL TESTER</h3>
                        <div class="value">{{ report_data.summary.total_tests }}</div>
                        <div>{{ report_data.summary.modules_tested }} moduler testade</div>
                    </div>
                    <div class="summary-card">
                        <h3>GODKÄNDA TESTER</h3>
                        <div class="value success">{{ report_data.summary.passed_tests }}</div>
                        <div>{{ report_data.summary.success_rate }}% framgångsrik</div>
                    </div>
                    <div class="summary-card">
                        <h3>MISSLYCKADE TESTER</h3>
                        <div class="value failed">{{ report_data.summary.failed_tests }}</div>
                        <div>{{ report_data.summary.modules_tested - report_data.summary.modules_passed }} moduler med fel</div>
                    </div>
                    <div class="summary-card">
                        <h3>ÖVERGRIPANDE STATUS</h3>
                        <div class="value {% if report_data.summary.overall_success %}success{% else %}failed{% endif %}">
                            {% if report_data.summary.overall_success %}✅ GODKÄND{% else %}❌ MISSLYCKAD{% endif %}
                        </div>
                    </div>
                </div>

                <div class="results">
                    <h2>Testresultat per modul</h2>
                    
                    {% for module_name, module_result in report_data.results.items() %}
                    <div class="module">
                        <div class="module-header">
                            <h3>
                                {{ module_name|title }}
                                <span class="status-badge {% if module_result.success %}status-success{% else %}status-failed{% endif %}">
                                    {% if module_result.success %}✅ GODKÄND{% else %}❌ MISSLYCKAD{% endif %}
                                </span>
                            </h3>
                        </div>
                        <div class="module-content">
                            <div><strong>Testsammanfattning:</strong> {{ module_result.get('total_tests', 0) }} totalt, {{ module_result.get('passed_tests', 0) }} godkända, {{ module_result.get('failed_tests', 0) }} misslyckade</div>
                            
                            {% if module_result.get('error') and not module_result.get('details') %}
                            <div class="test-detail">
                                <strong>Modulfel:</strong> {{ module_result.error }}
                                <div class="test-case-description">
                                    Hela modulen misslyckades på grund av ett oväntat fel. Detta kan bero på:
                                    • Timeout vid navigering till sidan
                                    • Problem med autentisering
                                    • Applikationsfel som förhindrar testutförande
                                </div>
                            </div>
                            {% endif %}
                            
                            {% if module_result.get('details') %}
                            <div class="test-detail">
                                <strong>Detaljerade testresultat:</strong>
                                
                                {% for test_case in module_result.details %}
                                <div class="test-case {% if test_case.success %}passed{% else %}failed{% endif %}">
                                    <div class="test-case-title">
                                        {{ test_case.test_name|replace('test_', '')|replace('_', ' ')|title }}
                                        <span class="test-case-status {% if test_case.success %}passed{% else %}failed{% endif %}">
                                            {% if test_case.success %}Godkänd{% else %}Misslyckad{% endif %}
                                        </span>
                                    </div>
                                    
                                    <div class="test-case-description">
                                        Vad testas: {{ test_descriptions.get(test_case.test_name, 'Allmänt test för ' + test_case.test_name.replace('test_', '').replace('_', ' ')) }}
                                    </div>
                                    
                                    <div class="test-case-result">
                                        {% if test_case.success %}
                                        ✅ Test godkänd
                                        {% if test_case.details %}
                                        {% for key, value in test_case.details.items() %}
                                        {% if key not in ['success', 'timestamp'] %}
                                        • {{ key|replace('_', ' ')|title }}: {{ value }}
                                        {% endif %}
                                        {% endfor %}
                                        {% endif %}
                                        {% else %}
                                        ❌ Test misslyckad
                                        {% if test_case.error %}
                                        Fel: {{ test_case.error }}
                                        {% endif %}
                                        {% if test_case.details and test_case.details.error %}
                                        Detaljer: {{ test_case.details.error }}
                                        {% endif %}
                                        {% endif %}
                                    </div>
                                </div>
                                {% endfor %}
                            </div>
                            {% endif %}
                        </div>
                    </div>
                    {% endfor %}
                </div>

                <div class="footer">
                    <p>Genererad av GastroPartner Automated Test Suite</p>
                    <p>{{ report_data.end_time[:19] }}</p>
                </div>
                
                <script>
                    // Grundläggande interaktivitet för rapporten
                    document.addEventListener('DOMContentLoaded', function() {
                        // Lägg till eventuell framtida JavaScript-funktionalitet här
                        console.log('GastroPartner Test Report laddad');
                    });
                </script>
            </body>
            </html>
            """
            
            # Skapa test beskrivningar dictionary
            test_descriptions = {
                # Ingredienser
                "test_add_single_ingredient": "Lägga till en enskild ingrediens • Klicka på 'Ny Ingrediens' • Fylla i formulär • Spara och verifiera",
                "test_add_batch_ingredients": "Lägga till flera ingredienser • Testa batch-operationer • Kontrollera prestanda • Verifiera stabilitet",
                "test_ingredient_form_validation": "Formulärvalidering • Testa tomma fält • Ogiltiga värden • Validera korrekt data",
                "test_edit_ingredient": "Redigera ingrediens • Öppna redigeringsformulär • Ändra data • Spara ändringar",
                "test_delete_ingredient": "Ta bort ingrediens • Klicka ta bort • Hantera bekräftelse • Verifiera borttagning",
                "test_category_filtering": "Kategorifilotrering • Välja kategorier • Kontrollera filtrering • Testa återställning",
                "test_search_functionality": "Sökfunktion • Söka ingredienser • Kontrollera resultat • Rensa sökning",
                "test_freemium_limits": "Freemium-gränser • Kontrollera användning • Verifiera räknare • Testa gränser (50 st)",
                "test_cost_calculations": "Kostnadsberäkningar • Genomsnittskostnad • Totaler • Statistikuppdatering",
                
                # Recept
                "test_add_single_recipe": "Skapa recept • Öppna receptformulär • Lägga till ingredienser • Portioner • Spara",
                "test_recipe_cost_calculations": "Receptkostnader • Summera ingredienser • Kostnad per portion • Uppdatera beräkningar",
                
                # Maträtter  
                "test_add_single_menu_item": "Skapa maträtt • Öppna formulär • Koppla recept • Sätta priser • Spara",
                "test_menu_item_pricing": "Prissättning • Beräkna marginaler • Försäljningspris • Prisuppdateringar",
                
                # Design/Visual
                "test_color_consistency": "Färgkonsistens • Design tokens • Kontrast • Tillgänglighet • Färgvariationer",
                "test_typography_compliance": "Typografi • Rätt typsnitt (Inter) • Textstorlekar • Hierarki • Läsbarhet",
                "test_spacing_consistency": "Mellanrum • Marginaler • Padding • Rutnätssystem • Responsiv anpassning",
                "test_component_styling": "Komponentstil • Designsystem • Tillstånd (hover/active) • Stilkonsistens",
                "test_responsive_design": "Responsiv design • Olika skärmstorlekar • Mobilanpassning • Breakpoints",
                "test_accessibility_compliance": "Tillgänglighet • ARIA-attribut • Tangentbord • Skärmläsare",
                
                # Data validation
                "test_ingredient_cost_calculations": "Ingredienskostnader • Beräkningslogik • Valideringsregler",
                "test_recipe_cost_calculations": "Receptkostnader • Ingredienssammanställning • Portionsberäkning",
                "test_menu_item_pricing": "Maträttspriser • Marginaler • Kostnadskalkylering",
                "test_margin_calculations": "Marginalberäkningar • Procentuella kalkyler • Olika prismodeller",
                "test_percentage_calculations": "Procentberäkningar • Matematisk korrekthet • Avrundning",
                "test_total_calculations": "Totalberäkningar • Summering • Aggregerade värden",
                "test_currency_formatting": "Valutaformatering • Kronor • Decimaler • Konsekvens",
                "test_edge_cases": "Kantfall • Stora tal • Decimalprecision • Division med noll"
            }
            
            template = Template(html_template)
            html_content = template.render(
                report_data=report_data,
                test_descriptions=test_descriptions
            )
            
            html_report_path = self.output_dir / f"test_report_{self.session_id}.html"
            with open(html_report_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            return str(html_report_path)
            
        except Exception as e:
            self.logger.error("Fel vid HTML-rapportgenerering", error=str(e))
            return ""

    async def generate_smoke_report(self, smoke_results: Dict[str, Any]) -> str:
        """Generera rapport för smoke tests"""
        summary = self._calculate_summary(smoke_results)
        
        report_data = {
            "session_id": f"smoke_{self.session_id}",
            "test_type": "Smoke Tests",
            "environment": self.environment,
            "start_time": self.start_time.isoformat(),
            "end_time": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "results": smoke_results
        }
        
        json_path = self.output_dir / f"smoke_report_{self.session_id}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        return str(json_path)

    async def generate_single_test_report(self, test_name: str, result: Dict[str, Any]) -> str:
        """Generera rapport för enskild test"""
        report_data = {
            "session_id": f"{test_name}_{self.session_id}",
            "test_name": test_name,
            "environment": self.environment,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "result": result
        }
        
        json_path = self.output_dir / f"{test_name}_report_{self.session_id}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        return str(json_path)