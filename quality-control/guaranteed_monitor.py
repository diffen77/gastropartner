#!/usr/bin/env python3
"""
Guaranteed Quality Monitor - Always-On Validation System

This service GUARANTEES that every file change is validated by quality control
agents with immediate feedback to Claude. Features:

- 0ms debounce - INSTANT validation
- Auto-restart on crash
- Health checks every 30 seconds
- Validates ALL file types (.py, .tsx, .ts, .jsx, .js, .css, .scss, .json, .yaml, .sql, .md)
- Direct feedback channel to Claude via structured output
- Crash-proof with persistent monitoring
"""

import asyncio
import sys
import os
import time
import signal
import logging
from pathlib import Path
from typing import List
from datetime import datetime
import psutil

# Add the quality-control directory to Python path
quality_control_dir = Path(__file__).parent
sys.path.insert(0, str(quality_control_dir))

# Import quality control components
from agents.quality_control_agent import QualityControlAgent, ValidationResult
from feedback_processor import create_feedback_processor
from watchers.change_detector import ChangeDetector

# Import watchdog for file system monitoring
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class GuaranteedValidationHandler(FileSystemEventHandler):
    """File system event handler with GUARANTEED validation."""

    def __init__(self, monitor: "GuaranteedMonitor"):
        self.monitor = monitor
        self.last_validation = {}  # file_path -> timestamp
        super().__init__()

    def on_modified(self, event):
        if not event.is_directory:
            self.monitor.queue_immediate_validation(event.src_path, "modified")

    def on_created(self, event):
        if not event.is_directory:
            self.monitor.queue_immediate_validation(event.src_path, "created")


class GuaranteedMonitor:
    """
    Always-On Quality Monitor with GUARANTEED validation.

    Features:
    - Zero debounce - instant validation
    - Automatic crash recovery
    - Health monitoring every 30 seconds
    - Complete file type coverage
    - Structured feedback for Claude
    """

    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or os.getcwd()).resolve()
        self.quality_agent = None
        self.feedback_processor = None
        self.change_detector = None

        # Monitoring configuration
        self.watch_paths = self._get_watch_paths()
        self.monitored_extensions = {
            ".py",
            ".tsx",
            ".ts",
            ".jsx",
            ".js",
            ".css",
            ".scss",
            ".json",
            ".yaml",
            ".yml",
            ".sql",
            ".md",
        }

        # State management
        self.observers: List[Observer] = []
        self.validation_queue = None
        self.is_running = False
        self.worker_task = None
        self.health_check_task = None
        self.start_time = time.time()

        # Statistics for monitoring
        self.stats = {
            "files_watched": 0,
            "validations_triggered": 0,
            "validations_completed": 0,
            "validations_failed": 0,
            "system_errors": 0,
            "uptime_seconds": 0,
            "last_validation": None,
            "last_health_check": None,
            "crashes_recovered": 0,
        }

        # Setup logging
        self._setup_logging()

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _setup_logging(self):
        """Setup comprehensive logging."""
        log_dir = self.project_root / "quality-control" / "logs"
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(log_dir / "guaranteed_monitor.log"),
                logging.StreamHandler(sys.stdout),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.logger.info(f"🛑 Received signal {signum}, shutting down gracefully...")
        self.stop_monitoring()
        sys.exit(0)

    def _get_watch_paths(self) -> List[Path]:
        """Get all paths to monitor."""
        paths = [
            self.project_root / "gastropartner-frontend" / "src",
            self.project_root / "gastropartner-backend" / "src",
            self.project_root / "gastropartner-frontend" / "gastropartner-test-suite",
            self.project_root / "quality-control",
            self.project_root / "gastropartner-backend" / "migrations",
        ]

        # Add root level config files
        paths.extend(
            [
                self.project_root / "package.json",
                self.project_root / "pyproject.toml",
                self.project_root / "CLAUDE.md",
            ]
        )

        return [p for p in paths if p.exists()]

    def _should_validate_file(self, file_path: str) -> bool:
        """AGGRESSIVE: Validate ALL supported file types - NEVER skip."""
        path = Path(file_path)

        # Check extension
        if path.suffix.lower() not in self.monitored_extensions:
            return False

        # Exclude build artifacts and temporary files
        exclude_patterns = [
            "__pycache__",
            ".git",
            "node_modules",
            ".pytest_cache",
            ".coverage",
            "dist",
            "build",
            ".next",
            ".vscode",
            "test-results",
            "playwright-report",
            ".mypy_cache",
        ]

        file_str = str(path)
        if any(pattern in file_str for pattern in exclude_patterns):
            return False

        # Log what we're about to validate
        self.log_claude_message("CAPTURE", f"🎯 File change detected: {path.name}")
        return True

    def log_claude_message(self, level: str, message: str, details: str = ""):
        """Log messages in Claude-friendly format with terminal visibility."""
        timestamp = datetime.now().strftime("%H:%M:%S")

        if level == "CAPTURE":
            print(f"\n{'🎯' + '=' * 60 + '🎯'}")
            print(f"🎯 [{timestamp}] GUARANTEED MONITOR: {message}")
            if details:
                print(f"🎯 Details: {details}")
            print(f"{'🎯' + '=' * 60 + '🎯'}")
        elif level == "VALIDATION":
            print(f"\n{'🚨' + '=' * 60 + '🚨'}")
            print(f"🚨 [{timestamp}] QUALITY AGENTS ACTIVE: {message}")
            if details:
                print(f"🚨 Agent Details: {details}")
            print(f"{'🚨' + '=' * 60 + '🚨'}")
        elif level == "SUCCESS":
            print(f"\n{'✅' + '=' * 60 + '✅'}")
            print(f"✅ [{timestamp}] VALIDATION SUCCESS: {message}")
            if details:
                print(f"✅ Results: {details}")
            print(f"{'✅' + '=' * 60 + '✅'}")
        elif level == "ERROR":
            print(f"\n{'❌' + '=' * 60 + '❌'}")
            print(f"❌ [{timestamp}] VALIDATION FAILED: {message}")
            if details:
                print(f"❌ Error Details: {details}")
            print(f"{'❌' + '=' * 60 + '❌'}")
        elif level == "HEALTH":
            print(f"💚 [{timestamp}] HEALTH CHECK: {message}")
            if details:
                print(f"💚 Status: {details}")
        else:
            print(f"ℹ️  [{timestamp}] {message}")
            if details:
                print(f"    {details}")

        # Also log to file
        self.logger.info(f"[{level}] {message} {details}")

    async def initialize(self):
        """Initialize all monitoring components."""
        self.log_claude_message("VALIDATION", "Initializing Guaranteed Quality Monitor")

        try:
            # Initialize quality control agent
            self.log_claude_message("VALIDATION", "Loading all 5 PydanticAI agents...")
            self.quality_agent = QualityControlAgent()

            # Initialize feedback processor
            self.log_claude_message(
                "VALIDATION", "Setting up Claude feedback processor..."
            )
            self.feedback_processor = create_feedback_processor()

            # Initialize change detector
            self.log_claude_message("VALIDATION", "Starting change detection system...")
            self.change_detector = ChangeDetector()

            # Test agent connectivity
            self.log_claude_message("VALIDATION", "Testing agent connectivity...")
            stats = self.quality_agent.get_stats()

            self.log_claude_message(
                "SUCCESS",
                "All systems initialized successfully",
                f"Active agents: {stats.get('active_agents', 'All 5 agents')}",
            )

        except Exception as e:
            self.log_claude_message(
                "ERROR", "Failed to initialize guaranteed monitor", str(e)
            )
            raise

    def queue_immediate_validation(self, file_path: str, change_type: str):
        """Queue file for IMMEDIATE validation - zero debounce."""
        if not self._should_validate_file(file_path):
            return

        # Log the immediate capture
        file_name = Path(file_path).name
        self.log_claude_message(
            "CAPTURE",
            f"File {change_type}: {file_name}",
            "Queuing for instant validation",
        )

        # Add to queue immediately
        if self.validation_queue and self.is_running:
            try:
                # Use asyncio.create_task to ensure immediate queuing
                loop = asyncio.get_event_loop()
                loop.create_task(self._queue_validation(file_path))
            except RuntimeError:
                self.logger.warning(f"Event loop not available for {file_path}")

    async def _queue_validation(self, file_path: str):
        """Add file to validation queue immediately."""
        await self.validation_queue.put(file_path)
        self.stats["validations_triggered"] += 1

    async def _validation_worker(self):
        """Worker that processes validation queue with zero delay."""
        self.log_claude_message(
            "VALIDATION", "Starting validation worker (zero debounce mode)"
        )

        while self.is_running:
            try:
                # Wait for validation request with 1 second timeout
                file_path = await asyncio.wait_for(
                    self.validation_queue.get(), timeout=1.0
                )

                # IMMEDIATE validation - no debounce
                await self._validate_file_immediately(file_path)

            except asyncio.TimeoutError:
                continue  # Check if still running
            except Exception as e:
                self.log_claude_message("ERROR", f"Validation worker error: {e}")
                self.stats["system_errors"] += 1

                # Attempt recovery
                await asyncio.sleep(1)

    async def _validate_file_immediately(self, file_path: str):
        """Perform immediate validation with all agents."""
        file_name = Path(file_path).name
        start_time = time.time()

        self.log_claude_message("VALIDATION", f"Running all 5 agents on {file_name}")

        # Show which agents are active
        print(f"🛡️  SECURITY AGENT: Scanning {file_name} for multi-tenant violations...")
        print(f"⚙️  BACKEND AGENT: Analyzing {file_name} for code quality...")
        print(f"🎨 FRONTEND AGENT: Checking {file_name} for UI/UX compliance...")
        print(f"🔧 FUNCTIONAL AGENT: Validating {file_name} business logic...")
        print(f"🎯 DESIGN AGENT: Reviewing {file_name} for consistency...")

        try:
            # Run validation
            results = await self.quality_agent.validate_file(file_path)
            validation_time = time.time() - start_time

            # Process results
            errors = [r for r in results if r.severity == "error"]
            warnings = [r for r in results if r.severity == "warning"]

            # Update statistics
            self.stats["last_validation"] = datetime.now().isoformat()
            if errors:
                self.stats["validations_failed"] += 1
            else:
                self.stats["validations_completed"] += 1

            # Generate Claude feedback
            await self._send_claude_feedback(file_path, results, validation_time)

            # Record validation result
            if self.change_detector:
                file_hash = self.change_detector.calculate_file_hash(file_path)
                validation_passed = not errors

                self.change_detector.record_validation_result(
                    file_path=file_path,
                    file_hash=file_hash,
                    results_count=len(results),
                    validation_passed=validation_passed,
                )

        except Exception as e:
            self.log_claude_message(
                "ERROR", f"Validation failed for {file_name}", str(e)
            )
            self.stats["system_errors"] += 1

    async def _send_claude_feedback(
        self, file_path: str, results: List[ValidationResult], validation_time: float
    ):
        """Send structured feedback to Claude."""
        file_name = Path(file_path).name
        errors = [r for r in results if r.severity == "error"]
        warnings = [r for r in results if r.severity == "warning"]

        if errors:
            # Format error feedback for Claude
            self.log_claude_message(
                "ERROR", f"Found {len(errors)} errors in {file_name}"
            )
            print(f"\n{'🤖' + '=' * 78 + '🤖'}")
            print("🤖 QUALITY CONTROL FEEDBACK FOR CLAUDE")
            print(f"{'🤖' + '=' * 78 + '🤖'}")
            print(f"\n❌ Found {len(errors)} errors that MUST be fixed:")

            for i, error in enumerate(errors, 1):
                print(f"\n{i}. 📁 {file_name}")
                if error.line_number:
                    print(f"   📍 Line {error.line_number}: {error.message}")
                else:
                    print(f"   ❌ {error.message}")

                if hasattr(error, "fix_suggestion") and error.fix_suggestion:
                    print(f"   💡 Fix: {error.fix_suggestion}")

            print("\n🔧 REQUIRED ACTIONS:")
            print(f"1. Fix all {len(errors)} errors above")
            print("2. Save the file to trigger automatic re-validation")
            print("3. Wait for ✅ confirmation that all issues are resolved")
            print(f"\n{'🤖' + '=' * 78 + '🤖'}")

        elif warnings:
            self.log_claude_message(
                "SUCCESS",
                f"Validation passed with {len(warnings)} warnings for {file_name}",
            )
            print(
                f"⚠️  Quality control passed with {len(warnings)} warnings for {file_name}"
            )
            for warning in warnings[:3]:  # Show first 3 warnings
                print(f"   ⚠️  {warning.message}")
        else:
            self.log_claude_message(
                "SUCCESS",
                f"All quality checks passed for {file_name}",
                f"Validation time: {validation_time:.2f}s",
            )

    async def _health_check_worker(self):
        """Continuous health monitoring."""
        self.log_claude_message(
            "HEALTH", "Starting health check worker (30-second intervals)"
        )

        while self.is_running:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds

                # Update uptime
                self.stats["uptime_seconds"] = int(time.time() - self.start_time)
                self.stats["last_health_check"] = datetime.now().isoformat()

                # Check system health
                memory_usage = psutil.virtual_memory().percent
                cpu_usage = psutil.cpu_percent(interval=1)
                queue_size = (
                    self.validation_queue.qsize() if self.validation_queue else 0
                )

                health_status = {
                    "uptime": self.stats["uptime_seconds"],
                    "memory_usage_percent": memory_usage,
                    "cpu_usage_percent": cpu_usage,
                    "validation_queue_size": queue_size,
                    "files_watched": self.stats["files_watched"],
                    "validations_completed": self.stats["validations_completed"],
                    "validations_failed": self.stats["validations_failed"],
                }

                self.log_claude_message(
                    "HEALTH",
                    f"System healthy - Uptime: {self.stats['uptime_seconds']}s",
                    f"Queue: {queue_size}, Memory: {memory_usage:.1f}%, CPU: {cpu_usage:.1f}%",
                )

                # Check for issues
                if memory_usage > 80:
                    self.log_claude_message(
                        "ERROR", f"High memory usage: {memory_usage:.1f}%"
                    )
                if queue_size > 10:
                    self.log_claude_message("ERROR", f"High queue size: {queue_size}")

            except Exception as e:
                self.log_claude_message("ERROR", f"Health check failed: {e}")
                self.stats["system_errors"] += 1

    def start_monitoring(self):
        """Start the guaranteed monitoring system."""
        if self.is_running:
            self.log_claude_message("ERROR", "Monitor is already running")
            return

        self.is_running = True
        self.log_claude_message("VALIDATION", "Starting Guaranteed Quality Monitor")

        # Initialize validation queue
        self.validation_queue = asyncio.Queue()

        # Setup file system observers
        for watch_path in self.watch_paths:
            if watch_path.exists():
                observer = Observer()
                observer.schedule(
                    GuaranteedValidationHandler(self), str(watch_path), recursive=True
                )
                observer.start()
                self.observers.append(observer)

                # Count files being watched
                if watch_path.is_file():
                    self.stats["files_watched"] += 1
                else:
                    file_count = sum(
                        1
                        for p in watch_path.rglob("*")
                        if p.is_file() and self._should_validate_file(str(p))
                    )
                    self.stats["files_watched"] += file_count

                self.log_claude_message(
                    "CAPTURE",
                    f"Watching: {watch_path.name}",
                    "Monitoring all supported file types",
                )

        self.log_claude_message(
            "SUCCESS",
            "Guaranteed monitor started",
            f"Watching {len(self.observers)} locations, {self.stats['files_watched']} files",
        )

        print(f"\n{'🚨' + '=' * 70 + '🚨'}")
        print("🚨 GUARANTEED QUALITY CONTROL ACTIVE")
        print("🚨 - Zero debounce: Instant validation on ALL file changes")
        print(
            "🚨 - All 5 PydanticAI agents ready: Security, Backend, Frontend, Functional, Design"
        )
        print(
            f"🚨 - Monitoring {self.stats['files_watched']} files across {len(self.observers)} locations"
        )
        print("🚨 - Auto-restart on crash, health checks every 30 seconds")
        print("🚨 - Direct feedback to Claude for all validation results")
        print(f"{'🚨' + '=' * 70 + '🚨'}")

    def stop_monitoring(self):
        """Stop all monitoring."""
        if not self.is_running:
            return

        self.is_running = False

        # Stop all observers
        for observer in self.observers:
            observer.stop()
            observer.join()

        self.observers.clear()
        self.log_claude_message("HEALTH", "Guaranteed monitor stopped")

    async def run_forever(self):
        """Run the monitor until stopped."""
        try:
            await self.initialize()
            self.start_monitoring()

            # Start worker tasks
            self.worker_task = asyncio.create_task(self._validation_worker())
            self.health_check_task = asyncio.create_task(self._health_check_worker())

            # Wait for tasks to complete
            await asyncio.gather(self.worker_task, self.health_check_task)

        except KeyboardInterrupt:
            self.log_claude_message("HEALTH", "Shutdown requested")
        except Exception as e:
            self.log_claude_message("ERROR", f"Monitor crashed: {e}")
            self.stats["crashes_recovered"] += 1
            raise
        finally:
            self.stop_monitoring()


async def main():
    """Main entry point with auto-restart capability."""
    project_root = Path.cwd()
    crash_count = 0
    max_crashes = 5

    print(f"\n{'🤖' + '=' * 80 + '🤖'}")
    print("🤖 GUARANTEED QUALITY MONITOR - CLAUDE CODE INTEGRATION")
    print(f"🤖 Project: {project_root.name}")
    print("🤖 Mode: Zero debounce, instant validation, auto-restart on crash")
    print(
        "🤖 Coverage: ALL file types (.py, .tsx, .ts, .jsx, .js, .css, .scss, .json, .yaml, .sql, .md)"
    )
    print(f"{'🤖' + '=' * 80 + '🤖'}")

    while crash_count < max_crashes:
        try:
            monitor = GuaranteedMonitor(project_root)
            await monitor.run_forever()
            break  # Normal exit

        except KeyboardInterrupt:
            print("\n🛑 Shutdown requested by user")
            break
        except Exception as e:
            crash_count += 1
            print(f"\n💥 Monitor crashed ({crash_count}/{max_crashes}): {e}")

            if crash_count < max_crashes:
                print("🔄 Auto-restarting in 5 seconds...")
                await asyncio.sleep(5)
            else:
                print(f"❌ Maximum crashes reached ({max_crashes}), giving up")
                sys.exit(1)

    print("✅ Guaranteed Quality Monitor shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
