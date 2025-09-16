"""
File Monitor - Real-time file watching system

Monitors file changes and triggers validation automatically.
"""

import asyncio
import time
from pathlib import Path
from typing import Dict, List, Callable, Any
from threading import Lock

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from agents.quality_control_agent import QualityControlAgent, ValidationResult


class ValidationEventHandler(FileSystemEventHandler):
    """Event handler for file system changes."""

    def __init__(self, monitor: "FileMonitor"):
        self.monitor = monitor
        self.console = Console()

    def on_modified(self, event):
        if not event.is_directory:
            self.monitor.queue_validation(event.src_path, "modified")

    def on_created(self, event):
        if not event.is_directory:
            self.monitor.queue_validation(event.src_path, "created")


class FileMonitor:
    """
    Real-time file monitoring system that triggers automatic validation.

    Features:
    - Watches multiple directories simultaneously
    - Debouncing to prevent excessive validation
    - Configurable file patterns and exclusions
    - Real-time feedback display
    - Queue management for validation requests
    """

    def __init__(
        self, quality_agent: QualityControlAgent, config: Dict[str, Any] = None
    ):
        self.quality_agent = quality_agent
        self.config = config or {}
        self.console = Console()

        # Monitoring configuration
        self.watch_paths = self._get_watch_paths()
        self.file_patterns = self._get_file_patterns()
        self.excluded_patterns = self._get_excluded_patterns()
        self.debounce_delay = self.config.get(
            "debounce_delay", 0.1
        )  # AGGRESSIVE: ALWAYS validate immediately

        # State management
        self.observers: List[Observer] = []
        self.validation_queue = None  # Will be created when event loop exists
        self.pending_validations: Dict[str, float] = {}  # file_path -> last_change_time
        self.validation_lock = Lock()
        self.is_running = False
        self.worker_task = None

        # Statistics
        self.stats = {
            "files_watched": 0,
            "validations_triggered": 0,
            "validations_completed": 0,
            "validations_failed": 0,
            "debounced_events": 0,
        }

        # Callbacks
        self.validation_callbacks: List[
            Callable[[str, List[ValidationResult]], None]
        ] = []

    def _get_watch_paths(self) -> List[str]:
        """Get paths to watch from configuration."""
        default_paths = [
            "gastropartner-frontend/src",
            "gastropartner-backend/src",
            "gastropartner-frontend/gastropartner-test-suite",
            "quality-control",
        ]
        return self.config.get("watch_paths", default_paths)

    def _get_file_patterns(self) -> List[str]:
        """Get file patterns to monitor."""
        default_patterns = [
            "*.py",
            "*.tsx",
            "*.ts",
            "*.jsx",
            "*.js",
            "*.css",
            "*.scss",
            "*.json",
            "*.yaml",
            "*.yml",
            "*.sql",
            "*.md",
        ]
        return self.config.get("file_patterns", default_patterns)

    def _get_excluded_patterns(self) -> List[str]:
        """Get patterns to exclude from monitoring."""
        default_excluded = [
            "__pycache__",
            ".git",
            "node_modules",
            ".pytest_cache",
            ".coverage",
            "dist",
            "build",
            ".next",
            ".vscode",
            "*.pyc",
            "test-results",
            "playwright-report",
        ]
        return self.config.get("excluded_patterns", default_excluded)

    def _should_monitor_file(self, file_path: str) -> bool:
        """AGGRESSIVE: ALWAYS monitor critical file types - NEVER skip validation."""
        path = Path(file_path)

        # FORCE validation for critical file types
        critical_extensions = {".tsx", ".ts", ".py", ".js", ".jsx", ".css", ".scss"}
        if path.suffix.lower() in critical_extensions:
            print(f"🎯 CRITICAL FILE DETECTED: {path.name} - FORCING VALIDATION")
            return True

        # Also check normal patterns as backup
        for pattern in self.file_patterns:
            if path.match(pattern):
                return True

        # Even if not matching patterns, log it
        print(f"🤔 UNKNOWN FILE TYPE: {path.name} ({path.suffix}) - SKIPPING")
        return False

    def add_validation_callback(
        self, callback: Callable[[str, List[ValidationResult]], None]
    ):
        """Add callback function to be called when validation completes."""
        self.validation_callbacks.append(callback)

    def queue_validation(self, file_path: str, change_type: str):
        """Queue a file for validation with debouncing."""
        if not self._should_monitor_file(file_path):
            return

        current_time = time.time()

        with self.validation_lock:
            # Update pending validation timestamp
            self.pending_validations[file_path] = current_time

            # Log the change with clear terminal output
            print(
                f"\n🤖 QUALITY CONTROL: File changed: {Path(file_path).name} ({change_type})"
            )
            self.console.print(
                f"[cyan]📝 File changed:[/cyan] {Path(file_path).name} ({change_type})"
            )

        # Schedule debounced validation safely
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._debounced_validation(file_path, current_time))
        except RuntimeError:
            # No event loop running, log it and continue
            self.console.print(
                "[yellow]⚠️ Event loop not available, validation will be delayed[/yellow]"
            )

    async def _debounced_validation(self, file_path: str, change_time: float):
        """AGGRESSIVE: Perform validation immediately - NEVER skip validation."""
        await asyncio.sleep(self.debounce_delay)

        # ALWAYS validate, regardless of other pending changes
        with self.validation_lock:
            # Remove from pending if exists
            if file_path in self.pending_validations:
                del self.pending_validations[file_path]

        # FORCE validation into queue - NEVER skip
        if self.validation_queue:
            await self.validation_queue.put(file_path)
            print(f"🚨 FORCING VALIDATION: {Path(file_path).name}")
        else:
            print(f"❌ NO VALIDATION QUEUE: {Path(file_path).name}")

    async def _validation_worker(self):
        """Worker that processes validation queue."""
        while self.is_running:
            try:
                # Wait for validation request
                file_path = await asyncio.wait_for(
                    self.validation_queue.get(), timeout=1.0
                )

                self.stats["validations_triggered"] += 1
                print("\n" + "=" * 60)
                print("🚨 PYDANTIC AI AGENTS RUNNING - QUALITY CONTROL ACTIVE 🚨")
                print(f"📄 FILE: {Path(file_path).name}")
                print(f"⏰ TIME: {time.strftime('%H:%M:%S')}")
                print("🔬 VALIDATING: Multi-tenant security, functionality, design...")
                print("=" * 60)
                self.console.print(
                    f"[bold red]🚨 PYDANTIC AI AGENTS ACTIVE[/bold red]: {Path(file_path).name}"
                )

                # Perform validation
                start_time = time.time()
                results = await self.quality_agent.validate_file(file_path)
                validation_time = time.time() - start_time

                # Update statistics
                if any(r.severity == "error" for r in results):
                    self.stats["validations_failed"] += 1
                else:
                    self.stats["validations_completed"] += 1

                # Display results
                await self._display_validation_results(
                    file_path, results, validation_time
                )

                # Call callbacks
                for callback in self.validation_callbacks:
                    try:
                        callback(file_path, results)
                    except Exception as e:
                        self.console.print(f"[red]Callback error: {e}[/red]")

            except asyncio.TimeoutError:
                continue  # Check if still running
            except Exception as e:
                self.console.print(f"[red]Validation worker error: {e}[/red]")

    async def _display_validation_results(
        self, file_path: str, results: List[ValidationResult], validation_time: float
    ):
        """Display validation results in console."""
        file_name = Path(file_path).name

        errors = [r for r in results if r.severity == "error"]
        warnings = [r for r in results if r.severity == "warning"]
        info = [r for r in results if r.severity == "info"]

        # Create results table
        table = Table(title=f"Validation Results: {file_name} ({validation_time:.2f}s)")
        table.add_column("Type", style="bold")
        table.add_column("Count", justify="right")
        table.add_column("Status", justify="center")

        # Add rows
        table.add_row("Errors", str(len(errors)), "❌" if errors else "✅")
        table.add_row("Warnings", str(len(warnings)), "⚠️" if warnings else "✅")
        table.add_row("Info", str(len(info)), "ℹ️" if info else "✅")

        # Overall status
        if errors:
            status = "[red]❌ FAILED[/red]"
            color = "red"
            print("\n🚨 QUALITY CONTROL RESULT: FAILED ❌")
            print(f"📄 FILE: {file_name}")
            print(f"🔴 ERRORS: {len(errors)} | ⚠️ WARNINGS: {len(warnings)}")
        elif warnings:
            status = "[yellow]⚠️ WARNINGS[/yellow]"
            color = "yellow"
            print("\n⚠️ QUALITY CONTROL RESULT: WARNINGS ⚠️")
            print(f"📄 FILE: {file_name}")
            print(f"🟡 WARNINGS: {len(warnings)} | ℹ️ INFO: {len(info)}")
        else:
            status = "[green]✅ PASSED[/green]"
            color = "green"
            print("\n✅ QUALITY CONTROL RESULT: PASSED ✅")
            print(f"📄 FILE: {file_name}")
            print("🟢 ALL CHECKS PASSED - SECURE & COMPLIANT")
        print(f"⏱️ VALIDATION TIME: {validation_time:.2f}s")
        print("=" * 60)

        # Display in panel
        panel = Panel(table, title=f"{status} - {file_name}", border_style=color)
        # Print clear terminal summary
        if errors:
            print(
                f"❌ VALIDATION FAILED: {file_name} - {len(errors)} errors, {len(warnings)} warnings"
            )
        elif warnings:
            print(f"⚠️  VALIDATION WARNING: {file_name} - {len(warnings)} warnings")
        else:
            print(f"✅ VALIDATION PASSED: {file_name} - All checks OK")

        self.console.print(panel)

        # Show first few issues
        if results:
            for result in results[:3]:  # Show max 3 issues
                severity_color = {
                    "error": "red",
                    "warning": "yellow",
                    "info": "blue",
                }.get(result.severity, "white")

                message = f"[{severity_color}]{result.severity.upper()}[/{severity_color}]: {result.message}"
                if result.line_number:
                    message += f" (Line {result.line_number})"

                self.console.print(f"  {message}")

            if len(results) > 3:
                self.console.print(f"  ... and {len(results) - 3} more issues")

    def start_monitoring(self):
        """Start file monitoring."""
        if self.is_running:
            self.console.print("[yellow]Monitor is already running[/yellow]")
            return

        self.is_running = True

        # Initialize validation queue
        try:
            self.validation_queue = asyncio.Queue()
        except RuntimeError:
            self.console.print(
                "[yellow]⚠️ Async queue will be initialized when event loop is available[/yellow]"
            )

        # Create observers for each watch path
        for watch_path in self.watch_paths:
            path = Path(watch_path)
            if path.exists():
                observer = Observer()
                observer.schedule(
                    ValidationEventHandler(self), str(path), recursive=True
                )
                observer.start()
                self.observers.append(observer)

                # Count files being watched
                file_count = sum(
                    1
                    for p in path.rglob("*")
                    if p.is_file() and self._should_monitor_file(str(p))
                )
                self.stats["files_watched"] += file_count

                self.console.print(
                    f"[green]👀 Watching:[/green] {watch_path} ({file_count} files)"
                )
            else:
                self.console.print(f"[red]❌ Path not found:[/red] {watch_path}")

        self.console.print(
            f"[green]🚀 File monitoring started[/green] - Watching {len(self.observers)} directories"
        )

    def stop_monitoring(self):
        """Stop file monitoring."""
        if not self.is_running:
            return

        self.is_running = False

        # Stop all observers
        for observer in self.observers:
            observer.stop()
            observer.join()

        self.observers.clear()
        self.console.print("[red]🛑 File monitoring stopped[/red]")

    async def validate_all_watched_files(self):
        """Trigger validation for all currently watched files."""
        self.console.print("[cyan]🔍 Validating all watched files...[/cyan]")

        all_files = []
        for watch_path in self.watch_paths:
            path = Path(watch_path)
            if path.exists():
                for file_path in path.rglob("*"):
                    if file_path.is_file() and self._should_monitor_file(
                        str(file_path)
                    ):
                        all_files.append(str(file_path))

        if not all_files:
            self.console.print("[yellow]No files to validate[/yellow]")
            return

        # Validate files in batches
        batch_size = 5
        for i in range(0, len(all_files), batch_size):
            batch = all_files[i : i + batch_size]
            results_dict = await self.quality_agent.validate_multiple_files(batch)

            for file_path, results in results_dict.items():
                await self._display_validation_results(file_path, results, 0.0)

        self.console.print(f"[green]✅ Validated {len(all_files)} files[/green]")

    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring status and statistics."""
        queue_size = 0
        if self.validation_queue:
            try:
                queue_size = self.validation_queue.qsize()
            except:
                queue_size = 0

        return {
            "is_running": self.is_running,
            "watched_directories": len(self.observers),
            "watched_paths": self.watch_paths,
            "file_patterns": self.file_patterns,
            "pending_validations": len(self.pending_validations),
            "queue_size": queue_size,
            "statistics": self.stats,
        }

    def display_status(self):
        """Display monitoring status in console."""
        status = self.get_monitoring_status()

        # Create status table
        table = Table(title="File Monitor Status")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", justify="right")

        table.add_row("Status", "🟢 Running" if status["is_running"] else "🔴 Stopped")
        table.add_row("Watched Directories", str(status["watched_directories"]))
        table.add_row("Files Watched", str(status["statistics"]["files_watched"]))
        table.add_row(
            "Validations Triggered", str(status["statistics"]["validations_triggered"])
        )
        table.add_row(
            "Validations Completed", str(status["statistics"]["validations_completed"])
        )
        table.add_row(
            "Validations Failed", str(status["statistics"]["validations_failed"])
        )
        table.add_row("Events Debounced", str(status["statistics"]["debounced_events"]))
        table.add_row("Pending Validations", str(status["pending_validations"]))
        table.add_row("Queue Size", str(status["queue_size"]))

        self.console.print(table)

    async def __aenter__(self):
        """Async context manager entry."""
        self.start_monitoring()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        self.stop_monitoring()
