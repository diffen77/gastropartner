#!/usr/bin/env python3
"""
Kontinuerlig övervakning av kritiska funktioner
"""

import asyncio
import time
import json
import schedule
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any
import structlog

# Import test suite components
import sys
sys.path.append(str(Path(__file__).parent.parent))

from tests.core.config import TestConfig
from tests.core.test_engine import GastroPartnerTestSuite
from tests.core.reporter import TestReporter


class ContinuousMonitor:
    """Kontinuerlig övervakning av applikationen"""
    
    def __init__(self, environment: str = "local"):
        self.environment = environment
        self.config_path = Path("config/environments.json")
        self.monitoring_results: Dict[str, Any] = {}
        self.logger = structlog.get_logger()
        
        # Monitoring configuration
        self.smoke_test_interval = 15  # minuter
        self.full_test_interval = 60   # minuter
        self.alert_thresholds = {
            "failure_rate": 0.1,  # 10% failure rate triggers alert
            "response_time": 5000  # 5 seconds response time triggers alert
        }

    async def start_monitoring(self) -> None:
        """Starta kontinuerlig övervakning"""
        self.logger.info("Startar kontinuerlig övervakning", environment=self.environment)
        
        # Schedule smoke tests every 15 minutes
        schedule.every(self.smoke_test_interval).minutes.do(
            lambda: asyncio.create_task(self.run_smoke_tests())
        )
        
        # Schedule full tests every hour
        schedule.every(self.full_test_interval).minutes.do(
            lambda: asyncio.create_task(self.run_full_test_suite())
        )
        
        # Schedule health check every 5 minutes
        schedule.every(5).minutes.do(
            lambda: asyncio.create_task(self.run_health_check())
        )
        
        # Run initial tests
        await self.run_smoke_tests()
        
        # Start monitoring loop
        while True:
            schedule.run_pending()
            await asyncio.sleep(60)  # Check every minute

    async def run_smoke_tests(self) -> Dict[str, Any]:
        """Kör smoke tests för snabb health check"""
        try:
            self.logger.info("Kör smoke tests")
            
            # Setup test environment
            config = TestConfig(self.config_path, self.environment)
            await config.load()
            
            output_dir = Path("monitoring_reports")
            reporter = TestReporter(output_dir, self.environment, config)
            
            test_suite = GastroPartnerTestSuite(
                config=config,
                reporter=reporter,
                logger=self.logger,
                browser="chromium",
                headless=True
            )
            
            await test_suite.setup()
            
            # Run smoke tests
            smoke_results = {}
            
            # Test authentication
            smoke_results["authentication"] = await test_suite.test_authentication()
            
            # Test basic navigation
            smoke_results["navigation"] = await test_suite.test_basic_navigation()
            
            # Test API health
            smoke_results["api_health"] = await test_suite.test_api_health()
            
            # Test basic data operations
            smoke_results["data_operations"] = await test_suite.test_basic_data_operations()
            
            await test_suite.teardown()
            
            # Analyze results
            analysis = self._analyze_smoke_results(smoke_results)
            
            # Store results
            self.monitoring_results[f"smoke_{int(time.time())}"] = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "smoke",
                "results": smoke_results,
                "analysis": analysis
            }
            
            # Check for alerts
            await self._check_alerts(analysis, "smoke")
            
            # Generate report
            await reporter.generate_smoke_report(smoke_results)
            
            self.logger.info(
                "Smoke tests slutförda",
                success_rate=analysis["success_rate"],
                failed_tests=analysis["failed_tests"]
            )
            
            return smoke_results
            
        except Exception as e:
            self.logger.error("Fel vid smoke tests", error=str(e))
            return {"success": False, "error": str(e)}

    async def run_full_test_suite(self) -> Dict[str, Any]:
        """Kör fullständig testsvit"""
        try:
            self.logger.info("Kör fullständig testsvit")
            
            # Setup
            config = TestConfig(self.config_path, self.environment)
            await config.load()
            
            output_dir = Path("monitoring_reports")
            reporter = TestReporter(output_dir, self.environment, config)
            
            test_suite = GastroPartnerTestSuite(
                config=config,
                reporter=reporter,
                logger=self.logger,
                browser="chromium",
                headless=True
            )
            
            await test_suite.setup()
            
            # Authenticate first
            auth_success = await test_suite.authenticate()
            if not auth_success:
                await test_suite.teardown()
                return {"success": False, "error": "Authentication failed"}
            
            # Run full test modules
            full_results = {}
            
            full_results["ingredients"] = await test_suite.test_ingredients_module()
            full_results["recipes"] = await test_suite.test_recipes_module()
            full_results["menu_items"] = await test_suite.test_menu_items_module()
            full_results["data_validation"] = await test_suite.test_data_validation()
            full_results["visual"] = await test_suite.test_visual_compliance()
            full_results["performance"] = await test_suite.test_performance()
            
            await test_suite.teardown()
            
            # Analyze results
            analysis = self._analyze_full_results(full_results)
            
            # Store results
            self.monitoring_results[f"full_{int(time.time())}"] = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "full",
                "results": full_results,
                "analysis": analysis
            }
            
            # Check for alerts
            await self._check_alerts(analysis, "full")
            
            # Generate comprehensive report
            report_path = await reporter.generate_final_report(full_results)
            
            self.logger.info(
                "Fullständig testsvit slutförd",
                success_rate=analysis["success_rate"],
                failed_tests=analysis["failed_tests"],
                report=report_path
            )
            
            return full_results
            
        except Exception as e:
            self.logger.error("Fel vid fullständig testsvit", error=str(e))
            return {"success": False, "error": str(e)}

    async def run_health_check(self) -> Dict[str, Any]:
        """Enkel health check utan webbläsare"""
        try:
            import aiohttp
            
            # Test frontend health
            frontend_url = self._get_frontend_url()
            frontend_healthy = await self._check_url_health(frontend_url)
            
            # Test backend health
            backend_url = self._get_backend_url()
            api_healthy = await self._check_url_health(f"{backend_url}/health")
            
            health_results = {
                "frontend": {
                    "url": frontend_url,
                    "healthy": frontend_healthy["healthy"],
                    "response_time": frontend_healthy["response_time"]
                },
                "backend": {
                    "url": f"{backend_url}/health",
                    "healthy": api_healthy["healthy"],
                    "response_time": api_healthy["response_time"]
                },
                "overall_healthy": frontend_healthy["healthy"] and api_healthy["healthy"]
            }
            
            # Store health check
            self.monitoring_results[f"health_{int(time.time())}"] = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "health",
                "results": health_results
            }
            
            # Log health status
            if health_results["overall_healthy"]:
                self.logger.info("Health check OK", **health_results)
            else:
                self.logger.warning("Health check FAILED", **health_results)
            
            return health_results
            
        except Exception as e:
            self.logger.error("Fel vid health check", error=str(e))
            return {"success": False, "error": str(e)}

    async def _check_url_health(self, url: str) -> Dict[str, Any]:
        """Kontrollera URL health"""
        try:
            import aiohttp
            start_time = time.time()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000  # ms
                    
                    return {
                        "healthy": response.status == 200,
                        "status_code": response.status,
                        "response_time": round(response_time, 2)
                    }
                    
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "response_time": 0
            }

    def _analyze_smoke_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Analysera smoke test resultat"""
        total_tests = len(results)
        failed_tests = sum(1 for result in results.values() if not result.get("success", False))
        success_rate = ((total_tests - failed_tests) / total_tests) * 100 if total_tests > 0 else 0
        
        return {
            "total_tests": total_tests,
            "failed_tests": failed_tests,
            "success_rate": round(success_rate, 2),
            "critical_issues": failed_tests > 0
        }

    def _analyze_full_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Analysera fullständiga test resultat"""
        total_tests = sum(result.get("total_tests", 0) for result in results.values())
        failed_tests = sum(result.get("failed_tests", 0) for result in results.values())
        success_rate = ((total_tests - failed_tests) / total_tests) * 100 if total_tests > 0 else 0
        
        # Identifiera kritiska problem
        critical_modules = [
            module for module, result in results.items()
            if not result.get("success", False)
        ]
        
        return {
            "total_tests": total_tests,
            "failed_tests": failed_tests,
            "success_rate": round(success_rate, 2),
            "critical_modules": critical_modules,
            "critical_issues": len(critical_modules) > 0
        }

    async def _check_alerts(self, analysis: Dict[str, Any], test_type: str) -> None:
        """Kontrollera om alerter ska skickas"""
        try:
            should_alert = False
            alert_reasons = []
            
            # Kontrollera failure rate
            if analysis["success_rate"] < (100 - self.alert_thresholds["failure_rate"] * 100):
                should_alert = True
                alert_reasons.append(f"High failure rate: {100 - analysis['success_rate']:.1f}%")
            
            # Kontrollera kritiska problem
            if analysis.get("critical_issues", False):
                should_alert = True
                alert_reasons.append(f"Critical issues detected in {test_type} tests")
            
            if should_alert:
                await self._send_alert(test_type, analysis, alert_reasons)
                
        except Exception as e:
            self.logger.error("Fel vid alert kontroll", error=str(e))

    async def _send_alert(self, test_type: str, analysis: Dict[str, Any], reasons: list) -> None:
        """Skicka alert (implementera enligt behov)"""
        alert_message = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": self.environment,
            "test_type": test_type,
            "severity": "HIGH" if analysis.get("critical_issues") else "MEDIUM",
            "success_rate": analysis["success_rate"],
            "failed_tests": analysis["failed_tests"],
            "reasons": reasons
        }
        
        # Logga alert
        self.logger.error("🚨 TEST ALERT", **alert_message)
        
        # Spara alert till fil
        alert_file = Path("monitoring_reports") / "alerts.jsonl"
        alert_file.parent.mkdir(exist_ok=True, parents=True)
        
        with open(alert_file, "a") as f:
            f.write(json.dumps(alert_message) + "\n")
        
        # Här kan du implementera andra alert mekanismer:
        # - Email notifications
        # - Slack webhooks
        # - SMS alerts
        # - Webhook calls

    def _get_frontend_url(self) -> str:
        """Hämta frontend URL baserat på miljö"""
        if self.environment == "production":
            return "https://gastropartner.se"
        elif self.environment == "staging":
            return "https://staging.gastropartner.se"
        else:
            return "http://localhost:3000"

    def _get_backend_url(self) -> str:
        """Hämta backend URL baserat på miljö"""
        if self.environment == "production":
            return "https://api.gastropartner.se"
        elif self.environment == "staging":
            return "https://api-staging.gastropartner.se"
        else:
            return "http://localhost:8000"

    def get_monitoring_summary(self) -> Dict[str, Any]:
        """Hämta sammanfattning av övervakningsresultat"""
        recent_results = list(self.monitoring_results.values())[-10:]  # Senaste 10 resultaten
        
        return {
            "total_monitoring_sessions": len(self.monitoring_results),
            "recent_results": len(recent_results),
            "environment": self.environment,
            "last_check": recent_results[-1]["timestamp"] if recent_results else None
        }


async def main():
    """Huvudfunktion för kontinuerlig övervakning"""
    import argparse
    
    parser = argparse.ArgumentParser(description="GastroPartner Continuous Monitor")
    parser.add_argument("--environment", "-e", default="local", 
                       choices=["local", "staging", "production"],
                       help="Test environment")
    parser.add_argument("--smoke-interval", type=int, default=15,
                       help="Smoke test interval in minutes")
    parser.add_argument("--full-interval", type=int, default=60,
                       help="Full test interval in minutes")
    
    args = parser.parse_args()
    
    # Setup logging
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Start continuous monitoring
    monitor = ContinuousMonitor(args.environment)
    monitor.smoke_test_interval = args.smoke_interval
    monitor.full_test_interval = args.full_interval
    
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\\n🛑 Övervakning stoppad av användare")
        summary = monitor.get_monitoring_summary()
        print(f"📊 Övervakningssammanfattning: {json.dumps(summary, indent=2)}")


if __name__ == "__main__":
    asyncio.run(main())