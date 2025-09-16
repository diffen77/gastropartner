#!/usr/bin/env python3
"""
Web Validation Integration - Enhanced Quality Control with E2E Testing

Integrates Playwright-based E2E validation and multi-tenant security testing
with the existing quality control system. This creates a comprehensive
validation pipeline that covers code analysis AND live system validation.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

# Import local modules
import sys

sys.path.append(str(Path(__file__).parent))

from agents.e2e_validation_agent import E2EValidationAgent, run_e2e_validation
from agents.multi_tenant_ui_agent import (
    MultiTenantUIAgent,
    run_multi_tenant_security_validation,
)
from agents.ml_adaptation_agent import MLAdaptationAgent


@dataclass
class WebValidationResult:
    """Comprehensive web validation result."""

    timestamp: str
    e2e_results: Dict[str, Any]
    security_results: Dict[str, Any]
    integration_score: float
    overall_status: str
    recommendations: List[str]
    performance_metrics: Dict[str, float]
    security_score: float


class WebValidationOrchestrator:
    """
    Orchestrates comprehensive web validation including:
    - E2E functional testing
    - Multi-tenant security validation
    - Performance monitoring
    - Integration with existing quality control
    """

    def __init__(self):
        self.console = Console()
        self.logger = logging.getLogger(__name__)
        self.results_dir = Path("quality-control/web_validation_results")
        self.results_dir.mkdir(exist_ok=True)

        # Initialize agents
        self.e2e_agent = E2EValidationAgent()
        self.security_agent = MultiTenantUIAgent()

        # ML agent for learning
        self.ml_agent = None
        try:
            self.ml_agent = MLAdaptationAgent()
        except Exception as e:
            self.logger.warning(f"ML agent not available: {e}")

    async def run_comprehensive_web_validation(
        self,
        features: List[str] = None,
        security_focus: List[str] = None,
        include_performance: bool = True,
    ) -> WebValidationResult:
        """
        Run complete web validation pipeline.

        Args:
            features: Specific features to test (None = all)
            security_focus: Security areas to prioritize
            include_performance: Whether to include performance testing

        Returns:
            Comprehensive validation results
        """
        start_time = datetime.now()

        self.console.print(
            "[bold cyan]🌐 Starting Comprehensive Web Validation Pipeline[/bold cyan]"
        )

        # Display validation plan
        plan_text = Text()
        plan_text.append("🔍 E2E Functional Testing\n", style="green")
        plan_text.append("🛡️ Multi-Tenant Security Validation\n", style="red")
        if include_performance:
            plan_text.append("⚡ Performance Monitoring\n", style="yellow")
        plan_text.append("🧠 AI-Powered Analysis & Learning\n", style="blue")
        plan_text.append("📊 Integrated Quality Scoring\n", style="magenta")

        panel = Panel(plan_text, title="🚀 Validation Pipeline", border_style="cyan")
        self.console.print(panel)

        # Step 1: E2E Functional Testing
        self.console.print("\n[cyan]📋 Step 1: E2E Functional Testing[/cyan]")
        e2e_results = await run_e2e_validation(features)

        # Step 2: Multi-Tenant Security Validation
        self.console.print("\n[red]🛡️ Step 2: Multi-Tenant Security Validation[/red]")
        security_results = await run_multi_tenant_security_validation(security_focus)

        # Step 3: Performance Analysis (if enabled)
        performance_metrics = {}
        if include_performance:
            self.console.print("\n[yellow]⚡ Step 3: Performance Analysis[/yellow]")
            performance_metrics = await self._analyze_performance_metrics(
                e2e_results, security_results
            )

        # Step 4: Integration Analysis
        self.console.print("\n[blue]🔗 Step 4: Integration Analysis[/blue]")
        (
            integration_score,
            overall_status,
            recommendations,
        ) = await self._analyze_integration_results(
            e2e_results, security_results, performance_metrics
        )

        # Step 5: Calculate Security Score
        security_score = self._calculate_security_score(security_results)

        # Create comprehensive result
        result = WebValidationResult(
            timestamp=datetime.now().isoformat(),
            e2e_results=e2e_results,
            security_results=security_results,
            integration_score=integration_score,
            overall_status=overall_status,
            recommendations=recommendations,
            performance_metrics=performance_metrics,
            security_score=security_score,
        )

        # Step 6: Generate Report and Learn
        await self._generate_comprehensive_report(result)

        if self.ml_agent:
            await self._record_web_validation_learning(result)

        # Display final summary
        duration = (datetime.now() - start_time).total_seconds()
        self._display_validation_summary(result, duration)

        return result

    async def _analyze_performance_metrics(
        self, e2e_results: Dict, security_results: Dict
    ) -> Dict[str, float]:
        """Analyze performance metrics from E2E and security tests."""
        metrics = {}

        try:
            # Extract performance data from E2E tests
            if e2e_results.get("results"):
                durations = []
                for result in e2e_results["results"]:
                    if hasattr(result, "duration"):
                        durations.append(result.duration)
                    elif hasattr(result, "performance_metrics"):
                        perf_metrics = result.performance_metrics
                        if isinstance(perf_metrics, dict):
                            for key, value in perf_metrics.items():
                                if isinstance(value, (int, float)):
                                    metrics[f"e2e_{key}"] = value

                if durations:
                    metrics["e2e_average_duration"] = sum(durations) / len(durations)
                    metrics["e2e_max_duration"] = max(durations)
                    metrics["e2e_min_duration"] = min(durations)

            # Extract performance data from security tests
            if security_results.get("detailed_results"):
                security_durations = []
                for result in security_results["detailed_results"]:
                    if hasattr(result, "duration"):
                        security_durations.append(result.duration)
                    elif hasattr(result, "performance_impact"):
                        perf_impact = result.performance_impact
                        if isinstance(perf_impact, dict):
                            for key, value in perf_impact.items():
                                if isinstance(value, (int, float)):
                                    metrics[f"security_{key}"] = value

                if security_durations:
                    metrics["security_average_duration"] = sum(
                        security_durations
                    ) / len(security_durations)

            # Calculate overall performance score
            total_duration = e2e_results.get("total_duration", 0) + sum(
                getattr(r, "duration", 0)
                for r in security_results.get("detailed_results", [])
            )
            metrics["total_validation_duration"] = total_duration

            # Performance score (lower is better, normalize to 0-1)
            if total_duration > 0:
                # Good performance: < 60s = 1.0, > 300s = 0.0
                performance_score = max(0, min(1, (300 - total_duration) / 240))
                metrics["performance_score"] = performance_score

        except Exception as e:
            self.logger.error(f"Performance analysis failed: {e}")
            metrics["performance_analysis_error"] = str(e)

        return metrics

    async def _analyze_integration_results(
        self, e2e_results: Dict, security_results: Dict, performance_metrics: Dict
    ) -> tuple[float, str, List[str]]:
        """Analyze integration between different validation results."""
        recommendations = []

        # E2E success rate
        e2e_success_rate = 0
        if e2e_results.get("total_tests", 0) > 0:
            e2e_success_rate = (
                e2e_results.get("passed_tests", 0) / e2e_results["total_tests"]
            )

        # Security success rate
        security_success_rate = 0
        if security_results.get("tests_run", 0) > 0:
            security_success_rate = (
                security_results.get("tests_passed", 0) / security_results["tests_run"]
            )

        # Critical security issues
        critical_security = security_results.get("critical_violations", 0)
        high_risk_security = security_results.get("high_risk_violations", 0)

        # Calculate integration score (0-1)
        integration_score = (
            e2e_success_rate * 0.4  # E2E functional testing weight
            + security_success_rate * 0.4  # Security testing weight
            + (1.0 if critical_security == 0 else 0.0) * 0.2  # Critical security weight
        )

        # Determine overall status
        if critical_security > 0:
            overall_status = "CRITICAL - System Unsafe for Production"
            recommendations.extend(
                [
                    f"🚨 IMMEDIATE: Fix {critical_security} critical security violations",
                    "🛑 Block production deployment until security issues resolved",
                    "🔍 Conduct security audit of all multi-tenant data access",
                ]
            )
        elif high_risk_security > 0 or e2e_success_rate < 0.8:
            overall_status = "HIGH RISK - Action Required"
            recommendations.extend(
                [
                    f"⚠️ Fix {high_risk_security} high-risk security issues",
                    f"🔧 Improve E2E test success rate from {e2e_success_rate:.1%}",
                    "📋 Review and strengthen quality control processes",
                ]
            )
        elif e2e_success_rate < 0.95 or security_success_rate < 0.95:
            overall_status = "MODERATE RISK - Improvements Needed"
            recommendations.extend(
                [
                    "🔧 Investigate and fix failing E2E tests",
                    "🛡️ Strengthen security testing coverage",
                    "📈 Aim for >95% success rate across all tests",
                ]
            )
        else:
            overall_status = "ACCEPTABLE - Continue Monitoring"
            recommendations.extend(
                [
                    "✅ System performing well across all validation areas",
                    "📊 Continue regular validation monitoring",
                    "🚀 Consider expanding test coverage for new features",
                ]
            )

        # Performance recommendations
        performance_score = performance_metrics.get("performance_score", 1.0)
        if performance_score < 0.7:
            recommendations.append(
                "⚡ Optimize system performance - validation taking too long"
            )

        # Integration-specific recommendations
        if e2e_success_rate > 0.9 and security_success_rate < 0.8:
            recommendations.append(
                "🛡️ Focus on security improvements - functionality is solid"
            )
        elif security_success_rate > 0.9 and e2e_success_rate < 0.8:
            recommendations.append(
                "🔧 Focus on functional improvements - security is solid"
            )

        return integration_score, overall_status, recommendations

    def _calculate_security_score(self, security_results: Dict) -> float:
        """Calculate overall security score (0-1, 1 = perfect security)."""
        critical_violations = security_results.get("critical_violations", 0)
        high_violations = security_results.get("high_risk_violations", 0)
        medium_violations = (
            security_results.get("total_violations", 0)
            - critical_violations
            - high_violations
        )

        # Security score calculation
        if critical_violations > 0:
            return 0.0  # Any critical violation = 0 security score

        # Deduct points for violations
        score = 1.0
        score -= high_violations * 0.2  # High violations: -20% each
        score -= medium_violations * 0.05  # Medium violations: -5% each

        return max(0.0, score)

    async def _generate_comprehensive_report(self, result: WebValidationResult):
        """Generate comprehensive validation report."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.results_dir / f"comprehensive_validation_{timestamp}.json"

        # Save detailed JSON report
        with open(report_path, "w") as f:
            json.dump(asdict(result), f, indent=2, default=str)

        # Generate human-readable summary
        summary_path = self.results_dir / f"validation_summary_{timestamp}.md"

        with open(summary_path, "w") as f:
            f.write(f"# Web Validation Report - {timestamp}\n\n")
            f.write("## Overall Assessment\n")
            f.write(f"- **Status**: {result.overall_status}\n")
            f.write(f"- **Integration Score**: {result.integration_score:.1%}\n")
            f.write(f"- **Security Score**: {result.security_score:.1%}\n\n")

            f.write("## E2E Testing Results\n")
            f.write(f"- Tests Run: {result.e2e_results.get('total_tests', 0)}\n")
            f.write(f"- Tests Passed: {result.e2e_results.get('passed_tests', 0)}\n")
            f.write(
                f"- Success Rate: {result.e2e_results.get('passed_tests', 0) / max(1, result.e2e_results.get('total_tests', 1)):.1%}\n\n"
            )

            f.write("## Security Testing Results\n")
            f.write(
                f"- Security Tests: {result.security_results.get('tests_run', 0)}\n"
            )
            f.write(
                f"- Critical Violations: {result.security_results.get('critical_violations', 0)}\n"
            )
            f.write(
                f"- High Risk Violations: {result.security_results.get('high_risk_violations', 0)}\n"
            )
            f.write(
                f"- Total Violations: {result.security_results.get('total_violations', 0)}\n\n"
            )

            f.write("## Performance Metrics\n")
            for key, value in result.performance_metrics.items():
                f.write(f"- {key.replace('_', ' ').title()}: {value}\n")
            f.write("\n")

            f.write("## Recommendations\n")
            for i, rec in enumerate(result.recommendations, 1):
                f.write(f"{i}. {rec}\n")

        self.console.print(f"[blue]📊 Comprehensive report saved: {report_path}[/blue]")
        self.console.print(f"[blue]📋 Summary report saved: {summary_path}[/blue]")

    def _display_validation_summary(self, result: WebValidationResult, duration: float):
        """Display comprehensive validation summary."""

        # Main results table
        table = Table(title="🌐 Comprehensive Web Validation Results")
        table.add_column("Category", style="bold")
        table.add_column("Status", justify="center")
        table.add_column("Details", style="dim")

        # Overall status
        status_color = {
            "CRITICAL": "red",
            "HIGH RISK": "red",
            "MODERATE RISK": "yellow",
            "ACCEPTABLE": "green",
        }.get(result.overall_status.split(" -")[0], "white")

        table.add_row(
            "Overall Status",
            f"[{status_color}]{result.overall_status}[/{status_color}]",
            f"Integration Score: {result.integration_score:.1%}",
        )

        # E2E Results
        e2e_success_rate = result.e2e_results.get("passed_tests", 0) / max(
            1, result.e2e_results.get("total_tests", 1)
        )
        e2e_color = (
            "green"
            if e2e_success_rate >= 0.95
            else "yellow"
            if e2e_success_rate >= 0.8
            else "red"
        )
        table.add_row(
            "E2E Testing",
            f"[{e2e_color}]{e2e_success_rate:.1%} Success[/{e2e_color}]",
            f"{result.e2e_results.get('passed_tests', 0)}/{result.e2e_results.get('total_tests', 0)} passed",
        )

        # Security Results
        security_color = (
            "red"
            if result.security_results.get("critical_violations", 0) > 0
            else "yellow"
            if result.security_results.get("high_risk_violations", 0) > 0
            else "green"
        )
        table.add_row(
            "Security",
            f"[{security_color}]Score: {result.security_score:.1%}[/{security_color}]",
            f"Critical: {result.security_results.get('critical_violations', 0)}, "
            f"High: {result.security_results.get('high_risk_violations', 0)}",
        )

        # Performance
        perf_score = result.performance_metrics.get("performance_score", 1.0)
        perf_color = (
            "green" if perf_score >= 0.8 else "yellow" if perf_score >= 0.6 else "red"
        )
        table.add_row(
            "Performance",
            f"[{perf_color}]{perf_score:.1%}[/{perf_color}]",
            f"Duration: {duration:.1f}s",
        )

        self.console.print(table)

        # Recommendations
        if result.recommendations:
            self.console.print("\n[bold]💡 Key Recommendations:[/bold]")
            for i, rec in enumerate(result.recommendations[:5], 1):  # Top 5
                self.console.print(f"{i}. {rec}")

        # Final status message
        if "CRITICAL" in result.overall_status:
            self.console.print(
                "\n[bold red]🚨 CRITICAL ISSUES DETECTED - IMMEDIATE ACTION REQUIRED[/bold red]"
            )
        elif "HIGH RISK" in result.overall_status:
            self.console.print(
                "\n[bold yellow]⚠️ High risk issues detected - review and fix needed[/bold yellow]"
            )
        else:
            self.console.print(
                "\n[bold green]✅ Web validation completed successfully[/bold green]"
            )

    async def _record_web_validation_learning(self, result: WebValidationResult):
        """Record comprehensive validation results for ML learning."""
        if not self.ml_agent:
            return

        try:
            learning_data = {
                "validation_type": "comprehensive_web_validation",
                "timestamp": result.timestamp,
                "integration_metrics": {
                    "integration_score": result.integration_score,
                    "security_score": result.security_score,
                    "overall_status": result.overall_status,
                },
                "component_performance": {
                    "e2e_success_rate": result.e2e_results.get("passed_tests", 0)
                    / max(1, result.e2e_results.get("total_tests", 1)),
                    "security_success_rate": result.security_results.get(
                        "tests_passed", 0
                    )
                    / max(1, result.security_results.get("tests_run", 1)),
                    "critical_violations": result.security_results.get(
                        "critical_violations", 0
                    ),
                    "total_violations": result.security_results.get(
                        "total_violations", 0
                    ),
                },
                "performance_data": result.performance_metrics,
                "recommendations_count": len(result.recommendations),
            }

            await self.ml_agent.record_validation_data(
                "web_validation", learning_data, "integrated_validation"
            )

        except Exception as e:
            self.logger.warning(f"Failed to record web validation learning: {e}")


# CLI Integration
async def run_comprehensive_web_validation_cli(
    features: List[str] = None,
    security_focus: List[str] = None,
    performance: bool = True,
) -> Dict[str, Any]:
    """
    CLI entry point for comprehensive web validation.

    Usage examples:
    - Full validation: await run_comprehensive_web_validation_cli()
    - Feature focus: await run_comprehensive_web_validation_cli(['recipes', 'menu_items'])
    - Security focus: await run_comprehensive_web_validation_cli(security_focus=['data_isolation'])
    """
    orchestrator = WebValidationOrchestrator()
    result = await orchestrator.run_comprehensive_web_validation(
        features=features,
        security_focus=security_focus,
        include_performance=performance,
    )

    return {
        "success": "ACCEPTABLE" in result.overall_status
        or "MODERATE" in result.overall_status,
        "overall_status": result.overall_status,
        "integration_score": result.integration_score,
        "security_score": result.security_score,
        "e2e_success_rate": result.e2e_results.get("passed_tests", 0)
        / max(1, result.e2e_results.get("total_tests", 1)),
        "critical_violations": result.security_results.get("critical_violations", 0),
        "recommendations": result.recommendations,
        "detailed_result": result,
    }


if __name__ == "__main__":
    # Direct execution
    async def main():
        console = Console()
        console.print("[bold cyan]🚀 Starting Comprehensive Web Validation[/bold cyan]")

        result = await run_comprehensive_web_validation_cli()

        if result["success"]:
            console.print("[green]✅ Web validation completed successfully[/green]")
        else:
            console.print(
                "[red]❌ Web validation found issues requiring attention[/red]"
            )

        console.print(f"Integration Score: {result['integration_score']:.1%}")
        console.print(f"Security Score: {result['security_score']:.1%}")
        console.print(f"Status: {result['overall_status']}")

    asyncio.run(main())
