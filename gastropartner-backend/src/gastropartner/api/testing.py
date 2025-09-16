"""
Testing API endpoints for viewing and running test results.
"""

import json
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from gastropartner.core.auth import get_current_active_user
from gastropartner.core.models import User
from gastropartner.utils.logger import dev_logger

router = APIRouter(prefix="/api/v1/testing", tags=["testing"])


class TestResult(BaseModel):
    """Individual test result."""

    id: str
    name: str
    status: str  # 'passed', 'failed', 'skipped', 'running'
    duration: float
    className: str | None = None
    errorMessage: str | None = None
    output: str | None = None
    timestamp: str


class TestSuite(BaseModel):
    """Test suite results."""

    name: str
    totalTests: int
    passed: int
    failed: int
    skipped: int
    duration: float
    timestamp: str
    tests: list[TestResult]


class TestRunRequest(BaseModel):
    """Request to run tests."""

    type: str  # 'backend', 'frontend', 'all'
    options: dict[str, str] | None = None


class TestingService:
    """Service for managing test execution and results."""

    def __init__(self):
        try:
            self.project_root = Path(__file__).parent.parent.parent.parent.parent
            self.backend_root = self.project_root / "gastropartner-backend"
            self.frontend_root = self.project_root / "gastropartner-frontend"
            self.reports_dir = self.backend_root / "reports"
            # Ensure reports directory exists
            self.reports_dir.mkdir(parents=True, exist_ok=True)
            (self.reports_dir / "junit").mkdir(exist_ok=True)
        except Exception as e:
            dev_logger.error_print(f"Error initializing TestingService: {e}")
            # Fallback paths
            self.backend_root = Path.cwd()
            self.reports_dir = self.backend_root / "reports"
            self.reports_dir.mkdir(parents=True, exist_ok=True)
            (self.reports_dir / "junit").mkdir(exist_ok=True)

    def parse_junit_xml(self, xml_path: Path) -> TestSuite | None:
        """Parse JUnit XML test results."""
        if not xml_path.exists():
            return None

        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()

            # Find the testsuite element
            testsuite = root.find(".//testsuite")
            if testsuite is None:
                return None

            # Extract suite information
            suite_name = testsuite.get("name", "pytest")
            total_tests = int(testsuite.get("tests", 0))
            failures = int(testsuite.get("failures", 0))
            errors = int(testsuite.get("errors", 0))
            skipped = int(testsuite.get("skipped", 0))
            duration = float(testsuite.get("time", 0))
            timestamp = testsuite.get("timestamp", datetime.now().isoformat())

            passed = total_tests - failures - errors - skipped

            # Parse individual test cases
            tests = []
            for testcase in testsuite.findall("testcase"):
                test_name = testcase.get("name", "unknown")
                class_name = testcase.get("classname", "")
                test_duration = float(testcase.get("time", 0))

                # Determine test status
                status = "passed"
                error_message = None
                output = None

                failure = testcase.find("failure")
                error = testcase.find("error")
                skipped_elem = testcase.find("skipped")

                if failure is not None:
                    status = "failed"
                    error_message = failure.get("message", "")
                    if failure.text:
                        error_message += f"\n{failure.text}"
                elif error is not None:
                    status = "failed"
                    error_message = error.get("message", "")
                    if error.text:
                        error_message += f"\n{error.text}"
                elif skipped_elem is not None:
                    status = "skipped"
                    error_message = skipped_elem.get("message", "Test skipped")

                # Get system output
                system_out = testcase.find("system-out")
                system_err = testcase.find("system-err")

                if system_out is not None and system_out.text:
                    output = system_out.text.strip()
                elif system_err is not None and system_err.text:
                    output = system_err.text.strip()

                test_id = f"{class_name}.{test_name}".strip(".")

                tests.append(
                    TestResult(
                        id=test_id,
                        name=test_name,
                        status=status,
                        duration=test_duration,
                        className=class_name if class_name else None,
                        errorMessage=error_message,
                        output=output,
                        timestamp=timestamp,
                    )
                )

            return TestSuite(
                name=suite_name,
                totalTests=total_tests,
                passed=passed,
                failed=failures + errors,
                skipped=skipped,
                duration=duration,
                timestamp=timestamp,
                tests=tests,
            )

        except Exception as e:
            dev_logger.error_print(f"Error parsing JUnit XML: {e}")
            return None

    def parse_coverage_json(self, coverage_path: Path) -> float | None:
        """Parse coverage percentage from coverage.json."""
        if not coverage_path.exists():
            return None

        try:
            with open(coverage_path) as f:
                coverage_data = json.load(f)

            totals = coverage_data.get("totals", {})
            percent_covered = totals.get("percent_covered", 0)
            return float(percent_covered)

        except Exception as e:
            dev_logger.error_print(f"Error parsing coverage data: {e}")
            return None

    async def get_backend_results(self) -> TestSuite | None:
        """Get backend test results from JUnit XML."""
        junit_path = self.reports_dir / "junit" / "pytest.xml"
        coverage_path = self.reports_dir / "coverage.json"

        test_suite = self.parse_junit_xml(junit_path)
        if test_suite:
            # Add coverage information if available
            coverage = self.parse_coverage_json(coverage_path)
            if coverage is not None:
                # Store coverage in a way that can be accessed by the API
                test_suite.coverage = coverage

        return test_suite

    async def get_frontend_results(self) -> TestSuite | None:
        """Get frontend test results (placeholder for now)."""
        # For now, return None as frontend tests don't generate structured output
        # This could be enhanced to parse Jest output in the future
        return None

    async def run_backend_tests(self) -> bool:
        """Run backend tests using pytest."""
        try:
            # Ensure reports directory exists
            self.reports_dir.mkdir(parents=True, exist_ok=True)
            (self.reports_dir / "junit").mkdir(exist_ok=True)

            # Run pytest with reporting
            result = subprocess.run(
                [
                    "uv",
                    "run",
                    "pytest",
                    "--junit-xml=reports/junit/pytest.xml",
                    "--cov=src/gastropartner",
                    "--cov-report=json:reports/coverage.json",
                    "--cov-report=xml:reports/coverage.xml",
                    "--cov-report=html:reports/htmlcov",
                    "--no-cov-on-fail",
                ],
                cwd=self.backend_root,
                capture_output=True,
                text=True,
            )

            # Log subprocess result for debugging
            dev_logger.info_print(f"Backend tests completed with exit code: {result.returncode}")
            if result.stdout:
                dev_logger.debug_print(f"Test stdout: {result.stdout}")
            if result.stderr:
                dev_logger.debug_print(f"Test stderr: {result.stderr}")

            # Return True even if tests failed (we want the results)
            return True

        except Exception as e:
            dev_logger.error_print(f"Error running backend tests: {e}")
            return False

    async def run_frontend_tests(self) -> bool:
        """Run frontend tests using npm test."""
        try:
            result = subprocess.run(
                ["npm", "test", "--", "--watchAll=false", "--coverage"],
                cwd=self.frontend_root,
                capture_output=True,
                text=True,
            )

            # Log subprocess result for debugging
            dev_logger.info_print(f"Frontend tests completed with exit code: {result.returncode}")
            if result.stdout:
                dev_logger.debug_print(f"Test stdout: {result.stdout}")
            if result.stderr:
                dev_logger.debug_print(f"Test stderr: {result.stderr}")

            return True

        except Exception as e:
            dev_logger.error_print(f"Error running frontend tests: {e}")
            return False


# Create service instance
testing_service = TestingService()


@router.get("/results/backend", response_model=Optional[TestSuite])
async def get_backend_test_results(
    current_user: User = Depends(get_current_active_user),
):
    """Get backend test results from latest run."""
    results = await testing_service.get_backend_results()
    if results is None:
        raise HTTPException(
            status_code=404, detail="No backend test results found. Run tests first."
        )

    # Add coverage if available
    coverage = testing_service.parse_coverage_json(testing_service.reports_dir / "coverage.json")
    if coverage is not None:
        # Add coverage to the response by modifying the dict
        results_dict = results.dict()
        results_dict["coverage"] = coverage
        return results_dict

    return results


@router.get("/results/frontend", response_model=Optional[TestSuite])
async def get_frontend_test_results(
    current_user: User = Depends(get_current_active_user),
):
    """Get frontend test results from latest run."""
    results = await testing_service.get_frontend_results()
    if results is None:
        raise HTTPException(status_code=404, detail="Frontend test results not available yet.")
    return results


@router.post("/run/{test_type}")
async def run_tests(
    test_type: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
):
    """Run tests of specified type."""
    if test_type not in ["backend", "frontend", "all"]:
        raise HTTPException(
            status_code=400, detail="test_type must be 'backend', 'frontend', or 'all'"
        )

    async def run_tests_background():
        if test_type in ["backend", "all"]:
            await testing_service.run_backend_tests()

        if test_type in ["frontend", "all"]:
            await testing_service.run_frontend_tests()

    background_tasks.add_task(run_tests_background)

    return {"message": f"Started running {test_type} tests", "status": "running"}


@router.get("/status")
async def get_testing_status(
    current_user: User = Depends(get_current_active_user),
):
    """Get current testing system status."""
    backend_results = await testing_service.get_backend_results()
    frontend_results = await testing_service.get_frontend_results()

    status = {
        "backend": {
            "available": backend_results is not None,
            "lastRun": backend_results.timestamp if backend_results else None,
            "summary": {
                "total": backend_results.totalTests if backend_results else 0,
                "passed": backend_results.passed if backend_results else 0,
                "failed": backend_results.failed if backend_results else 0,
                "skipped": backend_results.skipped if backend_results else 0,
            }
            if backend_results
            else None,
        },
        "frontend": {
            "available": frontend_results is not None,
            "lastRun": frontend_results.timestamp if frontend_results else None,
            "summary": {
                "total": frontend_results.totalTests if frontend_results else 0,
                "passed": frontend_results.passed if frontend_results else 0,
                "failed": frontend_results.failed if frontend_results else 0,
                "skipped": frontend_results.skipped if frontend_results else 0,
            }
            if frontend_results
            else None,
        },
    }

    return status
