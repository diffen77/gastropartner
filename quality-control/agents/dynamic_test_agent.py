"""
Dynamic Test Agent - Functional and Integration Testing Specialist

This agent performs dynamic testing including API testing, integration tests,
and functional validation of the running application.
"""

import time
from datetime import datetime
from typing import Dict, List, Optional, Any

import httpx
from pydantic import BaseModel, Field

from .quality_control_agent import ValidationResult


class TestCase(BaseModel):
    """A single test case definition."""

    name: str
    description: str
    method: str = "GET"
    endpoint: str
    headers: Dict[str, str] = Field(default_factory=dict)
    body: Optional[Dict[str, Any]] = None
    expected_status: int = 200
    expected_content: Optional[str] = None
    timeout: int = 30


class TestResult(BaseModel):
    """Result from a test execution."""

    test_case: str
    success: bool
    status_code: Optional[int] = None
    response_time: float = 0.0
    error_message: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class DynamicTestAgent:
    """
    Dynamic test agent that performs functional and integration testing.

    Responsibilities:
    - API endpoint testing
    - Integration test execution
    - Performance validation
    - Functional test automation
    - Health check monitoring
    """

    def __init__(self, base_url: str = "http://localhost:8000"):
        """Initialize the dynamic test agent."""
        self.base_url = base_url.rstrip("/")
        self.timeout = 30
        self.session = None

        # Default test cases for common endpoints
        self.default_tests = [
            TestCase(
                name="health_check",
                description="Verify API health endpoint",
                endpoint="/health",
                expected_status=200,
            ),
            TestCase(
                name="api_docs",
                description="Verify API documentation is accessible",
                endpoint="/docs",
                expected_status=200,
            ),
            TestCase(
                name="openapi_spec",
                description="Verify OpenAPI specification is accessible",
                endpoint="/openapi.json",
                expected_status=200,
            ),
        ]

    async def run_dynamic_testing(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run dynamic tests based on configuration.

        Args:
            config: Test configuration including target, type, base_url, timeout

        Returns:
            Dictionary with test results and summary
        """
        try:
            # Initialize HTTP session
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                self.session = client

                # Update base URL if provided
                if config.get("base_url"):
                    self.base_url = config["base_url"].rstrip("/")

                # Update timeout if provided
                if config.get("timeout"):
                    self.timeout = config["timeout"]

                # Determine test type
                test_type = config.get("type", "all")
                target = config.get("target")

                # Run appropriate tests
                if test_type == "health":
                    results = await self._run_health_tests()
                elif test_type == "api":
                    results = await self._run_api_tests(target)
                elif test_type == "integration":
                    results = await self._run_integration_tests(target)
                else:  # all
                    results = await self._run_all_tests(target)

                return self._format_results(results)

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "summary": {"total": 0, "passed": 0, "failed": 0, "error_rate": 0.0},
            }

    async def _run_health_tests(self) -> List[TestResult]:
        """Run basic health check tests."""
        results = []

        health_test = TestCase(
            name="system_health",
            description="Verify system is running and healthy",
            endpoint="/health",
            expected_status=200,
        )

        result = await self._execute_test_case(health_test)
        results.append(result)

        return results

    async def _run_api_tests(self, target: Optional[str] = None) -> List[TestResult]:
        """Run API endpoint tests."""
        results = []

        # Run default tests
        for test_case in self.default_tests:
            result = await self._execute_test_case(test_case)
            results.append(result)

        # Add specific target tests if provided
        if target:
            custom_test = TestCase(
                name=f"custom_endpoint_{target}",
                description=f"Test custom endpoint: {target}",
                endpoint=target,
                expected_status=200,
            )
            result = await self._execute_test_case(custom_test)
            results.append(result)

        return results

    async def _run_integration_tests(
        self, target: Optional[str] = None
    ) -> List[TestResult]:
        """Run integration tests."""
        results = []

        # Integration test scenarios
        integration_tests = [
            TestCase(
                name="auth_flow",
                description="Test authentication flow",
                endpoint="/api/auth/status",
                expected_status=200,
            ),
            TestCase(
                name="organizations_list",
                description="Test organizations endpoint",
                endpoint="/api/organizations",
                expected_status=200,
            ),
            TestCase(
                name="recipes_list",
                description="Test recipes endpoint",
                endpoint="/api/recipes",
                expected_status=200,
            ),
        ]

        for test_case in integration_tests:
            result = await self._execute_test_case(test_case)
            results.append(result)

        return results

    async def _run_all_tests(self, target: Optional[str] = None) -> List[TestResult]:
        """Run all available tests."""
        results = []

        # Run health tests
        health_results = await self._run_health_tests()
        results.extend(health_results)

        # Run API tests
        api_results = await self._run_api_tests(target)
        results.extend(api_results)

        # Run integration tests
        integration_results = await self._run_integration_tests(target)
        results.extend(integration_results)

        return results

    async def _execute_test_case(self, test_case: TestCase) -> TestResult:
        """
        Execute a single test case.

        Args:
            test_case: Test case to execute

        Returns:
            Test result
        """
        start_time = time.time()

        try:
            # Prepare request
            url = f"{self.base_url}{test_case.endpoint}"
            method = test_case.method.upper()

            # Execute request
            if method == "GET":
                response = await self.session.get(url, headers=test_case.headers)
            elif method == "POST":
                response = await self.session.post(
                    url, json=test_case.body, headers=test_case.headers
                )
            elif method == "PUT":
                response = await self.session.put(
                    url, json=test_case.body, headers=test_case.headers
                )
            elif method == "DELETE":
                response = await self.session.delete(url, headers=test_case.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response_time = time.time() - start_time

            # Check if test passed
            success = response.status_code == test_case.expected_status

            # Check content if specified
            if test_case.expected_content and success:
                try:
                    response_text = response.text
                    success = test_case.expected_content in response_text
                except:
                    success = False

            # Parse response data
            try:
                response_data = response.json() if response.content else None
            except:
                response_data = None

            return TestResult(
                test_case=test_case.name,
                success=success,
                status_code=response.status_code,
                response_time=response_time,
                response_data=response_data,
            )

        except Exception as e:
            response_time = time.time() - start_time

            return TestResult(
                test_case=test_case.name,
                success=False,
                response_time=response_time,
                error_message=str(e),
            )

    def _format_results(self, results: List[TestResult]) -> Dict[str, Any]:
        """
        Format test results into a summary report.

        Args:
            results: List of test results

        Returns:
            Formatted results dictionary
        """
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.success)
        failed_tests = total_tests - passed_tests
        error_rate = (failed_tests / total_tests * 100) if total_tests > 0 else 0

        avg_response_time = (
            sum(r.response_time for r in results) / total_tests
            if total_tests > 0
            else 0
        )

        return {
            "success": failed_tests == 0,
            "results": [
                {
                    "name": r.test_case,
                    "success": r.success,
                    "status_code": r.status_code,
                    "response_time": round(r.response_time * 1000, 2),  # Convert to ms
                    "error": r.error_message,
                }
                for r in results
            ],
            "summary": {
                "total": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "error_rate": round(error_rate, 2),
                "avg_response_time": round(
                    avg_response_time * 1000, 2
                ),  # Convert to ms
            },
        }

    async def validate_api_endpoint(
        self, endpoint: str, method: str = "GET", expected_status: int = 200
    ) -> ValidationResult:
        """
        Validate a single API endpoint and return a ValidationResult.

        Args:
            endpoint: API endpoint to test
            method: HTTP method to use
            expected_status: Expected HTTP status code

        Returns:
            ValidationResult for integration with quality control
        """
        test_case = TestCase(
            name=f"validate_{endpoint.replace('/', '_')}",
            description=f"Validate {method} {endpoint}",
            method=method,
            endpoint=endpoint,
            expected_status=expected_status,
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                self.session = client
                result = await self._execute_test_case(test_case)

            if result.success:
                return ValidationResult(
                    agent_type="dynamic_test",
                    file_path=endpoint,
                    severity="info",
                    message=f"API endpoint {endpoint} is working correctly",
                    line_number=0,
                    rule_id="api_validation",
                    fix_suggestion="",
                    code_example=f"{method} {endpoint} -> {result.status_code}",
                )
            else:
                return ValidationResult(
                    agent_type="dynamic_test",
                    file_path=endpoint,
                    severity="error",
                    message=f"API endpoint {endpoint} failed validation",
                    line_number=0,
                    rule_id="api_validation_failure",
                    fix_suggestion=f"Check {method} {endpoint} implementation",
                    code_example=f"{method} {endpoint} -> {result.status_code or 'Connection failed'}",
                )

        except Exception as e:
            return ValidationResult(
                agent_type="dynamic_test",
                file_path=endpoint,
                severity="error",
                message=f"Dynamic test failed: {e}",
                line_number=0,
                rule_id="dynamic_test_error",
                fix_suggestion=f"Check API server is running and {endpoint} exists",
                code_example=str(e),
            )


# Helper function for easy agent instantiation
def create_dynamic_test_agent(
    base_url: str = "http://localhost:8000",
) -> DynamicTestAgent:
    """Create and return a configured DynamicTestAgent instance."""
    return DynamicTestAgent(base_url)
