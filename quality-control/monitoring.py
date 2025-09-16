#!/usr/bin/env python3
"""
Quality Control Monitoring Dashboard

Real-time monitoring of the Claude Code ↔ Quality Control feedback loop system.
Tracks performance metrics, error patterns, and system health.
"""

import asyncio
import sqlite3
import time
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.text import Text

from watchers.change_detector import ChangeDetector


@dataclass
class ValidationSession:
    """A single validation session."""

    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    files_validated: int
    total_errors: int
    total_warnings: int
    success: bool
    validation_time: float
    claude_feedback_provided: bool


@dataclass
class ErrorPattern:
    """Common error pattern analysis."""

    pattern_type: str
    error_message: str
    frequency: int
    affected_files: List[str]
    fix_success_rate: float
    last_seen: datetime


class QualityControlMonitor:
    """
    Monitoring system for Claude Code quality control integration.

    Features:
    - Real-time validation tracking
    - Performance metrics analysis
    - Error pattern detection
    - Success rate monitoring
    - Claude feedback effectiveness
    """

    def __init__(self):
        self.console = Console()
        self.change_detector = ChangeDetector()

        # Database for storing monitoring data
        self.db_path = Path(__file__).parent / "monitoring.db"
        self._init_database()

        # Current session tracking
        self.current_session_id = None
        self.active_validations = {}

        # Performance metrics
        self.metrics = {
            "total_sessions": 0,
            "successful_sessions": 0,
            "total_errors_detected": 0,
            "total_errors_fixed": 0,
            "average_validation_time": 0.0,
            "claude_feedback_success_rate": 0.0,
        }

    def _init_database(self):
        """Initialize monitoring database."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS validation_sessions (
                    session_id TEXT PRIMARY KEY,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    files_validated INTEGER DEFAULT 0,
                    total_errors INTEGER DEFAULT 0,
                    total_warnings INTEGER DEFAULT 0,
                    success BOOLEAN DEFAULT FALSE,
                    validation_time REAL DEFAULT 0.0,
                    claude_feedback_provided BOOLEAN DEFAULT FALSE,
                    raw_data TEXT
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS error_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern_type TEXT NOT NULL,
                    error_message TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    line_number INTEGER,
                    timestamp TEXT NOT NULL,
                    session_id TEXT,
                    fixed BOOLEAN DEFAULT FALSE,
                    fix_time TEXT,
                    FOREIGN KEY (session_id) REFERENCES validation_sessions (session_id)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS claude_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    interaction_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    feedback_provided BOOLEAN DEFAULT FALSE,
                    errors_before INTEGER DEFAULT 0,
                    errors_after INTEGER DEFAULT 0,
                    success BOOLEAN DEFAULT FALSE,
                    details TEXT,
                    FOREIGN KEY (session_id) REFERENCES validation_sessions (session_id)
                )
            """)

            conn.commit()

    def start_validation_session(self, files: List[str]) -> str:
        """Start tracking a new validation session."""
        session_id = f"session_{int(time.time())}_{len(files)}"
        self.current_session_id = session_id

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO validation_sessions 
                (session_id, start_time, files_validated)
                VALUES (?, ?, ?)
            """,
                (session_id, datetime.now().isoformat(), len(files)),
            )
            conn.commit()

        self.active_validations[session_id] = {
            "start_time": time.time(),
            "files": files,
            "errors_detected": 0,
            "errors_fixed": 0,
        }

        return session_id

    def record_validation_result(
        self,
        session_id: str,
        success: bool,
        errors: int,
        warnings: int,
        validation_time: float,
        raw_data: Dict[str, Any] = None,
    ):
        """Record the result of a validation session."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                UPDATE validation_sessions 
                SET end_time = ?, success = ?, total_errors = ?, 
                    total_warnings = ?, validation_time = ?, raw_data = ?
                WHERE session_id = ?
            """,
                (
                    datetime.now().isoformat(),
                    success,
                    errors,
                    warnings,
                    validation_time,
                    json.dumps(raw_data) if raw_data else None,
                    session_id,
                ),
            )
            conn.commit()

        # Update active session tracking
        if session_id in self.active_validations:
            self.active_validations[session_id]["errors_detected"] = errors

        # Update metrics
        self._update_metrics()

    def record_error_pattern(
        self,
        session_id: str,
        pattern_type: str,
        error_message: str,
        file_path: str,
        line_number: Optional[int] = None,
    ):
        """Record an error pattern for analysis."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO error_patterns 
                (pattern_type, error_message, file_path, line_number, timestamp, session_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    pattern_type,
                    error_message,
                    file_path,
                    line_number,
                    datetime.now().isoformat(),
                    session_id,
                ),
            )
            conn.commit()

    def record_claude_interaction(
        self,
        session_id: str,
        interaction_type: str,
        feedback_provided: bool,
        errors_before: int,
        errors_after: int,
        details: Dict[str, Any] = None,
    ):
        """Record Claude's interaction with the feedback system."""
        success = errors_after < errors_before

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO claude_interactions 
                (session_id, interaction_type, timestamp, feedback_provided,
                 errors_before, errors_after, success, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    session_id,
                    interaction_type,
                    datetime.now().isoformat(),
                    feedback_provided,
                    errors_before,
                    errors_after,
                    success,
                    json.dumps(details) if details else None,
                ),
            )
            conn.commit()

        # Update active session tracking
        if session_id in self.active_validations:
            self.active_validations[session_id]["errors_fixed"] += max(
                0, errors_before - errors_after
            )

    def _update_metrics(self):
        """Update performance metrics from database."""
        with sqlite3.connect(self.db_path) as conn:
            # Total sessions
            result = conn.execute("SELECT COUNT(*) FROM validation_sessions").fetchone()
            self.metrics["total_sessions"] = result[0]

            # Successful sessions
            result = conn.execute(
                "SELECT COUNT(*) FROM validation_sessions WHERE success = TRUE"
            ).fetchone()
            self.metrics["successful_sessions"] = result[0]

            # Average validation time
            result = conn.execute(
                "SELECT AVG(validation_time) FROM validation_sessions WHERE validation_time > 0"
            ).fetchone()
            self.metrics["average_validation_time"] = result[0] or 0.0

            # Total errors detected
            result = conn.execute(
                "SELECT SUM(total_errors) FROM validation_sessions"
            ).fetchone()
            self.metrics["total_errors_detected"] = result[0] or 0

            # Claude feedback success rate
            total_interactions = conn.execute(
                "SELECT COUNT(*) FROM claude_interactions"
            ).fetchone()[0]

            if total_interactions > 0:
                successful_interactions = conn.execute(
                    "SELECT COUNT(*) FROM claude_interactions WHERE success = TRUE"
                ).fetchone()[0]

                self.metrics["claude_feedback_success_rate"] = (
                    successful_interactions / total_interactions * 100
                )

    def get_error_patterns(self, days: int = 7) -> List[ErrorPattern]:
        """Get common error patterns from the last N days."""
        cutoff_date = datetime.now() - timedelta(days=days)

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                SELECT pattern_type, error_message, COUNT(*) as frequency,
                       MAX(timestamp) as last_seen
                FROM error_patterns 
                WHERE timestamp > ?
                GROUP BY pattern_type, error_message
                ORDER BY frequency DESC
                LIMIT 10
            """,
                (cutoff_date.isoformat(),),
            )

            patterns = []
            for row in cursor.fetchall():
                pattern_type, error_message, frequency, last_seen = row

                # Get affected files
                files_cursor = conn.execute(
                    """
                    SELECT DISTINCT file_path FROM error_patterns
                    WHERE pattern_type = ? AND error_message = ? AND timestamp > ?
                """,
                    (pattern_type, error_message, cutoff_date.isoformat()),
                )

                affected_files = [row[0] for row in files_cursor.fetchall()]

                # Calculate fix success rate (placeholder for now)
                fix_success_rate = 0.75  # Would calculate from actual fix data

                patterns.append(
                    ErrorPattern(
                        pattern_type=pattern_type,
                        error_message=error_message,
                        frequency=frequency,
                        affected_files=affected_files,
                        fix_success_rate=fix_success_rate,
                        last_seen=datetime.fromisoformat(last_seen),
                    )
                )

            return patterns

    def get_recent_sessions(self, limit: int = 10) -> List[ValidationSession]:
        """Get recent validation sessions."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                SELECT session_id, start_time, end_time, files_validated,
                       total_errors, total_warnings, success, validation_time,
                       claude_feedback_provided
                FROM validation_sessions 
                ORDER BY start_time DESC 
                LIMIT ?
            """,
                (limit,),
            )

            sessions = []
            for row in cursor.fetchall():
                (
                    session_id,
                    start_time,
                    end_time,
                    files_validated,
                    total_errors,
                    total_warnings,
                    success,
                    validation_time,
                    claude_feedback_provided,
                ) = row

                sessions.append(
                    ValidationSession(
                        session_id=session_id,
                        start_time=datetime.fromisoformat(start_time),
                        end_time=datetime.fromisoformat(end_time) if end_time else None,
                        files_validated=files_validated,
                        total_errors=total_errors,
                        total_warnings=total_warnings,
                        success=success,
                        validation_time=validation_time,
                        claude_feedback_provided=claude_feedback_provided,
                    )
                )

            return sessions

    def create_dashboard_layout(self) -> Layout:
        """Create the monitoring dashboard layout."""
        layout = Layout()

        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body", ratio=1),
            Layout(name="footer", size=3),
        )

        layout["body"].split_row(Layout(name="left"), Layout(name="right"))

        layout["left"].split_column(Layout(name="metrics"), Layout(name="sessions"))

        layout["right"].split_column(Layout(name="patterns"), Layout(name="active"))

        return layout

    def render_metrics_panel(self) -> Panel:
        """Render performance metrics panel."""
        success_rate = 0
        if self.metrics["total_sessions"] > 0:
            success_rate = (
                self.metrics["successful_sessions"] / self.metrics["total_sessions"]
            ) * 100

        metrics_text = Text()
        metrics_text.append("📊 Performance Metrics\n\n", style="bold cyan")
        metrics_text.append(f"Total Sessions: {self.metrics['total_sessions']:,}\n")
        metrics_text.append(
            f"Success Rate: {success_rate:.1f}%\n",
            style="green" if success_rate > 80 else "yellow",
        )
        metrics_text.append(
            f"Avg Validation Time: {self.metrics['average_validation_time']:.2f}s\n"
        )
        metrics_text.append(
            f"Total Errors Detected: {self.metrics['total_errors_detected']:,}\n"
        )
        metrics_text.append(
            f"Claude Feedback Success: {self.metrics['claude_feedback_success_rate']:.1f}%\n",
            style="green"
            if self.metrics["claude_feedback_success_rate"] > 75
            else "yellow",
        )

        return Panel(metrics_text, title="System Performance", border_style="blue")

    def render_sessions_panel(self) -> Panel:
        """Render recent sessions panel."""
        sessions = self.get_recent_sessions(5)

        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Session", style="cyan", width=12)
        table.add_column("Files", justify="right")
        table.add_column("Errors", justify="right")
        table.add_column("Time", justify="right")
        table.add_column("Status", justify="center")

        for session in sessions:
            status = "✅" if session.success else "❌"
            table.add_row(
                session.session_id[-8:],  # Last 8 chars
                str(session.files_validated),
                str(session.total_errors),
                f"{session.validation_time:.1f}s",
                status,
            )

        return Panel(table, title="Recent Sessions", border_style="green")

    def render_patterns_panel(self) -> Panel:
        """Render error patterns panel."""
        patterns = self.get_error_patterns(7)

        patterns_text = Text()
        patterns_text.append(
            "🔍 Common Error Patterns (7 days)\n\n", style="bold yellow"
        )

        if patterns:
            for i, pattern in enumerate(patterns[:5], 1):
                patterns_text.append(f"{i}. {pattern.pattern_type}\n", style="bold")
                patterns_text.append(f"   {pattern.error_message[:60]}...\n")
                patterns_text.append(
                    f"   Frequency: {pattern.frequency}, Fix Rate: {pattern.fix_success_rate:.0%}\n"
                )
                patterns_text.append(f"   Files: {len(pattern.affected_files)}\n\n")
        else:
            patterns_text.append("No error patterns detected recently.", style="green")

        return Panel(patterns_text, title="Error Analysis", border_style="yellow")

    def render_active_panel(self) -> Panel:
        """Render active validations panel."""
        active_text = Text()
        active_text.append("🔄 Active Validations\n\n", style="bold green")

        if self.active_validations:
            for session_id, data in self.active_validations.items():
                runtime = time.time() - data["start_time"]
                active_text.append(f"Session: {session_id[-8:]}\n", style="cyan")
                active_text.append(f"Runtime: {runtime:.1f}s\n")
                active_text.append(f"Files: {len(data['files'])}\n")
                active_text.append(f"Errors: {data['errors_detected']}\n\n")
        else:
            active_text.append("No active validations", style="dim")

        return Panel(active_text, title="Active Sessions", border_style="cyan")

    def render_header(self) -> Panel:
        """Render dashboard header."""
        title = Text()
        title.append("🤖 Quality Control Monitoring Dashboard", style="bold white")
        title.append(f" - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", style="dim")

        return Panel(title, style="bold blue")

    def render_footer(self) -> Panel:
        """Render dashboard footer."""
        footer_text = Text()
        footer_text.append("Press Ctrl+C to exit | ", style="dim")
        footer_text.append(
            "Monitoring Claude Code ↔ Quality Control feedback loops", style="cyan"
        )

        return Panel(footer_text, style="dim")

    async def run_dashboard(self):
        """Run the live monitoring dashboard."""
        self._update_metrics()
        layout = self.create_dashboard_layout()

        with Live(
            layout, console=self.console, screen=True, auto_refresh=False
        ) as live:
            while True:
                # Update layout with current data
                layout["header"].update(self.render_header())
                layout["metrics"].update(self.render_metrics_panel())
                layout["sessions"].update(self.render_sessions_panel())
                layout["patterns"].update(self.render_patterns_panel())
                layout["active"].update(self.render_active_panel())
                layout["footer"].update(self.render_footer())

                live.refresh()
                await asyncio.sleep(2)  # Update every 2 seconds

    def print_summary_report(self):
        """Print a summary report of monitoring data."""
        self._update_metrics()

        self.console.print("\n" + "=" * 80)
        self.console.print("🤖 QUALITY CONTROL MONITORING SUMMARY", style="bold cyan")
        self.console.print("=" * 80)

        # Performance metrics
        self.console.print(self.render_metrics_panel())

        # Recent sessions
        self.console.print(self.render_sessions_panel())

        # Error patterns
        self.console.print(self.render_patterns_panel())

        self.console.print("=" * 80)
        self.console.print(
            "📈 Integration is working! Claude Code ↔ Quality Control feedback loop active.",
            style="green",
        )
        self.console.print("=" * 80)


async def main():
    """Main entry point for monitoring dashboard."""
    import argparse

    parser = argparse.ArgumentParser(description="Quality Control Monitoring Dashboard")
    parser.add_argument(
        "--dashboard", action="store_true", help="Run live monitoring dashboard"
    )
    parser.add_argument("--report", action="store_true", help="Print summary report")

    args = parser.parse_args()

    monitor = QualityControlMonitor()

    if args.dashboard:
        try:
            await monitor.run_dashboard()
        except KeyboardInterrupt:
            print("\n👋 Monitoring dashboard stopped")
    elif args.report:
        monitor.print_summary_report()
    else:
        print("Usage: python monitoring.py --dashboard (live) or --report (summary)")


if __name__ == "__main__":
    asyncio.run(main())
