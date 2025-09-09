#!/usr/bin/env python3
"""
Quality Control System - Main Entry Point

Automated quality control system for GastroPartner using PydanticAI agents.
"""

import asyncio
import argparse
import signal
import sys
import os
from pathlib import Path
from typing import Dict, Any

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

import sys
from pathlib import Path

# Add the quality-control directory to Python path
quality_control_dir = Path(__file__).parent
sys.path.insert(0, str(quality_control_dir))

from agents.quality_control_agent import QualityControlAgent
from watchers.file_monitor import FileMonitor
from watchers.change_detector import ChangeDetector


class QualityControlSystem:
    """Main quality control system orchestrator."""
    
    def __init__(self):
        self.console = Console()
        self.quality_agent = None
        self.file_monitor = None
        self.change_detector = None
        self.is_running = False
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.console.print("\n[yellow]📡 Received shutdown signal, stopping gracefully...[/yellow]")
        self.is_running = False
    
    async def initialize(self, config_path: str = None):
        """Initialize all system components."""
        self.console.print("[cyan]🚀 Initializing Quality Control System[/cyan]")
        
        try:
            # Initialize core agent
            self.quality_agent = QualityControlAgent(config_path)
            self.console.print("[green]✓[/green] Quality control agent initialized")
            
            # Initialize change detector
            self.change_detector = ChangeDetector()
            self.console.print("[green]✓[/green] Change detector initialized")
            
            # Initialize file monitor
            project_root = Path(__file__).parent.parent
            monitor_config = {
                "debounce_delay": 0.1,  # AGGRESSIVE: Much faster response for ALWAYS validation
                "watch_paths": [
                    str(project_root / "gastropartner-frontend" / "src"),
                    str(project_root / "gastropartner-backend" / "src")
                ]
            }
            self.file_monitor = FileMonitor(self.quality_agent, monitor_config)
            self.console.print("[green]✓[/green] File monitor initialized")
            
            # Add callback to record validation results
            self.file_monitor.add_validation_callback(self._on_validation_complete)
            
            self.console.print("[green]🎉 System initialization completed successfully[/green]")
            
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
            validation_passed=validation_passed
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
                self.file_monitor.worker_task = asyncio.create_task(self.file_monitor._validation_worker())
            
            self.file_monitor.start_monitoring()
            self.is_running = True
            
            # Display welcome panel
            welcome_text = Text()
            welcome_text.append("🔍 Quality Control System is now monitoring your files\n\n", style="bold green")
            welcome_text.append("Features active:\n", style="bold")
            welcome_text.append("• Multi-tenant security validation\n", style="green")
            welcome_text.append("• TypeScript/React functional checks\n", style="green")  
            welcome_text.append("• Design system consistency\n", style="green")
            welcome_text.append("• Python/FastAPI backend validation\n", style="green")
            welcome_text.append("• Real-time feedback on file changes\n\n", style="green")
            welcome_text.append("Press Ctrl+C to stop monitoring", style="yellow")
            
            panel = Panel(welcome_text, title="🛡️ Quality Control Active", border_style="green")
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
                self.console.print("[green]✅ Validation completed successfully[/green]")
            else:
                self.console.print(f"[red]❌ Validation failed with {errors} errors[/red]")
            
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
            batch = [str(f) for f in files[i:i + batch_size]]
            results_dict = await self.quality_agent.validate_multiple_files(batch)
            
            for file_path, results in results_dict.items():
                errors = sum(1 for r in results if r.severity == "error")
                warnings = sum(1 for r in results if r.severity == "warning")
                
                total_errors += errors
                total_warnings += warnings
                
                # Show summary for each file
                status = "✅" if errors == 0 else "❌"
                self.console.print(f"{status} {Path(file_path).name}: {errors} errors, {warnings} warnings")
                
                # Record results
                self._on_validation_complete(file_path, results)
        
        # Final summary
        self.console.print(f"\n[bold]📊 Directory validation completed:[/bold]")
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
                stats_text.append(f"{key.replace('_', ' ').title()}: {value}\n", style="green")
            
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
                self.console.print(f"  {file_type}: {success_rate:.1f}% success rate, {avg_time:.1f}ms avg time")
        
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


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="GastroPartner Quality Control System")
    parser.add_argument("--config", help="Path to configuration file")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Monitor command
    monitor_parser = subparsers.add_parser("monitor", help="Start real-time monitoring")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate files or directories")
    validate_parser.add_argument("target", nargs='+', help="File(s) or directory to validate")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Show system status")
    
    # Patterns command
    patterns_parser = subparsers.add_parser("patterns", help="Show change patterns analysis")
    
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