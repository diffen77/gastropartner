#!/usr/bin/env python3
"""
Enhanced test runner that always generates reports, even when tests fail.
Provides structured output and ensures reports are available for CI/CD.
"""

import subprocess
import sys
from pathlib import Path
import os


def ensure_reports_dir():
    """Ensure reports directory structure exists."""
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    (reports_dir / "junit").mkdir(exist_ok=True)
    (reports_dir / "htmlcov").mkdir(exist_ok=True)
    print(f"✓ Reports directory structure created: {reports_dir.absolute()}")


def run_tests_with_reports():
    """
    Run tests with comprehensive reporting.
    Always generates reports regardless of test outcomes.
    """
    ensure_reports_dir()
    
    # Base pytest command with comprehensive reporting
    cmd = [
        "uv", "run", "pytest",
        "--verbose",
        "--tb=short",  # Shorter traceback format
        # JUnit XML for CI/CD integration
        "--junit-xml=reports/junit/pytest.xml",
        "--junit-prefix=gastropartner",
        # Coverage reporting
        "--cov=src/gastropartner",
        "--cov-report=html:reports/htmlcov",
        "--cov-report=xml:reports/coverage.xml",
        "--cov-report=json:reports/coverage.json",
        "--cov-report=term-missing",
        # Continue even if tests fail to ensure reports are generated
        "--continue-on-collection-errors",
        # Additional test output options
        "--tb=line",  # Line-level tracebacks
    ]
    
    # Add any command line arguments passed to this script
    cmd.extend(sys.argv[1:])
    
    print("🧪 Running tests with comprehensive reporting...")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 60)
    
    try:
        # Run pytest - capture both stdout and stderr
        result = subprocess.run(cmd, capture_output=False, text=True)
        exit_code = result.returncode
        
        print("-" * 60)
        
        # Always show report locations
        reports_dir = Path("reports")
        if reports_dir.exists():
            print("📊 Generated Reports:")
            
            # JUnit XML
            junit_file = reports_dir / "junit" / "pytest.xml"
            if junit_file.exists():
                print(f"  • JUnit XML: {junit_file}")
                
            # HTML Coverage
            html_index = reports_dir / "htmlcov" / "index.html"
            if html_index.exists():
                print(f"  • HTML Coverage: {html_index}")
                print(f"    Open in browser: file://{html_index.absolute()}")
                
            # XML Coverage  
            xml_cov = reports_dir / "coverage.xml"
            if xml_cov.exists():
                print(f"  • XML Coverage: {xml_cov}")
                
            # JSON Coverage
            json_cov = reports_dir / "coverage.json"
            if json_cov.exists():
                print(f"  • JSON Coverage: {json_cov}")
        
        # Report test outcome
        if exit_code == 0:
            print("✅ All tests passed!")
        else:
            print(f"❌ Tests failed (exit code: {exit_code})")
            print("📝 Reports have been generated despite test failures.")
            
        return exit_code
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 130
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return 1


if __name__ == "__main__":
    exit_code = run_tests_with_reports()
    sys.exit(exit_code)