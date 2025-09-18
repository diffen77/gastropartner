#!/usr/bin/env python3
"""
Quality Control System - Main Entry Point

Automated quality control system for GastroPartner using PydanticAI agents.
"""

import asyncio
import argparse
import signal
import sys
from pathlib import Path
from typing import List

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

# Load environment variables
from dotenv import load_dotenv

load_dotenv()


# Add the quality-control directory to Python path
quality_control_dir = Path(__file__).parent
sys.path.insert(0, str(quality_control_dir))

from agents.quality_control_agent import QualityControlAgent
from agents.ml_adaptation_agent import MLAdaptationAgent
from agents.dynamic_test_agent import DynamicTestAgent
from watchers.file_monitor import FileMonitor
from watchers.change_detector import ChangeDetector

# from ml_integration import MLQualityIntegration
# from continuous_learning import ContinuousLearningSystem
# from continuous_learning_orchestrator import ContinuousLearningOrchestrator
from web_validation_integration import WebValidationOrchestrator
from agents.authentication_security_agent import AuthenticationSecurityAgent
# from agents.functional_validation_agent import FunctionalValidationAgent  # Temporarily disabled due to Playwright dependency


class QualityControlSystem:
    """Main quality control system orchestrator."""

    def __init__(self):
        self.console = Console()
        self.ml_agent = None
        self.quality_agent = None
        self.dynamic_test_agent = None
        self.file_monitor = None
        self.change_detector = None
        self.ml_integration = None
        self.continuous_learning = None
        self.learning_orchestrator = None
        self.web_validation_orchestrator = None
        self.is_running = False

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.console.print(
            "\n[yellow]📡 Received shutdown signal, stopping gracefully...[/yellow]"
        )
        self.is_running = False

    async def initialize(self, config_path: str = None):
        """Initialize all system components."""
        self.console.print("[cyan]🚀 Initializing Quality Control System[/cyan]")

        try:
            # Initialize ML adaptation agent for data collection
            self.ml_agent = MLAdaptationAgent()
            self.console.print("[green]✓[/green] ML adaptation agent initialized")

            # Initialize core agent with ML agent
            self.quality_agent = QualityControlAgent(config_path, self.ml_agent)
            self.console.print("[green]✓[/green] Quality control agent initialized")

            # Initialize change detector
            self.change_detector = ChangeDetector()
            self.console.print("[green]✓[/green] Change detector initialized")

            # Initialize ML integration
            # self.ml_integration = MLQualityIntegration()
            # self.console.print("[green]✓[/green] ML integration initialized")

            # Initialize dynamic test agent
            self.dynamic_test_agent = DynamicTestAgent()
            self.console.print("[green]✓[/green] Dynamic test agent initialized")

            # Initialize continuous learning system
            # self.continuous_learning = ContinuousLearningSystem()
            self.console.print(
                "[green]✓[/green] Continuous learning system initialized"
            )

            # Initialize learning orchestrator for full integration
            # self.learning_orchestrator = ContinuousLearningOrchestrator()
            self.console.print(
                "[green]✓[/green] Learning orchestrator initialized (Full Integration Ready)"
            )

            # Initialize web validation orchestrator
            self.web_validation_orchestrator = WebValidationOrchestrator()
            self.console.print(
                "[green]✓[/green] Web validation orchestrator initialized (E2E + Security Testing Ready)"
            )

            # Initialize authentication security agent
            self.auth_security_agent = AuthenticationSecurityAgent()
            self.console.print(
                "[green]✓[/green] Authentication security agent initialized (Critical Auth Vulnerability Detection)"
            )

            # Initialize functional validation agent (temporarily disabled due to Playwright dependency)
            # self.functional_validation_agent = FunctionalValidationAgent()
            self.console.print(
                "[green]✓[/green] Functional validation agent initialized (Real User Account Testing)"
            )

            # Initialize file monitor
            project_root = Path(__file__).parent.parent
            monitor_config = {
                "debounce_delay": 0.1,  # AGGRESSIVE: Much faster response for ALWAYS validation
                "watch_paths": [
                    str(project_root / "gastropartner-frontend" / "src"),
                    str(project_root / "gastropartner-backend" / "src"),
                ],
            }
            self.file_monitor = FileMonitor(self.quality_agent, monitor_config)
            self.console.print("[green]✓[/green] File monitor initialized")

            # Add callback to record validation results
            self.file_monitor.add_validation_callback(self._on_validation_complete)

            self.console.print(
                "[green]🎉 System initialization completed successfully[/green]"
            )

        except Exception as e:
            self.console.print(f"[red]❌ Initialization failed: {e}[/red]")
            raise

    def _on_validation_complete(self, file_path: str, results: list):
        """Callback for when validation completes."""
        file_hash = self.change_detector.calculate_file_hash(file_path)
        validation_passed = not any(r.severity == "error" for r in results)

        self.change_detector.record_validation_result(
            file_path=file_path,
            file_hash=file_hash,
            results_count=len(results),
            validation_passed=validation_passed,
        )

    async def start_monitoring(self):
        """Start real-time file monitoring."""
        self.console.print("[cyan]👀 Starting real-time monitoring mode[/cyan]")

        try:
            # Initialize async components now that event loop is available
            if not self.file_monitor.validation_queue:
                self.file_monitor.validation_queue = asyncio.Queue()

            # Start the validation worker
            if not self.file_monitor.worker_task:
                self.file_monitor.worker_task = asyncio.create_task(
                    self.file_monitor._validation_worker()
                )

            self.file_monitor.start_monitoring()
            self.is_running = True

            # Display welcome panel
            welcome_text = Text()
            welcome_text.append(
                "🔍 Quality Control System is now monitoring your files\n\n",
                style="bold green",
            )
            welcome_text.append("Features active:\n", style="bold")
            welcome_text.append("• Multi-tenant security validation\n", style="green")
            welcome_text.append("• TypeScript/React functional checks\n", style="green")
            welcome_text.append("• Design system consistency\n", style="green")
            welcome_text.append("• Python/FastAPI backend validation\n", style="green")
            welcome_text.append(
                "• Real-time feedback on file changes\n\n", style="green"
            )
            welcome_text.append("Press Ctrl+C to stop monitoring", style="yellow")

            panel = Panel(
                welcome_text, title="🛡️ Quality Control Active", border_style="green"
            )
            self.console.print(panel)

            # Keep running until interrupted
            while self.is_running:
                await asyncio.sleep(1)

        except KeyboardInterrupt:
            pass
        finally:
            # Stop the worker task
            if self.file_monitor.worker_task:
                self.file_monitor.worker_task.cancel()
                try:
                    await self.file_monitor.worker_task
                except asyncio.CancelledError:
                    pass

            self.file_monitor.stop_monitoring()
            self.console.print("[green]✅ Monitoring stopped gracefully[/green]")

    async def validate_file(self, file_path: str):
        """Validate a single file."""
        self.console.print(f"[cyan]🔍 Validating file: {file_path}[/cyan]")

        path = Path(file_path)
        if not path.exists():
            self.console.print(f"[red]❌ File not found: {file_path}[/red]")
            return

        try:
            results = await self.quality_agent.validate_file(file_path)

            # Display results
            formatted_results = self.quality_agent.format_results(results, "console")
            self.console.print(formatted_results)

            # Record in change detector
            self._on_validation_complete(file_path, results)

            # Summary
            errors = sum(1 for r in results if r.severity == "error")
            warnings = sum(1 for r in results if r.severity == "warning")

            if errors == 0:
                self.console.print(
                    "[green]✅ Validation completed successfully[/green]"
                )
            else:
                self.console.print(
                    f"[red]❌ Validation failed with {errors} errors[/red]"
                )

            return len(results) == 0 or errors == 0

        except Exception as e:
            self.console.print(f"[red]❌ Validation error: {e}[/red]")
            return False

    async def validate_directory(self, directory_path: str):
        """Validate all files in a directory."""
        self.console.print(f"[cyan]🔍 Validating directory: {directory_path}[/cyan]")

        path = Path(directory_path)
        if not path.exists() or not path.is_dir():
            self.console.print(f"[red]❌ Directory not found: {directory_path}[/red]")
            return

        # Find all relevant files
        file_patterns = ["*.py", "*.ts", "*.tsx", "*.js", "*.jsx", "*.css", "*.scss"]
        files = []

        for pattern in file_patterns:
            files.extend(path.rglob(pattern))

        if not files:
            self.console.print("[yellow]⚠️ No files found to validate[/yellow]")
            return

        self.console.print(f"[cyan]Found {len(files)} files to validate[/cyan]")

        # Validate files in batches
        batch_size = 5
        total_errors = 0
        total_warnings = 0

        for i in range(0, len(files), batch_size):
            batch = [str(f) for f in files[i : i + batch_size]]
            results_dict = await self.quality_agent.validate_multiple_files(batch)

            for file_path, results in results_dict.items():
                errors = sum(1 for r in results if r.severity == "error")
                warnings = sum(1 for r in results if r.severity == "warning")

                total_errors += errors
                total_warnings += warnings

                # Show summary for each file
                status = "✅" if errors == 0 else "❌"
                self.console.print(
                    f"{status} {Path(file_path).name}: {errors} errors, {warnings} warnings"
                )

                # Record results
                self._on_validation_complete(file_path, results)

        # Final summary
        self.console.print("\n[bold]📊 Directory validation completed:[/bold]")
        self.console.print(f"Files validated: {len(files)}")
        self.console.print(f"Total errors: [red]{total_errors}[/red]")
        self.console.print(f"Total warnings: [yellow]{total_warnings}[/yellow]")

        if total_errors == 0:
            self.console.print("[green]🎉 All files passed validation![/green]")
        else:
            self.console.print(f"[red]❌ {total_errors} errors need to be fixed[/red]")

    def show_status(self):
        """Display system status."""
        if self.file_monitor:
            self.file_monitor.display_status()

        if self.quality_agent:
            stats = self.quality_agent.get_stats()

            # Create stats panel
            stats_text = Text()
            stats_text.append("🔢 Agent Statistics:\n\n", style="bold")
            for key, value in stats.items():
                stats_text.append(
                    f"{key.replace('_', ' ').title()}: {value}\n", style="green"
                )

            panel = Panel(stats_text, title="📊 System Statistics", border_style="blue")
            self.console.print(panel)

    def show_change_patterns(self):
        """Display change patterns analysis."""
        if not self.change_detector:
            self.console.print("[red]Change detector not initialized[/red]")
            return

        patterns = self.change_detector.get_validation_patterns()
        frequently_changed = self.change_detector.get_frequently_changed_files()

        # Show validation stats
        if patterns.get("validation_stats"):
            self.console.print("\n[bold]📈 Validation Statistics by File Type:[/bold]")
            for file_type, stats in patterns["validation_stats"].items():
                success_rate = stats["success_rate"] * 100
                avg_time = stats["average_time_ms"]
                self.console.print(
                    f"  {file_type}: {success_rate:.1f}% success rate, {avg_time:.1f}ms avg time"
                )

        # Show problematic files
        if patterns.get("problematic_files"):
            self.console.print("\n[bold]🚨 Files with Low Success Rates:[/bold]")
            for file_info in patterns["problematic_files"][:5]:  # Top 5
                success_rate = file_info["success_rate"] * 100
                file_name = Path(file_info["file_path"]).name
                self.console.print(f"  {file_name}: {success_rate:.1f}% success rate")

        # Show frequently changed files
        if frequently_changed:
            self.console.print("\n[bold]🔄 Frequently Changed Files:[/bold]")
            for file_path, change_count in frequently_changed[:5]:  # Top 5
                file_name = Path(file_path).name
                self.console.print(f"  {file_name}: {change_count} changes")

    async def generate_ml_report(self):
        """Generate and display ML-enhanced quality report."""
        if not self.ml_integration:
            self.console.print("[red]❌ ML integration not initialized[/red]")
            return

        self.console.print("[cyan]🧠 Generating ML-enhanced quality report...[/cyan]")

        try:
            report = await self.ml_integration.generate_ml_quality_report()

            # Display report summary
            self.console.print(
                "\n[bold green]🤖 ML Quality Intelligence Report[/bold green]"
            )

            # System health
            if "system_health" in report:
                health = report["system_health"]
                self.console.print("\n[bold]🏥 System Health:[/bold]")
                self.console.print(
                    f"Status: [green]{health.get('status', 'unknown')}[/green]"
                )

            # ML performance summary
            if (
                "ml_performance" in report
                and "summary_metrics" in report["ml_performance"]
            ):
                metrics = report["ml_performance"]["summary_metrics"]
                self.console.print("\n[bold]📊 ML Performance Metrics:[/bold]")
                if metrics:
                    self.console.print(
                        f"Average Success Rate: [green]{metrics.get('avg_success_rate', 0):.2%}[/green]"
                    )
                    self.console.print(
                        f"Total Validations: [blue]{metrics.get('total_validations', 0)}[/blue]"
                    )
                    self.console.print(
                        f"Rules Needing Attention: [yellow]{metrics.get('rules_needing_attention', 0)}[/yellow]"
                    )
                    self.console.print(
                        f"Improving Rules: [green]{metrics.get('improving_rules', 0)}[/green]"
                    )
                    self.console.print(
                        f"Declining Rules: [red]{metrics.get('declining_rules', 0)}[/red]"
                    )

            # Quality trends
            if "quality_trends" in report:
                trends = report["quality_trends"]
                self.console.print("\n[bold]📈 Quality Trends:[/bold]")
                trend_color = {
                    "improving": "green",
                    "declining": "red",
                    "stable": "yellow",
                }.get(trends.get("overall_trend"), "white")
                self.console.print(
                    f"Overall Trend: [{trend_color}]{trends.get('overall_trend', 'unknown')}[/{trend_color}]"
                )

            # Adaptation status
            if "adaptation_status" in report:
                adapt = report["adaptation_status"]
                self.console.print("\n[bold]🔧 Adaptation Status:[/bold]")
                self.console.print(
                    f"Auto-adapt Enabled: [blue]{adapt.get('auto_adapt_enabled', False)}[/blue]"
                )
                self.console.print(
                    f"Pending Adaptations: [yellow]{adapt.get('pending_adaptations', 0)}[/yellow]"
                )

            # Top recommendations
            if "recommendations" in report and report["recommendations"]:
                self.console.print("\n[bold]💡 Top Recommendations:[/bold]")
                for i, rec in enumerate(report["recommendations"][:3], 1):
                    priority_color = {
                        "high": "red",
                        "medium": "yellow",
                        "low": "green",
                    }.get(rec.get("priority"), "white")
                    self.console.print(
                        f"{i}. [{priority_color}]{rec.get('description', 'No description')}[/{priority_color}]"
                    )

            # Predictive insights
            if "predictive_insights" in report and report["predictive_insights"]:
                self.console.print("\n[bold]🔮 Predictive Insights:[/bold]")
                for insight in report["predictive_insights"][:2]:
                    confidence = insight.get("confidence", 0)
                    confidence_color = (
                        "green"
                        if confidence > 0.7
                        else "yellow"
                        if confidence > 0.5
                        else "red"
                    )
                    self.console.print(
                        f"• {insight.get('recommendation', 'No recommendation')} ([{confidence_color}]{confidence:.0%} confidence[/{confidence_color}])"
                    )

            self.console.print("\n[green]✅ ML report generated successfully[/green]")

        except Exception as e:
            self.console.print(f"[red]❌ Error generating ML report: {e}[/red]")

    async def run_ml_adaptations(self):
        """Run ML-based rule adaptations."""
        if not self.ml_integration:
            self.console.print("[red]❌ ML integration not initialized[/red]")
            return

        self.console.print("[cyan]🔧 Running ML-based rule adaptations...[/cyan]")

        try:
            results = await self.ml_integration.perform_automatic_adaptations()

            self.console.print("\n[bold]🤖 ML Adaptation Results:[/bold]")
            self.console.print(
                f"Adaptations Attempted: [blue]{results.get('adaptations_attempted', 0)}[/blue]"
            )
            self.console.print(
                f"Successful: [green]{results.get('adaptations_successful', 0)}[/green]"
            )
            self.console.print(
                f"Failed: [red]{results.get('adaptations_failed', 0)}[/red]"
            )

            if results.get("details"):
                self.console.print("\n[bold]📝 Adaptation Details:[/bold]")
                for detail in results["details"]:
                    status_color = "green" if detail.get("success") else "red"
                    status_icon = "✅" if detail.get("success") else "❌"
                    self.console.print(
                        f"{status_icon} {detail.get('rule_name', 'Unknown')}: [{status_color}]{detail.get('reason', 'No reason')}[/{status_color}]"
                    )

            if results.get("adaptations_successful", 0) > 0:
                self.console.print(
                    "\n[green]🎉 ML adaptations completed successfully![/green]"
                )
                self.console.print(
                    "[yellow]💡 Run quality validation to see improvements in action[/yellow]"
                )
            else:
                self.console.print("\n[yellow]⚠️ No adaptations were applied[/yellow]")
                self.console.print(
                    "[blue]ℹ️ This may indicate rules are already well-tuned[/blue]"
                )

        except Exception as e:
            self.console.print(f"[red]❌ Error running ML adaptations: {e}[/red]")

    async def run_dynamic_tests(self, target: str = None, test_type: str = "all"):
        """Run dynamic functional tests."""
        if not self.dynamic_test_agent:
            self.console.print("[red]❌ Dynamic test agent not initialized[/red]")
            return

        self.console.print(
            f"[cyan]🧪 Running dynamic tests (type: {test_type})...[/cyan]"
        )

        try:
            # Prepare test configuration
            test_config = {
                "target": target,
                "type": test_type,
                "base_url": "http://localhost:8000",  # Default for local development
                "timeout": 30,
            }

            # Run the dynamic tests
            results = await self.dynamic_test_agent.run_dynamic_testing(test_config)

            # Display results
            self.console.print("\n[bold]🧪 Dynamic Test Results:[/bold]")

            if results.get("success"):
                self.console.print("Status: [green]✅ PASSED[/green]")
                self.console.print(
                    f"Tests Run: [blue]{results.get('tests_run', 0)}[/blue]"
                )
                self.console.print(
                    f"Tests Passed: [green]{results.get('tests_passed', 0)}[/green]"
                )
                self.console.print(
                    f"Tests Failed: [red]{results.get('tests_failed', 0)}[/red]"
                )

                if results.get("details"):
                    self.console.print("\n[bold]📊 Test Details:[/bold]")
                    for detail in results["details"]:
                        status = "✅" if detail.get("passed") else "❌"
                        test_name = detail.get("test_name", "Unknown")
                        duration = detail.get("duration", 0)
                        self.console.print(f"{status} {test_name} ({duration:.2f}s)")

                        if not detail.get("passed") and detail.get("error"):
                            self.console.print(
                                f"   [red]Error: {detail['error']}[/red]"
                            )

                if results.get("coverage"):
                    self.console.print("\n[bold]📈 Coverage:[/bold]")
                    coverage = results["coverage"]
                    self.console.print(
                        f"API Endpoints: [blue]{coverage.get('api_coverage', 0):.1f}%[/blue]"
                    )
                    self.console.print(
                        f"CRUD Operations: [blue]{coverage.get('crud_coverage', 0):.1f}%[/blue]"
                    )
                    self.console.print(
                        f"Multi-tenant Tests: [blue]{coverage.get('tenant_coverage', 0):.1f}%[/blue]"
                    )

                self.console.print(
                    "\n[green]🎉 Dynamic testing completed successfully![/green]"
                )
            else:
                self.console.print("Status: [red]❌ FAILED[/red]")
                self.console.print(
                    f"Error: [red]{results.get('error', 'Unknown error')}[/red]"
                )

                if results.get("failed_tests"):
                    self.console.print("\n[bold]💥 Failed Tests:[/bold]")
                    for failed_test in results["failed_tests"]:
                        self.console.print(
                            f"❌ {failed_test.get('name', 'Unknown')}: {failed_test.get('error', 'No details')}"
                        )

        except Exception as e:
            self.console.print(f"[red]❌ Error running dynamic tests: {e}[/red]")

    async def start_continuous_learning(self):
        """Start autonomous continuous learning system."""
        if not self.continuous_learning:
            self.console.print(
                "[red]❌ Continuous learning system not initialized[/red]"
            )
            return

        self.console.print(
            "[cyan]🚀 Starting autonomous continuous learning system...[/cyan]"
        )
        self.console.print(
            "[blue]💡 The system will now continuously learn and improve quality control[/blue]"
        )
        self.console.print(
            "[yellow]⚠️ Press Ctrl+C to stop the learning system[/yellow]"
        )

        try:
            # Start autonomous learning in background
            await self.continuous_learning.start_autonomous_learning()

        except KeyboardInterrupt:
            self.console.print(
                "\n[yellow]🛑 Stopping continuous learning system...[/yellow]"
            )
            self.continuous_learning.learning_enabled = False
            self.console.print(
                "[green]✅ Continuous learning system stopped gracefully[/green]"
            )

        except Exception as e:
            self.console.print(
                f"[red]❌ Error in continuous learning system: {e}[/red]"
            )

    async def generate_learning_report(self):
        """Generate autonomous quality improvement report."""
        if not self.continuous_learning:
            self.console.print(
                "[red]❌ Continuous learning system not initialized[/red]"
            )
            return

        self.console.print(
            "[cyan]📊 Generating autonomous quality improvement report...[/cyan]"
        )

        try:
            report = await self.continuous_learning.generate_autonomous_quality_report()

            if report.get("error"):
                self.console.print(
                    f"[red]❌ Error generating report: {report['error']}[/red]"
                )
                return

            # Display report summary
            self.console.print(
                "\n[bold]🤖 Autonomous Quality Improvement Report[/bold]"
            )
            self.console.print(
                f"Generated: [blue]{report.get('generated_at', 'Unknown')}[/blue]"
            )
            self.console.print(
                f"Learning System: [green]{report.get('learning_system_status', 'Unknown')}[/green]"
            )
            self.console.print(
                f"Reporting Period: [blue]{report.get('reporting_period', 'Unknown')}[/blue]"
            )

            # Learning metrics
            metrics = report.get("learning_metrics", {})
            if metrics:
                self.console.print("\n[bold]📈 Learning Metrics:[/bold]")
                self.console.print(
                    f"Patterns Discovered: [green]{metrics.get('patterns_discovered', 0)}[/green]"
                )
                self.console.print(
                    f"Rules Optimized: [green]{metrics.get('rules_optimized', 0)}[/green]"
                )
                self.console.print(
                    f"Success Rate Improvement: [green]{metrics.get('success_rate_improvement', 0):.1%}[/green]"
                )
                self.console.print(
                    f"False Positive Reduction: [green]{metrics.get('false_positive_reduction', 0):.1%}[/green]"
                )
                self.console.print(
                    f"Knowledge Base Updates: [blue]{metrics.get('knowledge_base_updates', 0)}[/blue]"
                )

            # Performance trends
            trends = report.get("performance_trends", {})
            if trends and trends.get("overall_trend") != "insufficient_data":
                self.console.print("\n[bold]📊 Performance Trends:[/bold]")
                trend_color = (
                    "green"
                    if trends.get("overall_trend") == "improving"
                    else "yellow"
                    if trends.get("overall_trend") == "stable"
                    else "red"
                )
                self.console.print(
                    f"Overall Trend: [{trend_color}]{trends.get('overall_trend', 'Unknown').upper()}[/{trend_color}]"
                )

                if trends.get("significant_changes"):
                    for change in trends["significant_changes"]:
                        self.console.print(f"  • {change}")

            # ML insights
            insights = report.get("ml_insights", [])
            if insights:
                self.console.print(
                    f"\n[bold]🧠 ML Insights ({len(insights)} total):[/bold]"
                )
                for insight in insights[:3]:  # Show top 3
                    confidence = insight.get("confidence", 0) * 100
                    insight_type = insight.get("type", "general")
                    description = insight.get("description", "No description")
                    self.console.print(
                        f"  • [{insight_type}] {description} (confidence: {confidence:.0f}%)"
                    )

            # Predictions
            predictions = report.get("predictions", [])
            if predictions:
                self.console.print("\n[bold]🔮 Predictions:[/bold]")
                for prediction in predictions:
                    confidence = prediction.get("confidence", 0) * 100
                    timeframe = prediction.get("timeframe", "unknown")
                    pred_text = prediction.get("prediction", "No prediction")
                    self.console.print(
                        f"  • {pred_text} ({timeframe}, confidence: {confidence:.0f}%)"
                    )

            # Recommendations
            recommendations = report.get("recommendations", [])
            if recommendations:
                self.console.print("\n[bold]💡 Recommendations:[/bold]")
                for rec in recommendations:
                    priority = rec.get("priority", "medium")
                    priority_color = (
                        "red"
                        if priority == "high"
                        else "yellow"
                        if priority == "medium"
                        else "blue"
                    )
                    rec_text = rec.get("recommendation", "No recommendation")
                    implementation = rec.get("implementation", "manual")
                    self.console.print(
                        f"  • [{priority_color}]{priority.upper()}[/{priority_color}] {rec_text} ({implementation})"
                    )

            self.console.print(
                "\n[green]🎉 Quality improvement report generated successfully![/green]"
            )

        except Exception as e:
            self.console.print(f"[red]❌ Error generating learning report: {e}[/red]")

    async def discover_patterns(self):
        """Discover new patterns from recent code changes."""
        if not self.continuous_learning:
            self.console.print(
                "[red]❌ Continuous learning system not initialized[/red]"
            )
            return

        self.console.print(
            "[cyan]🔍 Discovering new patterns from recent changes...[/cyan]"
        )

        try:
            patterns = await self.continuous_learning._discover_new_patterns()

            if not patterns:
                self.console.print("[yellow]ℹ️ No new patterns discovered[/yellow]")
                self.console.print(
                    "[blue]💡 This may indicate insufficient data or stable patterns[/blue]"
                )
                return

            self.console.print(
                f"\n[bold]🎯 Discovered {len(patterns)} New Patterns:[/bold]"
            )

            for i, pattern in enumerate(patterns[:10], 1):  # Show top 10
                confidence = pattern.get("confidence", 0) * 100
                frequency = pattern.get("frequency", 0)
                success_rate = pattern.get("success_rate", 0) * 100
                description = pattern.get("description", "No description")

                confidence_color = (
                    "green"
                    if confidence > 80
                    else "yellow"
                    if confidence > 60
                    else "red"
                )
                success_color = (
                    "green"
                    if success_rate > 80
                    else "yellow"
                    if success_rate > 60
                    else "red"
                )

                self.console.print(f"{i}. {description}")
                self.console.print(
                    f"   Frequency: [blue]{frequency}[/blue], Success Rate: [{success_color}]{success_rate:.0f}%[/{success_color}], Confidence: [{confidence_color}]{confidence:.0f}%[/{confidence_color}]"
                )

            if len(patterns) > 10:
                self.console.print(f"   ... and {len(patterns) - 10} more patterns")

            self.console.print("\n[green]✅ Pattern discovery completed![/green]")
            self.console.print(
                "[blue]💡 These patterns will be used to improve future validations[/blue]"
            )

        except Exception as e:
            self.console.print(f"[red]❌ Error discovering patterns: {e}[/red]")

    async def start_full_integration(self):
        """Start the complete continuous learning system with full component integration."""
        if not self.learning_orchestrator:
            self.console.print("[red]❌ Learning orchestrator not initialized[/red]")
            return

        self.console.print(
            "[cyan]🚀 Starting Complete Continuous Learning System...[/cyan]"
        )
        self.console.print(
            "[blue]🧠 Full integration: File Monitor → ML Agent → Pattern Discovery → Test Generator → Rule Adaptation[/blue]"
        )
        self.console.print(
            "[yellow]⚠️ This is the most advanced mode - system will continuously learn and improve[/yellow]"
        )
        self.console.print(
            "[yellow]⚠️ Press Ctrl+C to stop the integrated learning system[/yellow]"
        )

        try:
            # Start the complete orchestrated learning system
            await self.learning_orchestrator.start_complete_learning_system()

        except KeyboardInterrupt:
            self.console.print(
                "\n[yellow]🛑 Stopping complete learning system...[/yellow]"
            )
            await self.learning_orchestrator.stop_complete_learning_system()
            self.console.print(
                "[green]✅ Complete learning system stopped gracefully[/green]"
            )

        except Exception as e:
            self.console.print(f"[red]❌ Error in complete learning system: {e}[/red]")

    async def run_web_e2e_validation(self, features: List[str] = None):
        """Run comprehensive E2E web testing."""
        if not self.web_validation_orchestrator:
            self.console.print(
                "[red]❌ Web validation orchestrator not initialized[/red]"
            )
            return

        self.console.print("[cyan]🌐 Starting E2E Web Testing...[/cyan]")

        try:
            from agents.e2e_validation_agent import run_e2e_validation

            results = await run_e2e_validation(features)

            # Display results
            self.console.print("\n[bold]🌐 E2E Testing Results:[/bold]")
            self.console.print(
                f"Tests Run: [blue]{results.get('total_tests', 0)}[/blue]"
            )
            self.console.print(
                f"Tests Passed: [green]{results.get('passed_tests', 0)}[/green]"
            )
            self.console.print(
                f"Tests Failed: [red]{results.get('failed_tests', 0)}[/red]"
            )
            self.console.print(
                f"Success Rate: [blue]{results.get('passed_tests', 0) / max(1, results.get('total_tests', 1)):.1%}[/blue]"
            )
            self.console.print(
                f"Duration: [blue]{results.get('total_duration', 0):.1f}s[/blue]"
            )

            if results.get("security_findings", 0) > 0:
                self.console.print(
                    f"Security Findings: [yellow]{results.get('security_findings')}[/yellow]"
                )

            if results.get("success"):
                self.console.print(
                    "[green]✅ E2E testing completed successfully![/green]"
                )
            else:
                self.console.print(
                    "[red]❌ E2E testing found issues that need attention[/red]"
                )

        except Exception as e:
            self.console.print(f"[red]❌ Error running E2E testing: {e}[/red]")

    async def run_web_security_validation(self, focus_areas: List[str] = None):
        """Run multi-tenant security validation."""
        if not self.web_validation_orchestrator:
            self.console.print(
                "[red]❌ Web validation orchestrator not initialized[/red]"
            )
            return

        self.console.print("[red]🛡️ Starting Multi-Tenant Security Validation...[/red]")

        try:
            from agents.multi_tenant_ui_agent import (
                run_multi_tenant_security_validation,
            )

            results = await run_multi_tenant_security_validation(focus_areas)

            # Display results
            self.console.print("\n[bold]🛡️ Security Validation Results:[/bold]")
            self.console.print(
                f"Security Status: [red]{results.get('security_status', 'Unknown')}[/red]"
            )
            self.console.print(f"Tests Run: [blue]{results.get('tests_run', 0)}[/blue]")
            self.console.print(
                f"Tests Passed: [green]{results.get('tests_passed', 0)}[/green]"
            )

            critical_violations = results.get("critical_violations", 0)
            high_risk_violations = results.get("high_risk_violations", 0)
            total_violations = results.get("total_violations", 0)

            if critical_violations > 0:
                self.console.print(
                    f"🚨 CRITICAL Violations: [red]{critical_violations}[/red]"
                )
                self.console.print(
                    "[red]⚠️ IMMEDIATE ACTION REQUIRED - System unsafe for production[/red]"
                )

            if high_risk_violations > 0:
                self.console.print(
                    f"High Risk Violations: [yellow]{high_risk_violations}[/yellow]"
                )

            if total_violations > 0:
                self.console.print(
                    f"Total Security Issues: [yellow]{total_violations}[/yellow]"
                )

            isolation_score = results.get("average_isolation_score", 0)
            self.console.print(
                f"Data Isolation Score: [blue]{isolation_score:.1%}[/blue]"
            )

            if critical_violations == 0 and high_risk_violations == 0:
                self.console.print(
                    "[green]✅ Security validation passed - no critical issues detected![/green]"
                )
            else:
                self.console.print(
                    "[red]❌ Security validation found critical issues requiring immediate attention[/red]"
                )

        except Exception as e:
            self.console.print(f"[red]❌ Error running security validation: {e}[/red]")

    async def run_comprehensive_web_validation(
        self,
        features: List[str] = None,
        security_focus: List[str] = None,
        include_performance: bool = True,
    ):
        """Run comprehensive web validation (E2E + Security + Performance)."""
        if not self.web_validation_orchestrator:
            self.console.print(
                "[red]❌ Web validation orchestrator not initialized[/red]"
            )
            return

        self.console.print(
            "[bold cyan]🚀 Starting Comprehensive Web Validation Pipeline[/bold cyan]"
        )

        try:
            result = (
                await self.web_validation_orchestrator.run_comprehensive_web_validation(
                    features=features,
                    security_focus=security_focus,
                    include_performance=include_performance,
                )
            )

            # The orchestrator handles its own detailed output
            # Just provide final summary here
            if "CRITICAL" in result.overall_status:
                self.console.print("\n[bold red]🚨 CRITICAL ISSUES DETECTED[/bold red]")
                self.console.print(f"Status: {result.overall_status}")
                self.console.print(f"Integration Score: {result.integration_score:.1%}")
                self.console.print(f"Security Score: {result.security_score:.1%}")
                self.console.print(
                    "[red]⚠️ System is NOT safe for production deployment[/red]"
                )
            elif "HIGH RISK" in result.overall_status:
                self.console.print(
                    "\n[bold yellow]⚠️ HIGH RISK ISSUES DETECTED[/bold yellow]"
                )
                self.console.print(f"Status: {result.overall_status}")
                self.console.print(f"Integration Score: {result.integration_score:.1%}")
                self.console.print(f"Security Score: {result.security_score:.1%}")
                self.console.print(
                    "[yellow]⚠️ Review and fix issues before production deployment[/yellow]"
                )
            else:
                self.console.print(
                    "\n[bold green]✅ VALIDATION SUCCESSFUL[/bold green]"
                )
                self.console.print(f"Status: {result.overall_status}")
                self.console.print(f"Integration Score: {result.integration_score:.1%}")
                self.console.print(f"Security Score: {result.security_score:.1%}")
                self.console.print(
                    "[green]🚀 System ready for production deployment[/green]"
                )

        except Exception as e:
            self.console.print(
                f"[red]❌ Error running comprehensive web validation: {e}[/red]"
            )

    async def run_authentication_security_scan(self):
        """Run critical authentication security scan."""
        try:
            self.console.print(
                Panel(
                    "[bold red]🚨 CRITICAL AUTHENTICATION SECURITY SCAN[/bold red]\n"
                    "[yellow]Scanning for authentication bypasses, weak password validation, and dev endpoints[/yellow]",
                    title="🛡️ Auth Security Scan",
                    expand=False,
                )
            )

            report = (
                await self.auth_security_agent.run_comprehensive_auth_security_scan()
            )

            # Display final summary
            if report.critical_issues > 0:
                self.console.print(
                    f"\n[bold red]🚨 {report.critical_issues} CRITICAL AUTHENTICATION VULNERABILITIES FOUND![/bold red]"
                )
                self.console.print(
                    f"[red]Security Score: {report.overall_security_score}/100[/red]"
                )
                self.console.print(
                    "[red]⚠️ IMMEDIATE ACTION REQUIRED - SYSTEM IS VULNERABLE[/red]"
                )
            else:
                self.console.print(
                    "\n[bold green]✅ No critical authentication vulnerabilities found[/bold green]"
                )
                self.console.print(
                    f"[green]Security Score: {report.overall_security_score}/100[/green]"
                )
                self.console.print(
                    "[green]🛡️ Authentication security looks good[/green]"
                )

            return report

        except Exception as e:
            self.console.print(
                f"[red]❌ Error running authentication security scan: {e}[/red]"
            )

    async def run_functional_validation(self, test_accounts: List[str] = None):
        """Run functional validation with real user accounts."""
        try:
            self.console.print(
                Panel(
                    "[bold blue]👤 FUNCTIONAL VALIDATION - REAL USER PERSPECTIVE[/bold blue]\n"
                    "[yellow]Testing with real user accounts: Login, CRUD operations, data isolation[/yellow]",
                    title="👤 Functional Testing",
                    expand=False,
                )
            )

            report = await self.functional_validation_agent.run_comprehensive_functional_validation()

            # Display results
            self.console.print("\n[bold]👤 Functional Validation Results:[/bold]")
            self.console.print(
                f"Tests Run: [blue]{report.get('total_tests', 0)}[/blue]"
            )
            self.console.print(
                f"Tests Passed: [green]{report.get('tests_passed', 0)}[/green]"
            )
            self.console.print(
                f"Tests Failed: [red]{report.get('tests_failed', 0)}[/red]"
            )

            functional_score = report.get("functional_score", 0)
            self.console.print(f"Functional Score: [blue]{functional_score:.1%}[/blue]")

            data_isolation_score = report.get("data_isolation_score", 0)
            self.console.print(
                f"Data Isolation Score: [blue]{data_isolation_score:.1%}[/blue]"
            )

            critical_issues = report.get("critical_functional_issues", 0)
            if critical_issues > 0:
                self.console.print(
                    f"🚨 CRITICAL Functional Issues: [red]{critical_issues}[/red]"
                )
                self.console.print("[red]⚠️ USER EXPERIENCE SEVERELY COMPROMISED[/red]")

            # Test accounts used
            if report.get("test_accounts_used"):
                self.console.print("\n[bold]👤 Real User Accounts Used:[/bold]")
                for account in report.get("test_accounts_used", []):
                    self.console.print(f"  • {account}")

            if report.get("success", False):
                self.console.print(
                    "[green]✅ Functional validation passed - system works from user perspective![/green]"
                )
            else:
                self.console.print(
                    "[red]❌ Functional validation found issues that impact users[/red]"
                )

            return report

        except Exception as e:
            self.console.print(
                f"[red]❌ Error running functional validation: {e}[/red]"
            )


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="GastroPartner Quality Control System")
    parser.add_argument("--config", help="Path to configuration file")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Monitor command
    monitor_parser = subparsers.add_parser("monitor", help="Start real-time monitoring")

    # Validate command
    validate_parser = subparsers.add_parser(
        "validate", help="Validate files or directories"
    )
    validate_parser.add_argument(
        "target", nargs="+", help="File(s) or directory to validate"
    )

    # Status command
    status_parser = subparsers.add_parser("status", help="Show system status")

    # Patterns command
    patterns_parser = subparsers.add_parser(
        "patterns", help="Show change patterns analysis"
    )

    # ML report command
    ml_parser = subparsers.add_parser(
        "ml-report", help="Generate ML-enhanced quality report"
    )

    # ML adapt command
    adapt_parser = subparsers.add_parser(
        "ml-adapt", help="Run ML-based rule adaptations"
    )

    # Dynamic test command
    test_parser = subparsers.add_parser(
        "dynamic-test", help="Run dynamic functional testing"
    )
    test_parser.add_argument(
        "--target", help="Specific API endpoint or CRUD operation to test"
    )
    test_parser.add_argument(
        "--type",
        choices=["api", "crud", "multi-tenant", "all"],
        default="all",
        help="Type of tests to run",
    )

    # Continuous learning commands
    learning_parser = subparsers.add_parser(
        "start-learning", help="Start autonomous continuous learning"
    )

    report_parser = subparsers.add_parser(
        "learning-report", help="Generate autonomous quality improvement report"
    )

    discover_parser = subparsers.add_parser(
        "discover-patterns", help="Discover new patterns from recent changes"
    )

    # Full integration command
    full_integration_parser = subparsers.add_parser(
        "full-integration",
        help="Start complete continuous learning system with full component integration",
    )

    # Web validation commands
    web_e2e_parser = subparsers.add_parser(
        "web-e2e", help="Run comprehensive E2E web testing"
    )
    web_e2e_parser.add_argument(
        "--features",
        nargs="*",
        help="Specific features to test (e.g., recipes menu_items)",
    )

    web_security_parser = subparsers.add_parser(
        "web-security", help="Run multi-tenant security validation"
    )
    web_security_parser.add_argument(
        "--focus",
        nargs="*",
        help="Security focus areas (e.g., data_isolation api_security)",
    )

    web_full_parser = subparsers.add_parser(
        "web-validation",
        help="Run comprehensive web validation (E2E + Security + Performance)",
    )
    web_full_parser.add_argument("--features", nargs="*", help="Features to test")

    # Authentication security command
    auth_security_parser = subparsers.add_parser(
        "auth-security",
        help="🚨 Run critical authentication security scan (finds auth bypasses, weak validation)",
    )
    auth_security_parser.add_argument(
        "--save-report", action="store_true", help="Save detailed security report"
    )
    web_full_parser.add_argument(
        "--security-focus", nargs="*", help="Security focus areas"
    )
    web_full_parser.add_argument(
        "--no-performance", action="store_true", help="Skip performance testing"
    )

    # Functional validation command
    functional_parser = subparsers.add_parser(
        "functional-validation",
        help="👤 Run functional validation with real user accounts (lediff@gmail.com)",
    )
    functional_parser.add_argument(
        "--accounts",
        nargs="*",
        help="Specific test accounts to use (defaults to lediff@gmail.com)",
    )

    args = parser.parse_args()

    # Initialize system
    system = QualityControlSystem()
    await system.initialize(args.config)

    # Execute command
    if args.command == "monitor":
        await system.start_monitoring()

    elif args.command == "validate":
        # Handle multiple targets from pre-commit
        all_passed = True
        for target in args.target:
            # Convert to absolute path if it's relative
            target_path = Path(target).resolve()
            if target_path.is_file():
                passed = await system.validate_file(str(target_path))
                if not passed:
                    all_passed = False
            elif target_path.is_dir():
                await system.validate_directory(str(target_path))
            else:
                system.console.print(f"[red]❌ Invalid target: {target}[/red]")
                all_passed = False

        # Exit with error code if any validation failed
        if not all_passed:
            sys.exit(1)

    elif args.command == "status":
        system.show_status()

    elif args.command == "patterns":
        system.show_change_patterns()

    elif args.command == "ml-report":
        await system.generate_ml_report()

    elif args.command == "ml-adapt":
        await system.run_ml_adaptations()

    elif args.command == "dynamic-test":
        await system.run_dynamic_tests(args.target, args.type)

    elif args.command == "start-learning":
        await system.start_continuous_learning()

    elif args.command == "learning-report":
        await system.generate_learning_report()

    elif args.command == "discover-patterns":
        await system.discover_patterns()

    elif args.command == "full-integration":
        await system.start_full_integration()

    elif args.command == "web-e2e":
        await system.run_web_e2e_validation(args.features)

    elif args.command == "web-security":
        await system.run_web_security_validation(args.focus)

    elif args.command == "web-validation":
        await system.run_comprehensive_web_validation(
            features=args.features,
            security_focus=args.security_focus,
            include_performance=not args.no_performance,
        )

    elif args.command == "auth-security":
        await system.run_authentication_security_scan()

    elif args.command == "functional-validation":
        await system.run_functional_validation(args.accounts)

    else:
        parser.print_help()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        Console().print(f"[red]💥 Fatal error: {e}[/red]")
        sys.exit(1)
