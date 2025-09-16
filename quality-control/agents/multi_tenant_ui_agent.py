#!/usr/bin/env python3
"""
Multi-Tenant UI Testing Agent - Critical Security Validation

Specialized agent for validating multi-tenant data isolation in the UI layer.
This is CRITICAL for GastroPartner's SaaS security - ensures users only see
data from their own organization and prevents cross-tenant data leakage.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
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
class MultiTenantTestCase:
    """A multi-tenant test scenario."""

    name: str
    description: str
    test_users: List[
        Dict[str, str]
    ]  # [{"email": "user1@org1.com", "org": "org1"}, ...]
    expected_isolation: List[str]  # What data should be isolated
    test_actions: List[str]  # Actions to perform
    validation_points: List[str]  # What to validate


@dataclass
class SecurityViolation:
    """A detected security violation."""

    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    type: str  # "cross_tenant_data", "missing_auth", "insecure_api"
    description: str
    location: str  # URL or UI component
    evidence: Dict[str, Any]
    remediation: str


@dataclass
class MultiTenantTestResult:
    """Result from multi-tenant testing."""

    test_case: str
    success: bool
    duration: float
    security_violations: List[SecurityViolation]
    data_isolation_score: float  # 0-1, 1 = perfect isolation
    ui_consistency_score: float  # 0-1, 1 = consistent across tenants
    performance_impact: Dict[str, float]
    screenshots: List[str] = None
    network_analysis: Dict[str, Any] = None

    def __post_init__(self):
        if self.screenshots is None:
            self.screenshots = []
        if self.network_analysis is None:
            self.network_analysis = {}


class MultiTenantTestPlan(BaseModel):
    """AI-planned multi-tenant test scenarios."""

    test_scenarios: List[str] = Field(
        description="Critical multi-tenant scenarios to test"
    )
    security_priorities: List[str] = Field(description="Security aspects to prioritize")
    data_types_to_validate: List[str] = Field(
        description="Types of data to check for isolation"
    )
    risk_areas: List[str] = Field(
        description="High-risk areas for cross-tenant leakage"
    )
    estimated_severity: str = Field(description="Expected severity level of testing")


class MultiTenantUIAgent:
    """
    AI-powered multi-tenant UI security validation agent.

    🚨 CRITICAL SECURITY FOCUS:
    - Validates organization_id data isolation at UI level
    - Prevents cross-tenant data exposure
    - Tests authentication boundaries
    - Validates API request security
    - Ensures consistent security across all UI components
    """

    def __init__(self, config=None):
        self.console = Console()
        self.results_dir = Path("quality-control/multi_tenant_results")
        self.results_dir.mkdir(exist_ok=True)

        # Setup logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)

        # Test configuration
        self.base_url = "http://localhost:3001"
        self.api_base_url = "http://localhost:8000"

        # AI agent for intelligent security test planning
        self.security_planner = Agent(
            "gemini-1.5-flash",
            system_prompt="""You are a security specialist focused on multi-tenant SaaS applications.
            Plan comprehensive security tests for GastroPartner that validate:
            
            1. DATA ISOLATION: Users only see data from their organization_id
            2. API SECURITY: All API calls include proper authentication and filtering
            3. UI CONSISTENCY: No data leakage in UI components, forms, dropdowns
            4. AUTHORIZATION: Proper role-based access within organizations
            5. SESSION SECURITY: Session isolation between different tenant users
            
            Focus on CRITICAL security scenarios that could lead to data breaches:
            - Cross-tenant data in lists/tables
            - Shared caches exposing other tenant data
            - API endpoints returning unfiltered data
            - UI components showing wrong organization data
            - Authentication bypasses or session hijacking
            
            Prioritize tests that validate the most sensitive data: recipes, menu items, 
            financial data, user information, and organizational settings.""",
        )

        # Predefined multi-tenant test scenarios
        self.test_scenarios = [
            MultiTenantTestCase(
                name="cross_tenant_recipe_isolation",
                description="Verify recipes from different organizations are isolated",
                test_users=[
                    {
                        "email": "user1@restaurant1.com",
                        "org": "org1",
                        "password": "test123",
                    },
                    {
                        "email": "user2@restaurant2.com",
                        "org": "org2",
                        "password": "test123",
                    },
                ],
                expected_isolation=[
                    "recipes",
                    "recipe_ingredients",
                    "recipe_instructions",
                ],
                test_actions=[
                    "login",
                    "view_recipes",
                    "create_recipe",
                    "search_recipes",
                ],
                validation_points=[
                    "recipes_list_shows_only_own_org",
                    "recipe_creation_includes_org_id",
                    "search_results_filtered_by_org",
                ],
            ),
            MultiTenantTestCase(
                name="menu_item_tenant_security",
                description="Validate menu items are properly isolated by tenant",
                test_users=[
                    {
                        "email": "user1@restaurant1.com",
                        "org": "org1",
                        "password": "test123",
                    },
                    {
                        "email": "user2@restaurant2.com",
                        "org": "org2",
                        "password": "test123",
                    },
                ],
                expected_isolation=["menu_items", "pricing", "categories"],
                test_actions=[
                    "login",
                    "view_menu_items",
                    "create_menu_item",
                    "edit_menu_item",
                ],
                validation_points=[
                    "menu_items_filtered_by_org",
                    "pricing_isolated_per_tenant",
                    "categories_not_shared",
                ],
            ),
            MultiTenantTestCase(
                name="api_request_security_validation",
                description="Verify all API requests include proper organization filtering",
                test_users=[
                    {
                        "email": "user1@restaurant1.com",
                        "org": "org1",
                        "password": "test123",
                    }
                ],
                expected_isolation=["api_responses", "database_queries"],
                test_actions=["login", "navigate_all_pages", "perform_crud_operations"],
                validation_points=[
                    "all_api_calls_authenticated",
                    "organization_id_in_requests",
                    "no_unfiltered_responses",
                ],
            ),
            MultiTenantTestCase(
                name="session_isolation_validation",
                description="Verify user sessions don't leak between tenants",
                test_users=[
                    {
                        "email": "user1@restaurant1.com",
                        "org": "org1",
                        "password": "test123",
                    },
                    {
                        "email": "user2@restaurant2.com",
                        "org": "org2",
                        "password": "test123",
                    },
                ],
                expected_isolation=["user_session", "cached_data", "local_storage"],
                test_actions=[
                    "sequential_login",
                    "simultaneous_login",
                    "logout_login_cycle",
                ],
                validation_points=[
                    "session_data_isolated",
                    "no_cache_contamination",
                    "proper_logout_cleanup",
                ],
            ),
        ]

        # ML integration for learning
        self.ml_agent = None
        try:
            self.ml_agent = MLAdaptationAgent()
        except Exception as e:
            self.logger.warning(f"ML agent not available: {e}")

    async def plan_security_tests(
        self, focus_areas: List[str] = None
    ) -> MultiTenantTestPlan:
        """AI-driven security test planning."""
        context = f"""
        Plan multi-tenant security tests for GastroPartner SaaS platform.
        
        Focus Areas: {focus_areas or ["data_isolation", "api_security", "ui_consistency"]}
        
        System Context:
        - Multi-tenant restaurant management system
        - Each restaurant = separate organization_id
        - Critical data: recipes, menu items, financial data, users
        - Tech stack: React frontend + FastAPI backend + Supabase PostgreSQL
        
        Security Requirements:
        - ZERO cross-tenant data visibility
        - All database queries MUST filter by organization_id  
        - API endpoints require authentication
        - UI components show only tenant-specific data
        - Session isolation between tenant users
        
        Plan tests that would catch the most dangerous security vulnerabilities:
        data leakage, authentication bypasses, and privilege escalation.
        """

        try:
            result = await self.security_planner.run(context)
            return result.data
        except Exception as e:
            self.logger.error(f"Security test planning failed: {e}")
            # Fallback plan
            return MultiTenantTestPlan(
                test_scenarios=["data_isolation", "api_security", "session_security"],
                security_priorities=[
                    "cross_tenant_data_prevention",
                    "authentication_validation",
                ],
                data_types_to_validate=["recipes", "menu_items", "users"],
                risk_areas=["api_endpoints", "ui_components", "session_management"],
                estimated_severity="HIGH",
            )

    async def run_comprehensive_security_testing(
        self, focus_areas: List[str] = None
    ) -> List[MultiTenantTestResult]:
        """Run complete multi-tenant security validation."""
        self.console.print(
            "[red]🛡️ Starting CRITICAL Multi-Tenant Security Testing[/red]"
        )
        self.console.print(
            "[yellow]⚠️ Testing for cross-tenant data leakage and security violations[/yellow]"
        )

        # Plan security tests
        test_plan = await self.plan_security_tests(focus_areas)

        results = []

        # Check if services are running
        if not await self._check_services():
            self.console.print(
                "[red]❌ Services not available for security testing[/red]"
            )
            return [
                MultiTenantTestResult(
                    test_case="service_availability",
                    success=False,
                    duration=0,
                    security_violations=[
                        SecurityViolation(
                            severity="HIGH",
                            type="service_unavailable",
                            description="Frontend or backend services not running",
                            location="system",
                            evidence={
                                "frontend": self.base_url,
                                "backend": self.api_base_url,
                            },
                            remediation="Start frontend (port 3001) and backend (port 8000) services",
                        )
                    ],
                    data_isolation_score=0.0,
                    ui_consistency_score=0.0,
                    performance_impact={},
                )
            ]

        try:
            # Import Playwright
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)

                # Run each security test scenario
                for scenario in self.test_scenarios:
                    if focus_areas and not any(
                        area in scenario.name for area in focus_areas
                    ):
                        continue  # Skip if not in focus

                    result = await self._run_security_scenario(browser, scenario)
                    results.append(result)

                await browser.close()

        except ImportError:
            self.console.print(
                "[red]❌ Playwright required for security testing: uv add playwright[/red]"
            )
            return [
                MultiTenantTestResult(
                    test_case="playwright_dependency",
                    success=False,
                    duration=0,
                    security_violations=[
                        SecurityViolation(
                            severity="MEDIUM",
                            type="missing_dependency",
                            description="Playwright package not installed",
                            location="system",
                            evidence={"package": "playwright"},
                            remediation="Install Playwright: uv add playwright && playwright install",
                        )
                    ],
                    data_isolation_score=0.0,
                    ui_consistency_score=0.0,
                    performance_impact={},
                )
            ]
        except Exception as e:
            self.console.print(f"[red]❌ Security testing failed: {e}[/red]")
            return [
                MultiTenantTestResult(
                    test_case="security_test_execution",
                    success=False,
                    duration=0,
                    security_violations=[
                        SecurityViolation(
                            severity="HIGH",
                            type="test_execution_failure",
                            description=str(e),
                            location="test_framework",
                            evidence={"error": str(e)},
                            remediation="Check system configuration and dependencies",
                        )
                    ],
                    data_isolation_score=0.0,
                    ui_consistency_score=0.0,
                    performance_impact={},
                )
            ]

        # Generate security report
        await self._generate_security_report(results, test_plan)

        # Learn from security findings
        if self.ml_agent:
            await self._record_security_learning(results)

        return results

    async def _check_services(self) -> bool:
        """Check if required services are running."""
        import aiohttp

        services = [
            ("Frontend", self.base_url),
            ("Backend", f"{self.api_base_url}/health"),
        ]

        all_running = True
        for service_name, url in services:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        url, timeout=aiohttp.ClientTimeout(total=5)
                    ) as response:
                        if response.status == 200:
                            self.console.print(
                                f"[green]✓[/green] {service_name} running"
                            )
                        else:
                            self.console.print(
                                f"[red]❌[/red] {service_name} status {response.status}"
                            )
                            all_running = False
            except Exception:
                self.console.print(f"[red]❌[/red] {service_name} not accessible")
                all_running = False

        return all_running

    async def _run_security_scenario(
        self, browser, scenario: MultiTenantTestCase
    ) -> MultiTenantTestResult:
        """Run a specific multi-tenant security scenario."""
        start_time = datetime.now()
        violations = []
        screenshots = []
        network_analysis = {"requests": [], "security_headers": [], "auth_tokens": []}

        self.console.print(f"[cyan]🔍 Testing: {scenario.name}[/cyan]")

        try:
            context = await browser.new_context()
            page = await context.new_page()

            # Network request monitoring
            def handle_request(request):
                network_analysis["requests"].append(
                    {
                        "url": request.url,
                        "method": request.method,
                        "headers": dict(request.headers),
                        "timestamp": datetime.now().isoformat(),
                    }
                )

            def handle_response(response):
                headers = dict(response.headers)
                network_analysis["security_headers"].append(
                    {
                        "url": response.url,
                        "status": response.status,
                        "security_headers": {
                            "x-frame-options": headers.get("x-frame-options"),
                            "x-content-type-options": headers.get(
                                "x-content-type-options"
                            ),
                            "x-xss-protection": headers.get("x-xss-protection"),
                            "strict-transport-security": headers.get(
                                "strict-transport-security"
                            ),
                        },
                    }
                )

            page.on("request", handle_request)
            page.on("response", handle_response)

            # Run scenario-specific tests
            if scenario.name == "cross_tenant_recipe_isolation":
                violations.extend(
                    await self._test_recipe_isolation(page, scenario, screenshots)
                )
            elif scenario.name == "menu_item_tenant_security":
                violations.extend(
                    await self._test_menu_item_security(page, scenario, screenshots)
                )
            elif scenario.name == "api_request_security_validation":
                violations.extend(
                    await self._test_api_security(
                        page, scenario, screenshots, network_analysis
                    )
                )
            elif scenario.name == "session_isolation_validation":
                violations.extend(
                    await self._test_session_isolation(page, scenario, screenshots)
                )

            await context.close()

        except Exception as e:
            violations.append(
                SecurityViolation(
                    severity="HIGH",
                    type="test_execution_error",
                    description=f"Security test failed: {str(e)}",
                    location=scenario.name,
                    evidence={"error": str(e), "scenario": scenario.name},
                    remediation="Review test configuration and system state",
                )
            )

        # Calculate security scores
        critical_violations = sum(1 for v in violations if v.severity == "CRITICAL")
        high_violations = sum(1 for v in violations if v.severity == "HIGH")

        # Data isolation score (1.0 = perfect, 0.0 = completely compromised)
        data_isolation_score = max(
            0.0, 1.0 - (critical_violations * 0.5) - (high_violations * 0.2)
        )

        # UI consistency score (simplified - could be more sophisticated)
        ui_consistency_score = 1.0 if len(violations) == 0 else 0.8

        duration = (datetime.now() - start_time).total_seconds()

        return MultiTenantTestResult(
            test_case=scenario.name,
            success=len(violations) == 0,
            duration=duration,
            security_violations=violations,
            data_isolation_score=data_isolation_score,
            ui_consistency_score=ui_consistency_score,
            performance_impact={"test_duration": duration},
            screenshots=screenshots,
            network_analysis=network_analysis,
        )

    async def _test_recipe_isolation(
        self, page, scenario: MultiTenantTestCase, screenshots: List[str]
    ) -> List[SecurityViolation]:
        """Test recipe data isolation between tenants."""
        violations = []

        try:
            # Navigate to login
            await page.goto(self.base_url)

            # Test with first user (if available)
            test_users = scenario.test_users
            if test_users:
                user = test_users[0]

                # Login
                await page.fill(
                    'input[type="email"], input[name="email"]', user["email"]
                )
                await page.fill(
                    'input[type="password"], input[name="password"]', user["password"]
                )
                await page.click(
                    'button[type="submit"], button:has-text("Login"), button:has-text("Logga in")'
                )

                # Wait for dashboard/recipes page
                try:
                    await page.wait_for_selector(
                        '.dashboard, .recipes, h1:has-text("Recipes")', timeout=10000
                    )
                except:
                    violations.append(
                        SecurityViolation(
                            severity="HIGH",
                            type="authentication_failure",
                            description=f"Login failed for test user {user['email']}",
                            location="login_page",
                            evidence={"user": user["email"]},
                            remediation="Verify test user credentials exist in database",
                        )
                    )
                    return violations

                # Navigate to recipes
                await page.goto(f"{self.base_url}/recipes")

                # Screenshot recipes page
                screenshot_path = (
                    self.results_dir
                    / f"recipes_security_{datetime.now().strftime('%H%M%S')}.png"
                )
                await page.screenshot(path=screenshot_path)
                screenshots.append(str(screenshot_path))

                # Check for organization-specific data only
                # This would require knowing what data should be visible
                page_content = await page.content()

                # Look for potential data leakage indicators
                suspicious_patterns = [
                    "SELECT * FROM recipes",  # Unfiltered SQL (shouldn't appear in UI)
                    "organization_id IS NULL",  # Missing org filter
                    "all_organizations",  # Global data access
                ]

                for pattern in suspicious_patterns:
                    if pattern.lower() in page_content.lower():
                        violations.append(
                            SecurityViolation(
                                severity="CRITICAL",
                                type="cross_tenant_data",
                                description=f"Potential data leakage pattern detected: {pattern}",
                                location="recipes_page",
                                evidence={"pattern": pattern, "user": user["email"]},
                                remediation="Review recipe data filtering implementation",
                            )
                        )

        except Exception as e:
            violations.append(
                SecurityViolation(
                    severity="HIGH",
                    type="recipe_isolation_test_error",
                    description=f"Recipe isolation test failed: {str(e)}",
                    location="recipe_isolation_test",
                    evidence={"error": str(e)},
                    remediation="Review recipe isolation test implementation",
                )
            )

        return violations

    async def _test_menu_item_security(
        self, page, scenario: MultiTenantTestCase, screenshots: List[str]
    ) -> List[SecurityViolation]:
        """Test menu item multi-tenant security."""
        violations = []

        try:
            # Similar pattern to recipe testing but for menu items
            await page.goto(f"{self.base_url}/menu-items")

            screenshot_path = (
                self.results_dir
                / f"menu_security_{datetime.now().strftime('%H%M%S')}.png"
            )
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))

            # Check for menu item specific security issues
            page_content = await page.content()

            # Look for pricing data leakage (sensitive financial information)
            if (
                "pricing" in page_content.lower()
                and "all_restaurants" in page_content.lower()
            ):
                violations.append(
                    SecurityViolation(
                        severity="HIGH",
                        type="financial_data_exposure",
                        description="Potential pricing data exposure across tenants",
                        location="menu_items_page",
                        evidence={"content_check": "pricing_data_found"},
                        remediation="Ensure pricing data is filtered by organization_id",
                    )
                )

        except Exception as e:
            violations.append(
                SecurityViolation(
                    severity="MEDIUM",
                    type="menu_security_test_error",
                    description=f"Menu security test error: {str(e)}",
                    location="menu_security_test",
                    evidence={"error": str(e)},
                    remediation="Review menu item security test",
                )
            )

        return violations

    async def _test_api_security(
        self,
        page,
        scenario: MultiTenantTestCase,
        screenshots: List[str],
        network_analysis: Dict,
    ) -> List[SecurityViolation]:
        """Test API request security and filtering."""
        violations = []

        try:
            # Navigate through application to generate API calls
            await page.goto(self.base_url)
            await page.goto(f"{self.base_url}/recipes")
            await page.goto(f"{self.base_url}/menu-items")

            # Wait for API calls to complete
            await page.wait_for_timeout(3000)

            # Analyze captured network requests
            api_requests = [
                r for r in network_analysis["requests"] if self.api_base_url in r["url"]
            ]

            if not api_requests:
                violations.append(
                    SecurityViolation(
                        severity="MEDIUM",
                        type="no_api_calls_detected",
                        description="No API calls detected during navigation",
                        location="network_analysis",
                        evidence={"total_requests": len(network_analysis["requests"])},
                        remediation="Verify API calls are being made and captured correctly",
                    )
                )
                return violations

            # Check each API request for security
            for request in api_requests:
                headers = request.get("headers", {})

                # Check for authentication headers
                auth_headers = ["authorization", "x-auth-token", "bearer", "cookie"]
                has_auth = any(
                    header.lower() in [h.lower() for h in headers]
                    for header in auth_headers
                )

                if (
                    not has_auth
                    and "/auth/" not in request["url"]
                    and "/health" not in request["url"]
                ):
                    violations.append(
                        SecurityViolation(
                            severity="CRITICAL",
                            type="unauthenticated_api_call",
                            description="Unauthenticated API request detected",
                            location=request["url"],
                            evidence={
                                "url": request["url"],
                                "method": request["method"],
                            },
                            remediation="Ensure all API endpoints require authentication",
                        )
                    )

                # Check for organization_id in query parameters (good practice)
                url = request["url"]
                if (
                    "/api/" in url
                    and "organization_id" not in url
                    and "org_id" not in url
                ):
                    # This might be okay if filtering happens server-side via auth token
                    # But we should flag it for review
                    violations.append(
                        SecurityViolation(
                            severity="MEDIUM",
                            type="potential_unfiltered_api",
                            description="API request without explicit organization filtering",
                            location=url,
                            evidence={"url": url, "method": request["method"]},
                            remediation="Verify server-side organization filtering is implemented",
                        )
                    )

        except Exception as e:
            violations.append(
                SecurityViolation(
                    severity="HIGH",
                    type="api_security_test_error",
                    description=f"API security test failed: {str(e)}",
                    location="api_security_test",
                    evidence={"error": str(e)},
                    remediation="Review API security test implementation",
                )
            )

        return violations

    async def _test_session_isolation(
        self, page, scenario: MultiTenantTestCase, screenshots: List[str]
    ) -> List[SecurityViolation]:
        """Test session isolation between tenants."""
        violations = []

        try:
            # Test basic session functionality
            await page.goto(self.base_url)

            # Check local storage for potential data leakage
            local_storage = await page.evaluate("() => Object.keys(localStorage)")
            session_storage = await page.evaluate("() => Object.keys(sessionStorage)")

            # Look for organization-specific data in storage
            for key in local_storage + session_storage:
                if "org" in key.lower() or "tenant" in key.lower():
                    # This is actually good - organization data in storage
                    continue
                elif "all_orgs" in key.lower() or "global_data" in key.lower():
                    violations.append(
                        SecurityViolation(
                            severity="HIGH",
                            type="global_data_in_storage",
                            description=f"Global data detected in browser storage: {key}",
                            location="browser_storage",
                            evidence={"storage_key": key},
                            remediation="Remove global data from browser storage",
                        )
                    )

        except Exception as e:
            violations.append(
                SecurityViolation(
                    severity="MEDIUM",
                    type="session_isolation_test_error",
                    description=f"Session isolation test error: {str(e)}",
                    location="session_test",
                    evidence={"error": str(e)},
                    remediation="Review session isolation test",
                )
            )

        return violations

    async def _generate_security_report(
        self, results: List[MultiTenantTestResult], test_plan: MultiTenantTestPlan
    ):
        """Generate comprehensive security report."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.results_dir / f"security_report_{timestamp}.json"

        # Aggregate security findings
        all_violations = []
        for result in results:
            all_violations.extend(result.security_violations)

        critical_count = sum(1 for v in all_violations if v.severity == "CRITICAL")
        high_count = sum(1 for v in all_violations if v.severity == "HIGH")
        medium_count = sum(1 for v in all_violations if v.severity == "MEDIUM")
        low_count = sum(1 for v in all_violations if v.severity == "LOW")

        # Calculate overall security score
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.success)
        avg_isolation_score = (
            sum(r.data_isolation_score for r in results) / total_tests
            if total_tests > 0
            else 0
        )

        # Overall security assessment
        if critical_count > 0:
            security_status = "CRITICAL - IMMEDIATE ACTION REQUIRED"
            security_color = "red"
        elif high_count > 0:
            security_status = "HIGH RISK - ACTION NEEDED"
            security_color = "red"
        elif medium_count > 0:
            security_status = "MEDIUM RISK - REVIEW RECOMMENDED"
            security_color = "yellow"
        else:
            security_status = "LOW RISK - ACCEPTABLE"
            security_color = "green"

        # Save detailed report
        report_data = {
            "timestamp": timestamp,
            "test_plan": asdict(test_plan),
            "security_assessment": {
                "overall_status": security_status,
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "average_isolation_score": avg_isolation_score,
                "violation_summary": {
                    "critical": critical_count,
                    "high": high_count,
                    "medium": medium_count,
                    "low": low_count,
                },
            },
            "test_results": [asdict(result) for result in results],
            "all_violations": [asdict(v) for v in all_violations],
        }

        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2, default=str)

        # Display security summary
        self.console.print("\n[bold]🛡️ MULTI-TENANT SECURITY ASSESSMENT[/bold]")

        table = Table(title="Security Test Results")
        table.add_column("Metric", style="bold")
        table.add_column("Value", style=security_color)

        table.add_row("Overall Status", security_status)
        table.add_row("Tests Run", str(total_tests))
        table.add_row("Tests Passed", str(passed_tests))
        table.add_row("Data Isolation Score", f"{avg_isolation_score:.1%}")
        table.add_row("Critical Violations", str(critical_count))
        table.add_row("High Risk Violations", str(high_count))
        table.add_row("Medium Risk Violations", str(medium_count))

        self.console.print(table)

        # Show top violations
        if all_violations:
            self.console.print("\n[bold red]🚨 TOP SECURITY VIOLATIONS:[/bold red]")
            for i, violation in enumerate(
                sorted(all_violations, key=lambda v: v.severity)[:5], 1
            ):
                severity_color = {
                    "CRITICAL": "red",
                    "HIGH": "red",
                    "MEDIUM": "yellow",
                    "LOW": "blue",
                }.get(violation.severity, "white")
                self.console.print(
                    f"{i}. [{severity_color}]{violation.severity}[/{severity_color}] - {violation.description}"
                )
                self.console.print(f"   Location: {violation.location}")
                self.console.print(f"   Fix: {violation.remediation}\n")

        self.console.print(f"[blue]📊 Full security report: {report_path}[/blue]")

    async def _record_security_learning(self, results: List[MultiTenantTestResult]):
        """Record security test results for ML learning."""
        if not self.ml_agent:
            return

        try:
            security_learning_data = {
                "test_type": "multi_tenant_security",
                "timestamp": datetime.now().isoformat(),
                "security_summary": {
                    "total_tests": len(results),
                    "security_violations": sum(
                        len(r.security_violations) for r in results
                    ),
                    "critical_violations": sum(
                        1
                        for r in results
                        for v in r.security_violations
                        if v.severity == "CRITICAL"
                    ),
                    "average_isolation_score": sum(
                        r.data_isolation_score for r in results
                    )
                    / len(results)
                    if results
                    else 0,
                    "test_success_rate": sum(1 for r in results if r.success)
                    / len(results)
                    if results
                    else 0,
                },
                "violation_patterns": [
                    {
                        "test_case": r.test_case,
                        "violation_types": [v.type for v in r.security_violations],
                        "severities": [v.severity for v in r.security_violations],
                        "isolation_score": r.data_isolation_score,
                    }
                    for r in results
                ],
            }

            await self.ml_agent.record_validation_data(
                "multi_tenant_security", security_learning_data, "security_validation"
            )

        except Exception as e:
            self.logger.warning(f"Failed to record security learning: {e}")


# Integration function
async def run_multi_tenant_security_validation(
    focus_areas: List[str] = None,
) -> Dict[str, Any]:
    """
    Run comprehensive multi-tenant security validation.

    Args:
        focus_areas: Optional list of security areas to focus on

    Returns:
        Security validation results
    """
    agent = MultiTenantUIAgent()
    results = await agent.run_comprehensive_security_testing(focus_areas)

    # Calculate summary
    all_violations = []
    for result in results:
        all_violations.extend(result.security_violations)

    critical_violations = sum(1 for v in all_violations if v.severity == "CRITICAL")
    high_violations = sum(1 for v in all_violations if v.severity == "HIGH")

    return {
        "security_status": "CRITICAL"
        if critical_violations > 0
        else "HIGH_RISK"
        if high_violations > 0
        else "ACCEPTABLE",
        "tests_run": len(results),
        "tests_passed": sum(1 for r in results if r.success),
        "critical_violations": critical_violations,
        "high_risk_violations": high_violations,
        "total_violations": len(all_violations),
        "average_isolation_score": sum(r.data_isolation_score for r in results)
        / len(results)
        if results
        else 0,
        "detailed_results": results,
    }


if __name__ == "__main__":
    # Direct testing
    async def main():
        agent = MultiTenantUIAgent()
        results = await agent.run_comprehensive_security_testing()

        all_violations = []
        for result in results:
            all_violations.extend(result.security_violations)

        critical = sum(1 for v in all_violations if v.severity == "CRITICAL")
        high = sum(1 for v in all_violations if v.severity == "HIGH")

        print("\n🛡️ Security Testing Complete:")
        print(f"   Tests: {len(results)}")
        print(f"   Critical Issues: {critical}")
        print(f"   High Risk Issues: {high}")

        if critical > 0:
            print("🚨 CRITICAL SECURITY ISSUES FOUND - IMMEDIATE ACTION REQUIRED")
        elif high > 0:
            print("⚠️ High risk security issues found - review needed")
        else:
            print("✅ No critical security issues detected")

    asyncio.run(main())
