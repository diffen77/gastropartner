#!/usr/bin/env python3
"""
Claude Integration Bridge - Seamless Quality Control Integration for Claude Code

This script serves as the bridge between Claude Code and the quality control system,
providing real-time validation feedback with automatic error correction loops.
"""

import asyncio
import sys
import time
import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add the quality-control directory to Python path
quality_control_dir = Path(__file__).parent
sys.path.insert(0, str(quality_control_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(quality_control_dir / ".env")

from agents.quality_control_agent import QualityControlAgent, ValidationResult
from feedback_processor import FeedbackProcessor, create_feedback_processor
from watchers.change_detector import ChangeDetector


class ClaudeIntegrationBridge:
    """
    Bridge between Claude Code and Quality Control System.
    
    Features:
    - Real-time validation of Claude's code changes
    - Structured feedback generation
    - Session tracking for learning
    - Performance monitoring
    - Automatic retry logic
    """
    
    def __init__(self):
        self.quality_agent = None
        self.feedback_processor = create_feedback_processor()
        self.change_detector = None
        self.session_start = time.time()
        self.validation_count = 0
        self.max_retries = 3
        
        # Performance tracking
        self.performance_stats = {
            "total_validations": 0,
            "successful_validations": 0,
            "total_errors_found": 0,
            "total_errors_fixed": 0,
            "average_validation_time": 0.0
        }
    
    def log_claude_message(self, level: str, message: str, details: str = ""):
        """Log messages specifically formatted for Claude Code understanding."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        if level == "start":
            print(f"\n{'🤖' + '='*78 + '🤖'}")
            print(f"🤖 [{timestamp}] QUALITY CONTROL BRIDGE ACTIVE: {message}")
            print(f"{'🤖' + '='*78 + '🤖'}")
        elif level == "success":
            print(f"\n{'✅' + '='*78 + '✅'}")
            print(f"✅ [{timestamp}] VALIDATION SUCCESS: {message}")
            if details:
                print(f"✅ Details: {details}")
            print(f"{'✅' + '='*78 + '✅'}")
        elif level == "error":
            print(f"\n{'❌' + '='*78 + '❌'}")
            print(f"❌ [{timestamp}] VALIDATION FAILED: {message}")
            if details:
                print(f"❌ Details: {details}")
            print(f"{'❌' + '='*78 + '❌'}")
        elif level == "info":
            print(f"ℹ️  [{timestamp}] {message}")
            if details:
                print(f"    {details}")
        elif level == "warning":
            print(f"⚠️  [{timestamp}] WARNING: {message}")
            if details:
                print(f"    {details}")
    
    async def initialize(self):
        """Initialize all quality control components."""
        self.log_claude_message("start", "Initializing Quality Control System")
        
        try:
            # Initialize quality control agent
            self.log_claude_message("info", "Loading PydanticAI quality agents...")
            self.quality_agent = QualityControlAgent()
            
            # Initialize change detector  
            self.log_claude_message("info", "Initializing change detection system...")
            self.change_detector = ChangeDetector()
            
            # Test agent connectivity
            self.log_claude_message("info", "Testing agent connectivity...")
            stats = self.quality_agent.get_stats()
            
            self.log_claude_message("success", "All systems initialized successfully", 
                                  f"Active agents: {stats.get('active_agents', 'Unknown')}")
            
        except Exception as e:
            self.log_claude_message("error", "Failed to initialize quality control", str(e))
            raise
    
    def filter_relevant_files(self, file_paths: List[str]) -> List[str]:
        """Filter files to only include those relevant for quality control."""
        relevant_files = []
        
        for file_path in file_paths:
            path = Path(file_path)
            
            # Check if file exists
            if not path.exists():
                self.log_claude_message("warning", f"File not found: {path.name}")
                continue
            
            # Check if file type is relevant
            valid_extensions = {'.py', '.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json'}
            if path.suffix.lower() not in valid_extensions:
                continue
            
            # Exclude certain patterns
            exclude_patterns = [
                'node_modules', '__pycache__', '.git', '.pytest_cache',
                '.coverage', 'dist', 'build', '.next', '.vscode',
                'test-results', 'playwright-report', '.mypy_cache'
            ]
            
            if any(pattern in str(path) for pattern in exclude_patterns):
                continue
            
            relevant_files.append(file_path)
        
        return relevant_files
    
    async def validate_files(
        self, 
        file_paths: List[str], 
        validation_types: List[str] = None
    ) -> Dict[str, Any]:
        """
        Validate files and return structured feedback.
        
        Args:
            file_paths: List of file paths to validate
            validation_types: Optional list of validation types to run
            
        Returns:
            Dictionary with validation results and Claude feedback
        """
        start_time = time.time()
        
        # Filter to relevant files only
        relevant_files = self.filter_relevant_files(file_paths)
        
        if not relevant_files:
            self.log_claude_message("info", "No files require validation")
            return {
                "success": True,
                "message": "No files require validation",
                "files_validated": 0,
                "feedback": None
            }
        
        self.validation_count += 1
        file_names = [Path(f).name for f in relevant_files]
        
        self.log_claude_message("start", f"Validation #{self.validation_count}")
        self.log_claude_message("info", f"Validating {len(relevant_files)} files", 
                               f"Files: {', '.join(file_names)}")
        
        # Log agent activity
        print(f"🛡️  SECURITY AGENT: Scanning for multi-tenant violations...")
        print(f"⚙️  BACKEND AGENT: Checking Python code quality and performance...")
        print(f"🎨 FRONTEND AGENT: Validating TypeScript/React patterns...")
        print(f"🔧 FUNCTIONAL AGENT: Testing business logic compliance...")
        print(f"🎯 DESIGN AGENT: Verifying UI consistency and accessibility...")
        
        try:
            # Run validation through quality agent
            validation_results = await self.quality_agent.validate_multiple_files(relevant_files)
            validation_time = time.time() - start_time
            
            # Process results through feedback processor
            feedback = self.feedback_processor.process_validation_results(
                validation_results, validation_time
            )
            
            # Update performance stats
            self.performance_stats["total_validations"] += 1
            if feedback.success:
                self.performance_stats["successful_validations"] += 1
            else:
                self.performance_stats["total_errors_found"] += feedback.total_errors
            
            # Update average validation time
            current_avg = self.performance_stats["average_validation_time"]
            total_validations = self.performance_stats["total_validations"]
            self.performance_stats["average_validation_time"] = (
                (current_avg * (total_validations - 1) + validation_time) / total_validations
            )
            
            # Log results
            if feedback.success:
                if feedback.total_warnings > 0:
                    self.log_claude_message("success", f"Validation passed with warnings", 
                                           f"{feedback.total_warnings} warnings in {validation_time:.2f}s")
                else:
                    self.log_claude_message("success", f"All validations passed", 
                                           f"Clean code in {validation_time:.2f}s")
            else:
                self.log_claude_message("error", f"Validation failed", 
                                       f"{feedback.total_errors} errors, {feedback.total_warnings} warnings")
            
            # Record validation with change detector
            for file_path in relevant_files:
                file_hash = self.change_detector.calculate_file_hash(file_path)
                file_results = validation_results.get(file_path, [])
                validation_passed = not any(r.severity == "error" for r in file_results)
                
                self.change_detector.record_validation_result(
                    file_path=file_path,
                    file_hash=file_hash,
                    results_count=len(file_results),
                    validation_passed=validation_passed
                )
            
            return {
                "success": feedback.success,
                "message": feedback.message,
                "files_validated": feedback.files_validated,
                "total_errors": feedback.total_errors,
                "total_warnings": feedback.total_warnings,
                "validation_time": feedback.validation_time,
                "feedback": feedback,
                "raw_results": validation_results
            }
            
        except Exception as e:
            validation_time = time.time() - start_time
            self.log_claude_message("error", f"Validation failed with exception", str(e))
            
            return {
                "success": False,
                "message": f"Quality control system error: {e}",
                "files_validated": len(relevant_files),
                "total_errors": 1,
                "total_warnings": 0,
                "validation_time": validation_time,
                "error": str(e),
                "feedback": None
            }
    
    def print_claude_feedback(self, feedback_result: Dict[str, Any]):
        """Print formatted feedback specifically for Claude Code consumption."""
        
        if feedback_result.get("feedback"):
            # Use the feedback processor's formatted output
            claude_text = self.feedback_processor.format_for_claude(feedback_result["feedback"])
            print(claude_text)
        else:
            # Fallback for simple messages
            print(f"\n{'='*80}")
            print(f"🤖 QUALITY CONTROL FEEDBACK FOR CLAUDE")
            print(f"{'='*80}")
            print(f"\n{feedback_result['message']}")
            
            if not feedback_result["success"] and "error" in feedback_result:
                print(f"\n❌ Error Details: {feedback_result['error']}")
                print(f"\n🔧 Please check the logs and fix any system issues.")
            
            print(f"\n{'='*80}")
            if feedback_result["success"]:
                print("✅ QUALITY VALIDATION COMPLETE - READY TO PROCEED")
            else:
                print("⚠️  SYSTEM ERROR - PLEASE INVESTIGATE AND RETRY")
            print(f"{'='*80}")
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for monitoring."""
        session_time = time.time() - self.session_start
        
        return {
            "session_time": session_time,
            "validations_completed": self.validation_count,
            "validations_per_minute": (self.validation_count / session_time * 60) if session_time > 0 else 0,
            "performance_stats": self.performance_stats,
            "success_rate": (
                self.performance_stats["successful_validations"] / 
                max(self.performance_stats["total_validations"], 1)
            ) * 100
        }


async def main():
    """Main entry point for Claude integration."""
    if len(sys.argv) < 2:
        print("Usage: python claude_integration.py <file1> [file2] ...")
        sys.exit(1)
    
    # Get files to validate from arguments
    files_to_validate = []
    for file_arg in sys.argv[1:]:
        file_path = Path(file_arg).resolve()
        if file_path.exists():
            files_to_validate.append(str(file_path))
        else:
            print(f"⚠️  File not found: {file_path}")
    
    if not files_to_validate:
        print("⚠️  No valid files provided for validation")
        sys.exit(0)
    
    # Initialize and run Claude integration bridge
    bridge = ClaudeIntegrationBridge()
    
    try:
        await bridge.initialize()
        
        # Run validation
        result = await bridge.validate_files(files_to_validate)
        
        # Print feedback for Claude
        bridge.print_claude_feedback(result)
        
        # Print performance summary for monitoring
        if os.getenv("DEBUG", "").lower() in ("1", "true", "yes"):
            perf_summary = bridge.get_performance_summary()
            print(f"\n📊 Performance Summary:")
            print(f"   Session time: {perf_summary['session_time']:.2f}s")
            print(f"   Validations: {perf_summary['validations_completed']}")
            print(f"   Success rate: {perf_summary['success_rate']:.1f}%")
            print(f"   Avg validation time: {perf_summary['performance_stats']['average_validation_time']:.2f}s")
        
        # Exit with error code if validation failed
        if not result["success"]:
            sys.exit(1)
        
        print("\n🎉 Quality control integration completed successfully!")
        
    except KeyboardInterrupt:
        print("\n⚠️  Quality control interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Quality control system failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())