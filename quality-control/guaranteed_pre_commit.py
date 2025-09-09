#!/usr/bin/env python3
"""
Guaranteed Pre-Commit Quality Control

This script integrates with the existing pre-commit system to provide
an additional layer of quality validation before commits are allowed.
It works alongside the existing pre-commit hooks.
"""

import sys
import subprocess
import os
from pathlib import Path
from typing import List, Dict, Any
import json

# Add the quality-control directory to Python path
quality_control_dir = Path(__file__).parent
sys.path.insert(0, str(quality_control_dir))

from agents.quality_control_agent import QualityControlAgent


def log_banner(message: str, level: str = "info"):
    """Print banner message."""
    timestamp = __import__('datetime').datetime.now().strftime("%H:%M:%S")
    
    if level == "error":
        print(f"\n{'❌' + '='*70 + '❌'}")
        print(f"❌ [{timestamp}] PRE-COMMIT FAILED: {message}")
        print(f"{'❌' + '='*70 + '❌'}")
    elif level == "success":
        print(f"\n{'✅' + '='*70 + '✅'}")
        print(f"✅ [{timestamp}] PRE-COMMIT SUCCESS: {message}")
        print(f"{'✅' + '='*70 + '✅'}")
    else:
        print(f"🚨 [{timestamp}] PRE-COMMIT: {message}")


def get_staged_files() -> List[str]:
    """Get staged files that need validation."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
            capture_output=True,
            text=True,
            cwd=Path.cwd()
        )
        
        if result.returncode != 0:
            return []
        
        staged_files = []
        for file in result.stdout.strip().split('\n'):
            if file and Path(file).exists():
                # Check for supported extensions
                if file.endswith(('.py', '.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '.yaml', '.yml', '.sql', '.md')):
                    staged_files.append(str(Path(file).resolve()))
        
        return staged_files
    
    except subprocess.SubprocessError:
        return []


async def validate_files(files: List[str]) -> Dict[str, Any]:
    """Validate staged files with quality control."""
    if not files:
        return {"success": True, "message": "No files to validate"}
    
    log_banner(f"Validating {len(files)} staged files")
    
    # Show files being validated
    for file in files:
        rel_path = Path(file).relative_to(Path.cwd())
        print(f"📄 Validating: {rel_path}")
    
    try:
        # Initialize quality agent
        quality_agent = QualityControlAgent()
        
        # Run validation
        results_dict = await quality_agent.validate_multiple_files(files)
        
        total_errors = 0
        total_warnings = 0
        error_details = []
        
        for file_path, results in results_dict.items():
            errors = [r for r in results if r.severity == "error"]
            warnings = [r for r in results if r.severity == "warning"]
            
            total_errors += len(errors)
            total_warnings += len(warnings)
            
            # Collect error details
            for error in errors:
                error_details.append({
                    "file": Path(file_path).relative_to(Path.cwd()),
                    "line": error.line_number,
                    "message": error.message,
                    "rule": error.rule_id
                })
        
        success = total_errors == 0
        
        if success:
            log_banner(f"All {len(files)} files passed validation ({total_warnings} warnings)", "success")
        else:
            log_banner(f"Found {total_errors} errors in staged files", "error")
            
            # Display errors
            print(f"\n🔧 ERRORS THAT MUST BE FIXED BEFORE COMMIT:")
            for error in error_details:
                print(f"\n📁 {error['file']}")
                if error['line']:
                    print(f"   📍 Line {error['line']}: {error['message']}")
                else:
                    print(f"   ❌ {error['message']}")
        
        return {
            "success": success,
            "files_validated": len(files),
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "error_details": error_details
        }
    
    except Exception as e:
        log_banner(f"Validation system error: {e}", "error")
        return {
            "success": False,
            "error": str(e),
            "message": f"Quality control system failed: {e}"
        }


async def main():
    """Main pre-commit validation."""
    print(f"\n🚨 GUARANTEED QUALITY CONTROL - PRE-COMMIT VALIDATION")
    print(f"🚨 Ensuring all staged files meet quality standards")
    
    # Get staged files
    staged_files = get_staged_files()
    
    if not staged_files:
        log_banner("No staged files require validation", "success")
        return 0
    
    # Validate files
    result = await validate_files(staged_files)
    
    if result["success"]:
        print(f"\n✅ Pre-commit validation passed!")
        print(f"✅ Safe to commit {result['files_validated']} files")
        return 0
    else:
        print(f"\n❌ Pre-commit validation failed!")
        print(f"❌ Fix {result['total_errors']} errors before committing")
        print(f"\n💡 After fixing errors, stage changes and try committing again")
        return 1


if __name__ == "__main__":
    import asyncio
    sys.exit(asyncio.run(main()))