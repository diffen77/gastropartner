#!/usr/bin/env python3
"""
CI/CD integration script för GastroPartner Test Suite
"""

import asyncio
import sys
import json
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List
import structlog

# Import test suite components
sys.path.append(str(Path(__file__).parent.parent))

from tests.core.config import TestConfig
from tests.core.test_engine import GastroPartnerTestSuite
from tests.core.reporter import TestReporter


class CIIntegration:
    """CI/CD integration för automated testing"""
    
    def __init__(self, environment: str = "staging"):
        self.environment = environment
        self.config_path = Path("config/environments.json")
        self.logger = structlog.get_logger()
        
        # CI/CD specific settings
        self.exit_codes = {
            "success": 0,
            "test_failure": 1,
            "setup_failure": 2,
            "configuration_error": 3
        }

    async def run_ci_pipeline(self, test_types: List[str] = None) -> Dict[str, Any]:
        """Kör CI pipeline med specificerade tester"""
        try:
            self.logger.info("🚀 Startar CI/CD pipeline", environment=self.environment)
            
            # Default test types if none specified
            if not test_types:
                test_types = ["smoke", "integration", "e2e"]
            
            # Setup test environment
            config = TestConfig(self.config_path, self.environment)
            await config.load()
            
            # Create reports directory with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_dir = Path("ci_reports") / f"{self.environment}_{timestamp}"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            reporter = TestReporter(output_dir, self.environment, config)
            
            # Initialize test suite
            test_suite = GastroPartnerTestSuite(
                config=config,
                reporter=reporter,
                logger=self.logger,
                browser="chromium",
                headless=True,
                video_recording=False
            )
            
            await test_suite.setup()
            
            # Authenticate
            auth_success = await test_suite.authenticate()
            if not auth_success:
                await test_suite.teardown()
                return self._create_failure_result("Authentication failed", "setup_failure")
            
            # Run tests based on type
            pipeline_results = {}
            
            if "smoke" in test_types:
                pipeline_results.update(await self._run_smoke_tests(test_suite))
            
            if "integration" in test_types:
                pipeline_results.update(await self._run_integration_tests(test_suite))
            
            if "e2e" in test_types:
                pipeline_results.update(await self._run_e2e_tests(test_suite))
            
            if "performance" in test_types:
                pipeline_results.update(await self._run_performance_tests(test_suite))
            
            if "visual" in test_types:
                pipeline_results.update(await self._run_visual_tests(test_suite))
            
            await test_suite.teardown()
            
            # Generate comprehensive report
            report_path = await reporter.generate_final_report(pipeline_results)
            
            # Analyze overall results
            overall_analysis = self._analyze_pipeline_results(pipeline_results)
            
            # Determine exit code
            exit_code = self._determine_exit_code(overall_analysis)
            
            result = {
                "success": overall_analysis["overall_success"],
                "exit_code": exit_code,
                "environment": self.environment,
                "test_types": test_types,
                "analysis": overall_analysis,
                "results": pipeline_results,
                "report_path": report_path,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Output for CI system
            await self._output_ci_results(result, output_dir)
            
            return result
            
        except Exception as e:
            self.logger.error("💥 CI Pipeline failure", error=str(e))
            return self._create_failure_result(str(e), "setup_failure")

    async def _run_smoke_tests(self, test_suite: GastroPartnerTestSuite) -> Dict[str, Any]:
        """Kör smoke tests"""
        self.logger.info("🔍 Kör smoke tests")
        
        smoke_results = {}
        
        # Critical smoke tests
        smoke_results["authentication"] = await test_suite.test_authentication()
        smoke_results["navigation"] = await test_suite.test_basic_navigation()
        smoke_results["api_health"] = await test_suite.test_api_health()
        smoke_results["data_operations"] = await test_suite.test_basic_data_operations()
        
        return smoke_results

    async def _run_integration_tests(self, test_suite: GastroPartnerTestSuite) -> Dict[str, Any]:
        """Kör integration tests"""
        self.logger.info("🔗 Kör integration tests")
        
        integration_results = {}
        
        # Data validation tests
        integration_results["data_validation"] = await test_suite.test_data_validation()
        
        return integration_results

    async def _run_e2e_tests(self, test_suite: GastroPartnerTestSuite) -> Dict[str, Any]:
        """Kör E2E tests"""
        self.logger.info("🎭 Kör E2E tests")
        
        e2e_results = {}
        
        # Full module tests
        e2e_results["ingredients"] = await test_suite.test_ingredients_module()
        e2e_results["recipes"] = await test_suite.test_recipes_module()
        e2e_results["menu_items"] = await test_suite.test_menu_items_module()
        
        return e2e_results

    async def _run_performance_tests(self, test_suite: GastroPartnerTestSuite) -> Dict[str, Any]:
        """Kör performance tests"""
        self.logger.info("⚡ Kör performance tests")
        
        performance_results = {}
        performance_results["performance"] = await test_suite.test_performance()
        
        return performance_results

    async def _run_visual_tests(self, test_suite: GastroPartnerTestSuite) -> Dict[str, Any]:
        """Kör visual tests"""
        self.logger.info("🎨 Kör visual tests")
        
        visual_results = {}
        visual_results["visual"] = await test_suite.test_visual_compliance()
        
        return visual_results

    def _analyze_pipeline_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Analysera pipeline resultat"""
        total_tests = sum(result.get("total_tests", 0) for result in results.values())
        failed_tests = sum(result.get("failed_tests", 0) for result in results.values())
        passed_tests = sum(result.get("passed_tests", 0) for result in results.values())
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Identifiera kritiska moduler som misslyckades
        failed_modules = [
            module for module, result in results.items()
            if not result.get("success", False)
        ]
        
        # Bestäm övergripande framgång
        overall_success = len(failed_modules) == 0
        
        return {
            "overall_success": overall_success,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": round(success_rate, 2),
            "failed_modules": failed_modules,
            "modules_tested": len(results),
            "critical_failures": len(failed_modules) > 0
        }

    def _determine_exit_code(self, analysis: Dict[str, Any]) -> int:
        """Bestäm exit code för CI system"""
        if analysis["overall_success"]:
            return self.exit_codes["success"]
        elif analysis["critical_failures"]:
            return self.exit_codes["test_failure"]
        else:
            return self.exit_codes["test_failure"]

    def _create_failure_result(self, error_message: str, failure_type: str) -> Dict[str, Any]:
        """Skapa failure resultat"""
        return {
            "success": False,
            "exit_code": self.exit_codes[failure_type],
            "error": error_message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    async def _output_ci_results(self, result: Dict[str, Any], output_dir: Path) -> None:
        """Output resultat för CI system"""
        
        # JUnit XML format för CI system som stöder det
        await self._generate_junit_xml(result, output_dir)
        
        # JSON resultat
        json_path = output_dir / "ci_results.json"
        with open(json_path, "w") as f:
            json.dump(result, f, indent=2)
        
        # GitHub Actions output
        if os.getenv("GITHUB_ACTIONS"):
            await self._output_github_actions(result)
        
        # Console output
        await self._output_console_summary(result)

    async def _generate_junit_xml(self, result: Dict[str, Any], output_dir: Path) -> None:
        """Generera JUnit XML för CI integration"""
        try:
            junit_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="GastroPartner-Tests" tests="{result['analysis']['total_tests']}" 
           failures="{result['analysis']['failed_tests']}" 
           errors="0" 
           time="0" 
           timestamp="{result['timestamp']}">
'''
            
            # Lägg till testfall
            for module_name, module_result in result.get("results", {}).items():
                success = module_result.get("success", False)
                total_tests = module_result.get("total_tests", 0)
                
                if success:
                    junit_content += f'    <testcase name="{module_name}" classname="GastroPartner" time="0"/>\n'
                else:
                    error_msg = module_result.get("error", "Test failed")
                    junit_content += f'''    <testcase name="{module_name}" classname="GastroPartner" time="0">
        <failure message="{error_msg}" type="TestFailure">{error_msg}</failure>
    </testcase>\n'''
            
            junit_content += "</testsuite>"
            
            junit_path = output_dir / "junit_results.xml"
            with open(junit_path, "w") as f:
                f.write(junit_content)
                
        except Exception as e:
            self.logger.warning("Kunde inte generera JUnit XML", error=str(e))

    async def _output_github_actions(self, result: Dict[str, Any]) -> None:
        """Output för GitHub Actions"""
        try:
            # Set output variables
            print(f"::set-output name=success::{str(result['success']).lower()}")
            print(f"::set-output name=exit-code::{result['exit_code']}")
            print(f"::set-output name=success-rate::{result['analysis']['success_rate']}")
            
            # Annotations för fel
            if not result["success"]:
                for module in result["analysis"].get("failed_modules", []):
                    print(f"::error::Test module failed: {module}")
                    
        except Exception as e:
            self.logger.warning("Kunde inte sätta GitHub Actions output", error=str(e))

    async def _output_console_summary(self, result: Dict[str, Any]) -> None:
        """Console sammanfattning"""
        analysis = result["analysis"]
        
        print("\\n" + "="*60)
        print("🧪 GASTROPARTNER TEST SUITE - CI PIPELINE RESULTAT")
        print("="*60)
        print(f"Miljö: {result['environment']}")
        print(f"Test typer: {', '.join(result['test_types'])}")
        print(f"Tidsstämpel: {result['timestamp']}")
        print("-"*60)
        
        if result["success"]:
            print("✅ PIPELINE GODKÄND")
        else:
            print("❌ PIPELINE MISSLYCKAD")
        
        print(f"Totalt tester: {analysis['total_tests']}")
        print(f"Godkända: {analysis['passed_tests']}")
        print(f"Misslyckade: {analysis['failed_tests']}")
        print(f"Framgångsgrad: {analysis['success_rate']:.1f}%")
        
        if analysis.get("failed_modules"):
            print(f"Misslyckade moduler: {', '.join(analysis['failed_modules'])}")
        
        print(f"Exit code: {result['exit_code']}")
        
        if "report_path" in result:
            print(f"Rapport: {result['report_path']}")
        
        print("="*60)


async def main():
    """Huvudfunktion för CI integration"""
    import argparse
    
    parser = argparse.ArgumentParser(description="GastroPartner CI Integration")
    parser.add_argument("--environment", "-e", default="staging",
                       choices=["local", "staging", "production"],
                       help="Test environment")
    parser.add_argument("--test-types", "-t", nargs="+",
                       default=["smoke", "integration", "e2e"],
                       choices=["smoke", "integration", "e2e", "performance", "visual"],
                       help="Test types to run")
    parser.add_argument("--fail-fast", action="store_true",
                       help="Stop on first test failure")
    parser.add_argument("--json-output", action="store_true",
                       help="Output results as JSON only")
    
    args = parser.parse_args()
    
    # Setup logging
    if args.json_output:
        # JSON logging för CI systems
        structlog.configure(
            processors=[structlog.processors.JSONRenderer()],
            wrapper_class=structlog.make_filtering_bound_logger(20),
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        # Human readable logging
        structlog.configure(
            processors=[
                structlog.dev.ConsoleRenderer(colors=True)
            ],
            wrapper_class=structlog.make_filtering_bound_logger(20),
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    # Run CI pipeline
    ci = CIIntegration(args.environment)
    result = await ci.run_ci_pipeline(args.test_types)
    
    # JSON output för CI integration
    if args.json_output:
        print(json.dumps(result, indent=2))
    
    # Exit med korrekt exit code
    sys.exit(result["exit_code"])


if __name__ == "__main__":
    asyncio.run(main())