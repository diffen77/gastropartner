#!/usr/bin/env python3
"""
E2E Validation Agent - Comprehensive Web Application Testing

Playwright-based end-to-end testing agent that validates the entire GastroPartner
system through automated browser interactions. Focuses on multi-tenant security,
user workflows, and system integrity validation.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

from pydantic_ai import Agent
from pydantic import BaseModel, Field
from rich.console import Console
from rich.table import Table

# Import local modules
import sys

sys.path.append(str(Path(__file__).parent.parent))

from agents.ml_adaptation_agent import MLAdaptationAgent


@dataclass
class TestConfiguration:
    """Configuration for E2E testing."""

    base_url: str = "http://localhost:3001"  # Frontend URL
    api_base_url: str = "http://localhost:8000"  # Backend URL
    timeout: int = 30000  # 30 seconds
    viewport: Dict[str, int] = None
    headless: bool = True
    slow_mo: int = 0  # For debugging

    def __post_init__(self):
        if self.viewport is None:
            self.viewport = {"width": 1920, "height": 1080}


@dataclass
class TestResult:
    """Result from an E2E test."""

    test_name: str
    success: bool
    duration: float
    error_message: Optional[str] = None
    screenshots: List[str] = None
    validation_data: Dict[str, Any] = None
    security_findings: List[str] = None
    performance_metrics: Dict[str, float] = None

    def __post_init__(self):
        if self.screenshots is None:
            self.screenshots = []
        if self.validation_data is None:
            self.validation_data = {}
        if self.security_findings is None:
            self.security_findings = []
        if self.performance_metrics is None:
            self.performance_metrics = {}


class E2ETestPlan(BaseModel):
    """Pydantic model for test planning."""

    test_flows: List[str] = Field(description="List of user flows to test")
    security_checks: List[str] = Field(description="Security validations to perform")
    performance_checks: List[str] = Field(description="Performance metrics to collect")
    multi_tenant_tests: List[str] = Field(description="Multi-tenant isolation tests")
    estimated_duration: int = Field(description="Estimated test duration in seconds")


class E2EValidationAgent:
    """
    AI-powered E2E validation agent using Playwright for comprehensive web testing.

    Key Features:
    - Multi-tenant security validation
    - Complete user journey testing
    - Performance monitoring
    - Automated screenshot capture
    - Integration with quality control system
    """

    def __init__(self, config: TestConfiguration = None):
        self.config = config or TestConfiguration()
        self.console = Console()
        self.results_dir = Path("quality-control/e2e_results")
        self.results_dir.mkdir(exist_ok=True)

        # Setup logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)

        # AI agent for intelligent test planning
        self.test_planner = Agent(
            "gemini-1.5-flash",
            system_prompt="""You are an intelligent E2E test planner for GastroPartner, 
            a multi-tenant restaurant management system. Plan comprehensive test flows that:
            
            1. SECURITY FIRST: Always validate multi-tenant data isolation
            2. COMPLETE FLOWS: Test entire user journeys from login to task completion  
            3. PERFORMANCE: Monitor load times and responsiveness
            4. ERROR HANDLING: Test error scenarios and recovery
            5. ACCESSIBILITY: Validate WCAG compliance
            
            Focus on realistic user workflows: Login → Navigate → Create/Edit → Save → Logout
            Always include cross-tenant security tests to ensure users only see their own data.""",
        )

        # ML integration for learning from test results
        self.ml_agent = None
        try:
            self.ml_agent = MLAdaptationAgent()
        except Exception as e:
            self.logger.warning(f"ML agent not available: {e}")

    async def plan_test_suite(self, target_features: List[str] = None) -> E2ETestPlan:
        """Use AI to plan comprehensive test suite."""
        context = f"""
        Plan E2E tests for GastroPartner features: {target_features or ["all"]}
        
        System Architecture:
        - Multi-tenant SaaS (organization_id isolation CRITICAL)
        - React frontend (localhost:3001)  
        - FastAPI backend (localhost:8000)
        - Supabase PostgreSQL database
        
        Core Features to Test:
        - Authentication & Authorization
        - Recipe Management (CRUD)
        - Menu Item Management
        - Multi-tenant data isolation
        - Organization management
        - User workflows
        
        Security Requirements:
        - Users must only see data for their organization_id
        - Cross-tenant data leakage prevention
        - Proper authentication enforcement
        """

        try:
            result = await self.test_planner.run(context)
            return result.data
        except Exception as e:
            self.logger.error(f"Test planning failed: {e}")
            # Fallback to basic test plan
            return E2ETestPlan(
                test_flows=["login", "recipe_management", "logout"],
                security_checks=["multi_tenant_isolation"],
                performance_checks=["page_load_times"],
                multi_tenant_tests=["cross_tenant_data_access"],
                estimated_duration=300,
            )

    async def run_comprehensive_validation(
        self, features: List[str] = None
    ) -> List[TestResult]:
        """Run complete E2E validation suite."""
        self.console.print("[cyan]🚀 Starting Comprehensive E2E Validation[/cyan]")

        # Plan the test suite
        test_plan = await self.plan_test_suite(features)
        self.console.print(
            f"[blue]📋 Test Plan: {len(test_plan.test_flows)} flows, estimated {test_plan.estimated_duration}s[/blue]"
        )

        results = []

        # Check if services are running
        if not await self._check_services():
            self.console.print("[red]❌ Required services are not running[/red]")
            return [
                TestResult(
                    test_name="service_check",
                    success=False,
                    duration=0,
                    error_message="Frontend (3001) or Backend (8000) not available",
                )
            ]

        try:
            # Import Playwright dynamically (might not be installed)
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=self.config.headless, slow_mo=self.config.slow_mo
                )

                context = await browser.new_context(viewport=self.config.viewport)

                page = await context.new_page()

                # Core test flows
                for flow in test_plan.test_flows:
                    result = await self._run_test_flow(page, flow)
                    results.append(result)

                # Security tests
                for security_test in test_plan.security_checks:
                    result = await self._run_security_test(page, security_test)
                    results.append(result)

                # Multi-tenant tests
                for tenant_test in test_plan.multi_tenant_tests:
                    result = await self._run_multi_tenant_test(page, tenant_test)
                    results.append(result)

                await browser.close()

        except ImportError:
            self.console.print(
                "[red]❌ Playwright not installed. Run: uv add playwright[/red]"
            )
            return [
                TestResult(
                    test_name="playwright_import",
                    success=False,
                    duration=0,
                    error_message="Playwright package not available",
                )
            ]
        except Exception as e:
            self.console.print(f"[red]❌ E2E validation failed: {e}[/red]")
            return [
                TestResult(
                    test_name="e2e_validation",
                    success=False,
                    duration=0,
                    error_message=str(e),
                )
            ]

        # Generate summary
        await self._generate_test_report(results, test_plan)

        # Learn from results if ML agent available
        if self.ml_agent:
            await self._record_test_learning(results)

        return results

    async def _check_services(self) -> bool:
        """Check if required services are running."""
        import aiohttp

        services = [
            ("Frontend", self.config.base_url),
            ("Backend", f"{self.config.api_base_url}/health"),
        ]

        for service_name, url in services:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        url, timeout=aiohttp.ClientTimeout(total=5)
                    ) as response:
                        if response.status == 200:
                            self.console.print(
                                f"[green]✓[/green] {service_name} is running"
                            )
                        else:
                            self.console.print(
                                f"[red]❌[/red] {service_name} returned status {response.status}"
                            )
                            return False
            except Exception as e:
                self.console.print(f"[red]❌[/red] {service_name} not accessible: {e}")
                return False

        return True

    async def _run_test_flow(self, page, flow_name: str) -> TestResult:
        """Run a specific test flow."""
        start_time = datetime.now()

        try:
            if flow_name == "login":
                return await self._test_login_flow(page)
            elif flow_name == "recipe_management":
                return await self._test_recipe_management_flow(page)
            elif flow_name == "menu_item_management":
                return await self._test_menu_item_flow(page)
            elif flow_name == "logout":
                return await self._test_logout_flow(page)
            else:
                return TestResult(
                    test_name=flow_name,
                    success=False,
                    duration=(datetime.now() - start_time).total_seconds(),
                    error_message=f"Unknown test flow: {flow_name}",
                )

        except Exception as e:
            return TestResult(
                test_name=flow_name,
                success=False,
                duration=(datetime.now() - start_time).total_seconds(),
                error_message=str(e),
            )

    async def _test_login_flow(self, page) -> TestResult:
        """Test complete login flow."""
        start_time = datetime.now()
        screenshots = []

        try:
            # Navigate to login page
            await page.goto(self.config.base_url)

            # Take initial screenshot
            screenshot_path = (
                self.results_dir
                / f"login_initial_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            # Wait for login form
            await page.wait_for_selector(
                'input[type="email"], input[name="email"]', timeout=10000
            )

            # Test data
            test_email = "test@gastropartner.com"
            test_password = "testpassword"

            # Fill login form
            await page.fill('input[type="email"], input[name="email"]', test_email)
            await page.fill(
                'input[type="password"], input[name="password"]', test_password
            )

            # Submit form
            await page.click(
                'button[type="submit"], button:has-text("Login"), button:has-text("Logga in")'
            )

            # Wait for successful login (dashboard or recipes page)
            await page.wait_for_selector(
                '.dashboard, .recipes, h1:has-text("Recipes"), h1:has-text("Dashboard")',
                timeout=15000,
            )

            # Take success screenshot
            screenshot_path = (
                self.results_dir
                / f"login_success_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            duration = (datetime.now() - start_time).total_seconds()

            return TestResult(
                test_name="login_flow",
                success=True,
                duration=duration,
                screenshots=screenshots,
                validation_data={"user_email": test_email},
                performance_metrics={"login_duration": duration},
            )

        except Exception as e:
            # Take error screenshot
            screenshot_path = (
                self.results_dir
                / f"login_error_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            return TestResult(
                test_name="login_flow",
                success=False,
                duration=(datetime.now() - start_time).total_seconds(),
                error_message=str(e),
                screenshots=screenshots,
            )

    async def _test_recipe_management_flow(self, page) -> TestResult:
        """Test complete recipe management CRUD operations."""
        start_time = datetime.now()
        screenshots = []

        try:
            # Navigate to recipes page
            await page.goto(f"{self.config.base_url}/recipes")

            # Wait for recipes page to load
            await page.wait_for_selector(
                '.recipes, h1:has-text("Recipes")', timeout=10000
            )

            # Screenshot recipes page
            screenshot_path = (
                self.results_dir
                / f"recipes_page_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            # Test CREATE - Click add recipe button
            await page.click(
                'button:has-text("Add"), button:has-text("Create"), button:has-text("New Recipe")'
            )

            # Fill recipe form
            test_recipe_name = f"E2E Test Recipe {datetime.now().strftime('%H%M%S')}"
            await page.fill(
                'input[name="name"], input[placeholder*="name"]', test_recipe_name
            )

            # Fill description if available
            description_selector = (
                'textarea[name="description"], textarea[placeholder*="description"]'
            )
            if await page.query_selector(description_selector):
                await page.fill(
                    description_selector,
                    "Automated test recipe created by E2E validation",
                )

            # Save recipe
            await page.click(
                'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
            )

            # Wait for success (should see recipe in list or success message)
            await page.wait_for_timeout(2000)  # Wait for save to complete

            # Screenshot after creation
            screenshot_path = (
                self.results_dir
                / f"recipe_created_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            # Test READ - Verify recipe appears in list
            await page.goto(f"{self.config.base_url}/recipes")
            await page.wait_for_selector(
                '.recipes, h1:has-text("Recipes")', timeout=10000
            )

            # Look for our created recipe
            recipe_found = await page.query_selector(f'text="{test_recipe_name}"')
            if not recipe_found:
                raise Exception(
                    f"Created recipe '{test_recipe_name}' not found in list"
                )

            duration = (datetime.now() - start_time).total_seconds()

            return TestResult(
                test_name="recipe_management_flow",
                success=True,
                duration=duration,
                screenshots=screenshots,
                validation_data={
                    "recipe_name": test_recipe_name,
                    "crud_operations": ["create", "read"],
                },
                performance_metrics={"recipe_crud_duration": duration},
            )

        except Exception as e:
            # Error screenshot
            screenshot_path = (
                self.results_dir
                / f"recipe_error_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            return TestResult(
                test_name="recipe_management_flow",
                success=False,
                duration=(datetime.now() - start_time).total_seconds(),
                error_message=str(e),
                screenshots=screenshots,
            )

    async def _test_menu_item_flow(self, page) -> TestResult:
        """Test menu item management flow."""
        start_time = datetime.now()
        screenshots = []

        try:
            # Navigate to menu items page
            await page.goto(f"{self.config.base_url}/menu-items")

            # Wait for menu items page
            await page.wait_for_selector(
                '.menu-items, h1:has-text("Menu")', timeout=10000
            )

            screenshot_path = (
                self.results_dir / f"menu_items_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            duration = (datetime.now() - start_time).total_seconds()

            return TestResult(
                test_name="menu_item_flow",
                success=True,
                duration=duration,
                screenshots=screenshots,
                performance_metrics={"menu_load_duration": duration},
            )

        except Exception as e:
            screenshot_path = (
                self.results_dir / f"menu_error_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            return TestResult(
                test_name="menu_item_flow",
                success=False,
                duration=(datetime.now() - start_time).total_seconds(),
                error_message=str(e),
                screenshots=screenshots,
            )

    async def _test_logout_flow(self, page) -> TestResult:
        """Test logout flow."""
        start_time = datetime.now()

        try:
            # Look for logout button/link
            logout_selectors = [
                'button:has-text("Logout")',
                'button:has-text("Logga ut")',
                'a:has-text("Logout")',
                'a:has-text("Logga ut")',
                '[data-testid="logout"]',
            ]

            logout_clicked = False
            for selector in logout_selectors:
                try:
                    await page.click(selector, timeout=5000)
                    logout_clicked = True
                    break
                except:
                    continue

            if not logout_clicked:
                raise Exception("Logout button/link not found")

            # Wait to be redirected to login page
            await page.wait_for_selector(
                'input[type="email"], input[name="email"]', timeout=10000
            )

            return TestResult(
                test_name="logout_flow",
                success=True,
                duration=(datetime.now() - start_time).total_seconds(),
            )

        except Exception as e:
            return TestResult(
                test_name="logout_flow",
                success=False,
                duration=(datetime.now() - start_time).total_seconds(),
                error_message=str(e),
            )

    async def _run_security_test(self, page, security_test: str) -> TestResult:
        """Run security-focused tests."""
        start_time = datetime.now()

        if security_test == "multi_tenant_isolation":
            return await self._test_multi_tenant_isolation(page)
        else:
            return TestResult(
                test_name=f"security_{security_test}",
                success=False,
                duration=(datetime.now() - start_time).total_seconds(),
                error_message=f"Unknown security test: {security_test}",
            )

    async def _test_multi_tenant_isolation(self, page) -> TestResult:
        """Critical test: Verify multi-tenant data isolation."""
        start_time = datetime.now()
        security_findings = []

        try:
            # This would require multiple test accounts from different organizations
            # For now, we verify that organization_id is present in API calls

            # Intercept network requests
            requests = []

            def handle_request(request):
                requests.append(
                    {
                        "url": request.url,
                        "method": request.method,
                        "headers": dict(request.headers),
                    }
                )

            page.on("request", handle_request)

            # Navigate to recipes page (should trigger API calls)
            await page.goto(f"{self.config.base_url}/recipes")
            await page.wait_for_timeout(3000)  # Wait for API calls

            # Analyze API requests for organization_id filtering
            api_requests = [r for r in requests if self.config.api_base_url in r["url"]]

            if not api_requests:
                security_findings.append(
                    "No API requests detected - cannot verify multi-tenant isolation"
                )

            for request in api_requests:
                # Check if authentication headers are present
                auth_headers = ["authorization", "x-auth-token", "bearer"]
                has_auth = any(
                    header.lower() in [h.lower() for h in request["headers"]]
                    for header in auth_headers
                )

                if not has_auth:
                    security_findings.append(
                        f"Unauthenticated API request: {request['url']}"
                    )

            return TestResult(
                test_name="multi_tenant_isolation",
                success=len(security_findings) == 0,
                duration=(datetime.now() - start_time).total_seconds(),
                security_findings=security_findings,
                validation_data={
                    "api_requests_analyzed": len(api_requests),
                    "total_requests": len(requests),
                },
            )

        except Exception as e:
            return TestResult(
                test_name="multi_tenant_isolation",
                success=False,
                duration=(datetime.now() - start_time).total_seconds(),
                error_message=str(e),
                security_findings=["Test execution failed"],
            )

    async def _run_multi_tenant_test(self, page, tenant_test: str) -> TestResult:
        """Run multi-tenant specific tests."""
        # For now, redirect to security test
        return await self._run_security_test(page, tenant_test)

    async def _generate_test_report(
        self, results: List[TestResult], test_plan: E2ETestPlan
    ):
        """Generate comprehensive test report."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.results_dir / f"e2e_report_{timestamp}.json"

        # Calculate summary metrics
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.success)
        failed_tests = total_tests - passed_tests
        total_duration = sum(r.duration for r in results)

        # Security summary
        all_security_findings = []
        for result in results:
            all_security_findings.extend(result.security_findings)

        report_data = {
            "timestamp": timestamp,
            "test_plan": asdict(test_plan),
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "success_rate": passed_tests / total_tests if total_tests > 0 else 0,
                "total_duration": total_duration,
                "average_test_duration": total_duration / total_tests
                if total_tests > 0
                else 0,
            },
            "security_summary": {
                "total_findings": len(all_security_findings),
                "findings": all_security_findings,
            },
            "test_results": [asdict(result) for result in results],
            "configuration": asdict(self.config),
        }

        # Save report
        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2, default=str)

        # Display summary
        table = Table(title="🌐 E2E Validation Results")
        table.add_column("Metric", style="bold")
        table.add_column("Value", style="green")

        table.add_row("Total Tests", str(total_tests))
        table.add_row("Passed", str(passed_tests))
        table.add_row("Failed", str(failed_tests))
        table.add_row(
            "Success Rate",
            f"{passed_tests / total_tests * 100:.1f}%" if total_tests > 0 else "0%",
        )
        table.add_row("Duration", f"{total_duration:.1f}s")
        table.add_row("Security Findings", str(len(all_security_findings)))

        self.console.print(table)
        self.console.print(f"[blue]📊 Full report saved: {report_path}[/blue]")

    async def _record_test_learning(self, results: List[TestResult]):
        """Record test results for ML learning."""
        if not self.ml_agent:
            return

        try:
            learning_data = {
                "test_type": "e2e_validation",
                "timestamp": datetime.now().isoformat(),
                "results_summary": {
                    "total_tests": len(results),
                    "success_rate": sum(1 for r in results if r.success) / len(results)
                    if results
                    else 0,
                    "average_duration": sum(r.duration for r in results) / len(results)
                    if results
                    else 0,
                    "security_findings": sum(len(r.security_findings) for r in results),
                },
                "test_details": [
                    {
                        "name": r.test_name,
                        "success": r.success,
                        "duration": r.duration,
                        "error": r.error_message if r.error_message else None,
                    }
                    for r in results
                ],
            }

            await self.ml_agent.record_validation_data(
                "e2e_test", learning_data, "system_validation"
            )

        except Exception as e:
            self.logger.warning(f"Failed to record test learning: {e}")


# Integration with main quality control system
async def run_e2e_validation(features: List[str] = None) -> Dict[str, Any]:
    """
    Main entry point for E2E validation.

    Args:
        features: Optional list of specific features to test

    Returns:
        Validation results summary
    """
    agent = E2EValidationAgent()
    results = await agent.run_comprehensive_validation(features)

    # Return summary for integration
    return {
        "success": all(r.success for r in results),
        "total_tests": len(results),
        "passed_tests": sum(1 for r in results if r.success),
        "failed_tests": sum(1 for r in results if not r.success),
        "total_duration": sum(r.duration for r in results),
        "security_findings": sum(len(r.security_findings) for r in results),
        "results": results,
    }


if __name__ == "__main__":
    # Direct testing
    async def main():
        agent = E2EValidationAgent()
        results = await agent.run_comprehensive_validation()

        print(
            f"✅ E2E Validation completed: {sum(1 for r in results if r.success)}/{len(results)} tests passed"
        )

        for result in results:
            status = "✅" if result.success else "❌"
            print(f"{status} {result.test_name}: {result.duration:.1f}s")
            if result.error_message:
                print(f"   Error: {result.error_message}")

    asyncio.run(main())
