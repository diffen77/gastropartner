#!/usr/bin/env python3
"""
GastroPartner Automated Test Suite
Huvudtestmotor för E2E testning av GastroPartner-applikationen.
"""

import asyncio
import json
import os
import sys
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
import traceback

from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
import structlog

# Importera testmoduler
from tests.core.test_engine import GastroPartnerTestSuite
from tests.core.config import TestConfig
from tests.core.reporter import TestReporter
from tests.core.utils import TestUtils
from tests.core.human_logger import create_human_logger


class TestRunner:
    """Huvudklass för testorkestration"""

    def __init__(self, config_path: str = "config/environments.json"):
        self.config_path = Path(config_path)
        self.config: Optional[TestConfig] = None
        self.suite: Optional[GastroPartnerTestSuite] = None
        self.reporter: Optional[TestReporter] = None
        
        # Setup logging
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.dev.ConsoleRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
        self.logger = structlog.get_logger()
        
        # Skapa human logger för användarvänlig output
        self.human_logger = create_human_logger()

    async def initialize(self, environment: str, **kwargs) -> bool:
        """Initialisera testmiljön"""
        try:
            # Ladda konfiguration
            self.config = TestConfig(self.config_path, environment)
            await self.config.load()
            
            # Skapa rapportör
            self.reporter = TestReporter(
                output_dir=Path("reports"),
                environment=environment,
                config=self.config
            )
            
            # Skapa testsvit
            self.suite = GastroPartnerTestSuite(
                config=self.config,
                reporter=self.reporter,
                logger=self.logger,
                **kwargs
            )
            
            self.logger.info(
                "Testmiljö initialiserad",
                environment=environment,
                frontend_url=self.config.get_environment()["frontend_url"]
            )
            
            return True
            
        except Exception as e:
            self.logger.error("Fel vid initialisering", error=str(e), traceback=traceback.format_exc())
            return False

    async def run_full_suite(self, environment: str = "local", browser: str = "chromium") -> bool:
        """Kör hela testsviten"""
        success = True
        
        try:
            # Starta testsuite med human logger
            self.human_logger.start_test_suite("Fullständig testsvit", environment, browser)
            
            # 1. Setup och authentication
            await self.suite.setup()
            login_success = await self.suite.authenticate()
            
            if not login_success:
                self.logger.error("Autentisering misslyckades")
                return False
            
            # 2. Kör tester i sekvens
            test_results = {}
            
            # Ingredients tests
            self.logger.info("Kör ingredienstester")
            test_results["ingredients"] = await self.suite.test_ingredients_module()
            
            # Recipes tests
            self.logger.info("Kör recepttester")
            test_results["recipes"] = await self.suite.test_recipes_module()
            
            # Menu items tests
            self.logger.info("Kör maträttstester") 
            test_results["menu_items"] = await self.suite.test_menu_items_module()
            
            # Data validation tests
            self.logger.info("Kör datavalideringstester")
            test_results["data_validation"] = await self.suite.test_data_validation()
            
            # Visual tests
            if self.config.get_setting("visual_tests_enabled", True):
                self.logger.info("Kör visuella tester")
                test_results["visual"] = await self.suite.test_visual_compliance()
            
            # Performance tests
            if self.config.get_setting("performance_tests_enabled", True):
                self.logger.info("Kör prestandatester")
                test_results["performance"] = await self.suite.test_performance()
            
            # Analysera resultat
            success = all(result.get("success", False) for result in test_results.values())
            
            # Generera rapport
            await self.reporter.generate_final_report(test_results)
            
            # Beräkna total duration
            total_duration = None
            if hasattr(self.suite, 'start_time') and self.suite.start_time:
                total_duration = (datetime.now(timezone.utc) - self.suite.start_time).total_seconds()
            
            # Använd human logger för slutresultat
            self.human_logger.finish_test_suite(success, total_duration)
            
        except Exception as e:
            self.logger.error("Fel under testexekvering", error=str(e), traceback=traceback.format_exc())
            success = False
        
        finally:
            # Cleanup
            try:
                await self.suite.teardown()
                if self.config.get_environment().get("test_data_cleanup", False):
                    # Create TestUtils instance for cleanup (need page from suite)
                    if hasattr(self.suite, 'page') and self.suite.page:
                        test_utils = TestUtils(self.suite.page, self.logger)
                        await test_utils.cleanup_test_data(self.config.environment)
            except Exception as e:
                self.logger.warning("Fel under cleanup", error=str(e))
        
        return success

    async def run_smoke_tests(self) -> bool:
        """Kör endast kritiska smoke tests"""
        try:
            self.logger.info("Startar smoke tests")
            
            await self.suite.setup()
            
            # Endast kritiska tester
            smoke_results = {
                "login": await self.suite.test_authentication(),
                "navigation": await self.suite.test_basic_navigation(),
                "api_health": await self.suite.test_api_health(),
                "data_integrity": await self.suite.test_basic_data_operations()
            }
            
            success = all(result.get("success", False) for result in smoke_results.values())
            
            await self.reporter.generate_smoke_report(smoke_results)
            
            self.logger.info("Smoke tests slutförda", success=success)
            
            return success
            
        except Exception as e:
            self.logger.error("Fel under smoke tests", error=str(e))
            return False
        finally:
            await self.suite.teardown()

    async def run_single_test(self, test_name: str) -> bool:
        """Kör en specifik test"""
        try:
            self.logger.info(f"Kör specifik test: {test_name}")
            
            await self.suite.setup()
            await self.suite.authenticate()
            
            # Dynamiskt anropa test baserat på namn
            test_method = getattr(self.suite, f"test_{test_name}", None)
            if not test_method:
                self.logger.error(f"Test '{test_name}' existerar inte")
                return False
                
            result = await test_method()
            success = result.get("success", False)
            
            await self.reporter.generate_single_test_report(test_name, result)
            
            self.logger.info(f"Test '{test_name}' slutförd", success=success)
            
            return success
            
        except Exception as e:
            self.logger.error(f"Fel under test '{test_name}'", error=str(e))
            return False
        finally:
            await self.suite.teardown()


def main():
    """Huvudfunktion för CLI"""
    parser = argparse.ArgumentParser(description="GastroPartner Automated Test Suite")
    
    parser.add_argument(
        "--env", 
        default="local",
        choices=["local", "staging", "production"],
        help="Testmiljö att köra mot"
    )
    
    parser.add_argument(
        "--suite",
        default="full",
        choices=["full", "smoke", "ingredients", "recipes", "menu_items", "validation", "visual", "performance"],
        help="Vilken testsvit att köra"
    )
    
    parser.add_argument(
        "--browser",
        default="chromium", 
        choices=["chromium", "firefox", "webkit"],
        help="Vilken browser att använda"
    )
    
    parser.add_argument(
        "--headless",
        action="store_true",
        default=True,
        help="Kör browser i headless mode"
    )
    
    parser.add_argument(
        "--parallel",
        type=int,
        default=1,
        help="Antal parallella tester (1-10)"
    )
    
    parser.add_argument(
        "--output-dir",
        default="reports",
        help="Katalog för testrapporter"
    )
    
    parser.add_argument(
        "--video",
        action="store_true",
        help="Spela in video av tester"
    )
    
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Debug mode"
    )
    
    parser.add_argument(
        "--config",
        default="config/environments.json",
        help="Sökväg till konfigurationsfil"
    )

    args = parser.parse_args()
    
    # Sätt logging level
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(level=log_level)
    
    # Skapa testrunner
    runner = TestRunner(config_path=args.config)
    
    async def run_tests():
        # Initialisera
        init_success = await runner.initialize(
            environment=args.env,
            browser=args.browser,
            headless=args.headless,
            video_recording=args.video,
            parallel_workers=args.parallel,
            output_dir=Path(args.output_dir)
        )
        
        if not init_success:
            print("❌ Fel vid initialisering av testmiljö")
            return False
        
        # Kör tester baserat på vald svit
        if args.suite == "full":
            success = await runner.run_full_suite(args.env, args.browser)
        elif args.suite == "smoke":
            success = await runner.run_smoke_tests()
        else:
            success = await runner.run_single_test(args.suite)
        
        return success
    
    # Kör testsviten
    try:
        success = asyncio.run(run_tests())
        
        if success:
            print("✅ Alla tester slutförda framgångsrikt")
            sys.exit(0)
        else:
            print("❌ En eller flera tester misslyckades")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Testexekvering avbruten av användare")
        sys.exit(130)
    except Exception as e:
        print(f"💥 Oväntat fel: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()