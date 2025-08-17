#!/usr/bin/env python3
"""
Advanced synthetic tests for GastroPartner API.

This script provides more sophisticated testing capabilities for the synthetic monitoring workflow.
"""

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx


class SyntheticTester:
    """Advanced synthetic testing client."""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = httpx.AsyncClient(timeout=30.0)
        self.results: List[Dict[str, Any]] = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.aclose()
    
    async def test_health_endpoints(self) -> Dict[str, Any]:
        """Test all health check endpoints."""
        tests = []
        
        endpoints = [
            ("/health/", "basic_health"),
            ("/health/detailed", "detailed_health"),
            ("/health/readiness", "readiness_probe"),
            ("/health/liveness", "liveness_probe"),
            ("/health/metrics", "system_metrics"),
            ("/health/status", "status_page")
        ]
        
        for endpoint, test_name in endpoints:
            start_time = time.time()
            try:
                response = await self.session.get(f"{self.base_url}{endpoint}")
                duration = (time.time() - start_time) * 1000
                
                test_result = {
                    "test": test_name,
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "duration_ms": round(duration, 2),
                    "success": response.status_code < 400,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        test_result["response_data"] = data
                        
                        # Additional validation for specific endpoints
                        if test_name == "detailed_health":
                            test_result["services_count"] = len(data.get("services", []))
                            test_result["overall_status"] = data.get("status")
                        elif test_name == "system_metrics":
                            test_result["uptime"] = data.get("uptime_seconds")
                            test_result["memory_mb"] = data.get("metrics", {}).get("memory", {}).get("used_mb")
                    except Exception as e:
                        test_result["parse_error"] = str(e)
                
                tests.append(test_result)
                
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                tests.append({
                    "test": test_name,
                    "endpoint": endpoint,
                    "success": False,
                    "error": str(e),
                    "duration_ms": round(duration, 2),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        return {
            "test_suite": "health_endpoints",
            "total_tests": len(tests),
            "passed": sum(1 for t in tests if t["success"]),
            "failed": sum(1 for t in tests if not t["success"]),
            "tests": tests
        }
    
    async def test_api_endpoints(self) -> Dict[str, Any]:
        """Test critical API endpoints."""
        tests = []
        
        # Test public endpoints that don't require authentication
        endpoints = [
            ("/", "GET", "root_endpoint"),
            ("/docs", "GET", "api_documentation"),
            ("/openapi.json", "GET", "openapi_schema"),
        ]
        
        for endpoint, method, test_name in endpoints:
            start_time = time.time()
            try:
                if method == "GET":
                    response = await self.session.get(f"{self.base_url}{endpoint}")
                else:
                    response = await self.session.request(method, f"{self.base_url}{endpoint}")
                
                duration = (time.time() - start_time) * 1000
                
                test_result = {
                    "test": test_name,
                    "endpoint": endpoint,
                    "method": method,
                    "status_code": response.status_code,
                    "duration_ms": round(duration, 2),
                    "success": response.status_code < 400,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                # Validate content for specific endpoints
                if test_name == "openapi_schema" and response.status_code == 200:
                    try:
                        schema = response.json()
                        test_result["openapi_version"] = schema.get("openapi")
                        test_result["paths_count"] = len(schema.get("paths", {}))
                    except Exception as e:
                        test_result["validation_error"] = str(e)
                
                tests.append(test_result)
                
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                tests.append({
                    "test": test_name,
                    "endpoint": endpoint,
                    "method": method,
                    "success": False,
                    "error": str(e),
                    "duration_ms": round(duration, 2),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        return {
            "test_suite": "api_endpoints",
            "total_tests": len(tests),
            "passed": sum(1 for t in tests if t["success"]),
            "failed": sum(1 for t in tests if not t["success"]),
            "tests": tests
        }
    
    async def test_synthetic_endpoints(self) -> Dict[str, Any]:
        """Test synthetic monitoring endpoints."""
        if not self.api_key:
            return {
                "test_suite": "synthetic_endpoints",
                "skipped": True,
                "reason": "No API key provided"
            }
        
        tests = []
        test_types = ["auth_flow", "database_crud", "api_endpoints"]
        
        for test_type in test_types:
            start_time = time.time()
            try:
                response = await self.session.post(
                    f"{self.base_url}/health/synthetic/test",
                    params={"test_type": test_type, "api_key": self.api_key}
                )
                duration = (time.time() - start_time) * 1000
                
                test_result = {
                    "test": f"synthetic_{test_type}",
                    "status_code": response.status_code,
                    "duration_ms": round(duration, 2),
                    "success": response.status_code == 200,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        test_result["synthetic_result"] = data
                    except Exception as e:
                        test_result["parse_error"] = str(e)
                
                tests.append(test_result)
                
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                tests.append({
                    "test": f"synthetic_{test_type}",
                    "success": False,
                    "error": str(e),
                    "duration_ms": round(duration, 2),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        return {
            "test_suite": "synthetic_endpoints",
            "total_tests": len(tests),
            "passed": sum(1 for t in tests if t["success"]),
            "failed": sum(1 for t in tests if not t["success"]),
            "tests": tests
        }
    
    async def test_performance_thresholds(self) -> Dict[str, Any]:
        """Test performance thresholds."""
        tests = []
        
        # Performance test endpoints with thresholds
        endpoints = [
            ("/health/", 200, "basic_health_performance"),
            ("/health/detailed", 1000, "detailed_health_performance"),
            ("/", 500, "root_endpoint_performance"),
        ]
        
        for endpoint, threshold_ms, test_name in endpoints:
            start_time = time.time()
            try:
                response = await self.session.get(f"{self.base_url}{endpoint}")
                duration = (time.time() - start_time) * 1000
                
                meets_threshold = duration <= threshold_ms
                
                test_result = {
                    "test": test_name,
                    "endpoint": endpoint,
                    "duration_ms": round(duration, 2),
                    "threshold_ms": threshold_ms,
                    "meets_threshold": meets_threshold,
                    "success": response.status_code == 200 and meets_threshold,
                    "status_code": response.status_code,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                tests.append(test_result)
                
            except Exception as e:
                tests.append({
                    "test": test_name,
                    "endpoint": endpoint,
                    "threshold_ms": threshold_ms,
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        return {
            "test_suite": "performance_thresholds",
            "total_tests": len(tests),
            "passed": sum(1 for t in tests if t["success"]),
            "failed": sum(1 for t in tests if not t["success"]),
            "tests": tests
        }
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all synthetic tests."""
        start_time = time.time()
        
        test_suites = await asyncio.gather(
            self.test_health_endpoints(),
            self.test_api_endpoints(),
            self.test_synthetic_endpoints(),
            self.test_performance_thresholds(),
            return_exceptions=True
        )
        
        total_duration = (time.time() - start_time) * 1000
        
        # Process results
        results = []
        total_tests = 0
        total_passed = 0
        total_failed = 0
        
        for suite in test_suites:
            if isinstance(suite, Exception):
                results.append({
                    "test_suite": "unknown",
                    "error": str(suite),
                    "total_tests": 0,
                    "passed": 0,
                    "failed": 1
                })
                total_failed += 1
            else:
                results.append(suite)
                total_tests += suite.get("total_tests", 0)
                total_passed += suite.get("passed", 0)
                total_failed += suite.get("failed", 0)
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "base_url": self.base_url,
            "total_duration_ms": round(total_duration, 2),
            "summary": {
                "total_tests": total_tests,
                "passed": total_passed,
                "failed": total_failed,
                "success_rate": round((total_passed / total_tests * 100) if total_tests > 0 else 0, 2)
            },
            "test_suites": results
        }


async def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Run synthetic tests for GastroPartner API")
    parser.add_argument("base_url", help="Base URL of the API to test")
    parser.add_argument("--api-key", help="API key for synthetic testing endpoints")
    parser.add_argument("--output", help="Output file for results (JSON format)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    async with SyntheticTester(args.base_url, args.api_key) as tester:
        if args.verbose:
            print(f"🔍 Running synthetic tests against {args.base_url}")
        
        results = await tester.run_all_tests()
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            if args.verbose:
                print(f"📄 Results saved to {args.output}")
        else:
            print(json.dumps(results, indent=2))
        
        # Print summary
        summary = results["summary"]
        if args.verbose:
            print(f"\n📊 Test Summary:")
            print(f"   Total tests: {summary['total_tests']}")
            print(f"   Passed: {summary['passed']}")
            print(f"   Failed: {summary['failed']}")
            print(f"   Success rate: {summary['success_rate']}%")
            print(f"   Duration: {results['total_duration_ms']}ms")
        
        # Exit with error code if tests failed
        if summary["failed"] > 0:
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())