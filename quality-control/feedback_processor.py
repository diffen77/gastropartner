#!/usr/bin/env python3
"""
Feedback Processor - Claude-friendly validation feedback formatting

This module processes validation results and formats them into actionable
feedback that Claude Code can understand and act upon.
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

from agents.quality_control_agent import ValidationResult

# Archon MCP client for task creation
ARCHON_PROJECT_ID = "9108cfbd-75a5-48dd-bed4-ac0b490a35b9"


@dataclass
class ClaudeFeedback:
    """Structured feedback for Claude Code."""

    success: bool
    message: str
    files_validated: int
    total_errors: int
    total_warnings: int
    validation_time: float
    error_details: List[Dict[str, Any]]
    fix_suggestions: List[str]
    retry_recommended: bool
    session_id: str


@dataclass
class ErrorDetail:
    """Detailed error information for Claude."""

    file: str
    line: Optional[int]
    column: Optional[int]
    severity: str
    message: str
    rule_id: Optional[str]
    fix_suggestion: Optional[str]
    code_example: Optional[str]
    priority: int  # 1-5, 1 being highest priority


class FeedbackProcessor:
    """
    Processes validation results into Claude-friendly feedback.

    Features:
    - Structured error reporting
    - Actionable fix suggestions
    - Priority-based error ordering
    - Context-aware messaging
    - Session tracking for learning
    """

    def __init__(self):
        self.session_id = f"validation_{int(time.time())}"
        self.feedback_templates = self._load_feedback_templates()
        self.fix_patterns = self._load_fix_patterns()
        self._initialize_archon_client()

    def _load_feedback_templates(self) -> Dict[str, str]:
        """Load feedback message templates."""
        return {
            "success": "✅ Quality validation passed for {files_validated} files in {validation_time:.2f}s",
            "success_with_warnings": "⚠️ Quality validation passed with {total_warnings} warnings in {files_validated} files",
            "errors_found": "❌ Found {total_errors} errors in {files_validated} files that must be fixed",
            "critical_errors": "🚨 CRITICAL: Found {critical_count} critical security/data issues that require immediate attention",
            "multi_tenant_violation": "🚨 MULTI-TENANT SECURITY VIOLATION: This code could leak customer data between organizations",
            "retry_recommended": "🔄 Please fix the errors above and I will re-validate automatically",
            "timeout": "⏱️ Quality validation timed out - code complexity may be too high",
            "agent_failure": "🤖 Quality agent failed to complete validation - please check the error logs",
        }

    def _load_fix_patterns(self) -> Dict[str, Dict[str, str]]:
        """Load common error patterns and their fixes."""
        return {
            "multi_tenant": {
                "pattern": "organization_id",
                "fix": "Add .filter(organization_id=current_user.organization_id) to all queries",
                "example": "users = db.query(User).filter(User.organization_id == current_user.organization_id).all()",
            },
            "sql_injection": {
                "pattern": "sql.*format|%.*sql",
                "fix": "Use parameterized queries instead of string formatting",
                "example": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))",
            },
            "missing_auth": {
                "pattern": "auth|token|permission",
                "fix": "Add proper authentication and authorization checks",
                "example": "@require_auth\n@require_permission('read:users')\nasync def get_users():",
            },
            "type_error": {
                "pattern": "type.*error|typing",
                "fix": "Add proper type hints and handle type conversion",
                "example": "def process_data(data: List[Dict[str, Any]]) -> Dict[str, int]:",
            },
            "react_hook": {
                "pattern": "hook.*dependency|useEffect",
                "fix": "Add missing dependencies to useEffect hook",
                "example": "useEffect(() => { ... }, [dependency1, dependency2])",
            },
        }

    def _initialize_archon_client(self):
        """Initialize Archon MCP client connection."""
        self.archon_available = True
        # MCP client will be available through Claude Code's environment
        # No explicit client initialization needed

    def _create_archon_task_for_error(
        self, error_detail: "ErrorDetail", fix_suggestion: str = None
    ):
        """Create an Archon task for a quality control error."""
        if not self.archon_available:
            return

        try:
            # Determine priority based on error severity
            priority_map = {1: 10, 2: 8, 3: 6, 4: 4, 5: 2}
            task_order = priority_map.get(error_detail.priority, 5)

            # Create task title
            severity_emoji = {"1": "🚨", "2": "⚠️", "3": "❌", "4": "💡", "5": "ℹ️"}
            emoji = severity_emoji.get(str(error_detail.priority), "❌")

            task_title = (
                f"{emoji} Fix {error_detail.severity}: {error_detail.message[:80]}"
            )
            if len(error_detail.message) > 80:
                task_title += "..."

            # Create detailed description
            description_parts = [
                "**Quality Control Issue Detected**",
                "",
                f"**File:** {error_detail.file}",
                f"**Line:** {error_detail.line if error_detail.line else 'N/A'}",
                f"**Severity:** {error_detail.severity.upper()}",
                f"**Priority:** {error_detail.priority}/5 (1=Critical, 5=Low)",
                f"**Rule ID:** {error_detail.rule_id if error_detail.rule_id else 'N/A'}",
                "",
                "**Issue Description:**",
                f"{error_detail.message}",
                "",
            ]

            if fix_suggestion:
                description_parts.extend(
                    ["**Recommended Fix:**", f"{fix_suggestion}", ""]
                )

            if error_detail.code_example:
                description_parts.extend(
                    [
                        "**Code Example:**",
                        "```",
                        f"{error_detail.code_example}",
                        "```",
                        "",
                    ]
                )

            description_parts.extend(
                [
                    f"**Detection Session:** {self.session_id}",
                    "**Auto-generated by:** Quality Control System",
                    f"**Timestamp:** {datetime.now().isoformat()}",
                ]
            )

            description = "\n".join(description_parts)

            # Assign based on error type
            assignee = self._determine_assignee(error_detail)

            # Create feature tag based on file type
            feature = self._determine_feature_tag(error_detail.file)

            # Call Archon MCP to create task
            # This will be handled by Claude Code's MCP integration
            print(
                f"Creating Archon task for error in {error_detail.file}:{error_detail.line}"
            )
            print(f"Task: {task_title}")
            print(f"Assignee: {assignee}")
            print(f"Priority: {task_order}")

            # The actual MCP call will be made by Claude Code
            # We'll format the request for logging/debugging
            task_request = {
                "action": "create",
                "project_id": ARCHON_PROJECT_ID,
                "title": task_title,
                "description": description,
                "assignee": assignee,
                "task_order": task_order,
                "feature": feature,
            }

            # Store for potential batch processing
            if not hasattr(self, "_pending_archon_tasks"):
                self._pending_archon_tasks = []
            self._pending_archon_tasks.append(task_request)

        except Exception as e:
            print(f"Failed to create Archon task for error: {e}")
            # Don't fail the entire validation process if task creation fails

    def _determine_assignee(self, error_detail: "ErrorDetail") -> str:
        """Determine appropriate assignee based on error type."""
        message_lower = error_detail.message.lower()

        # Security issues go to security specialist
        if any(
            keyword in message_lower
            for keyword in [
                "organization_id",
                "multi-tenant",
                "sql injection",
                "auth",
                "security",
            ]
        ):
            return "AI IDE Agent"  # High-priority, needs immediate attention

        # Frontend/UI issues
        if any(
            keyword in message_lower
            for keyword in ["react", "component", "hook", "jsx", "tsx", "css", "ui"]
        ):
            return "AI IDE Agent"

        # Backend/API issues
        if any(
            keyword in message_lower
            for keyword in ["api", "database", "query", "model", "repository"]
        ):
            return "AI IDE Agent"

        # General code quality
        return "AI IDE Agent"

    def _determine_feature_tag(self, filename: str) -> str:
        """Determine feature tag based on filename."""
        filename_lower = filename.lower()

        if "auth" in filename_lower:
            return "authentication"
        elif "recipe" in filename_lower:
            return "recipes"
        elif "ingredient" in filename_lower:
            return "ingredients"
        elif "organization" in filename_lower:
            return "organizations"
        elif "user" in filename_lower:
            return "user-management"
        elif "api" in filename_lower:
            return "api"
        elif (
            "component" in filename_lower
            or "tsx" in filename_lower
            or "jsx" in filename_lower
        ):
            return "frontend"
        else:
            return "code-quality"

    def _create_archon_tasks_for_errors(
        self, error_details: List["ErrorDetail"], fix_suggestions: List[str]
    ):
        """Create Archon tasks for all errors found during validation."""
        if not error_details:
            return

        print(
            f"\n🚨 CREATING ARCHON TASKS FOR {len(error_details)} QUALITY CONTROL ERRORS"
        )

        # Group fix suggestions by error for better task descriptions
        fix_map = {}
        for suggestion in fix_suggestions:
            # Extract relevant parts from fix suggestions to map to errors
            # This is a simple approach - could be enhanced with more sophisticated matching
            if "organization_id" in suggestion.lower():
                fix_map["multi_tenant"] = suggestion
            elif "auth" in suggestion.lower():
                fix_map["auth"] = suggestion
            elif "type" in suggestion.lower():
                fix_map["type"] = suggestion
            elif "hook" in suggestion.lower():
                fix_map["hook"] = suggestion

        # Create a task for each error
        for error_detail in error_details:
            # Find relevant fix suggestion
            relevant_fix = None
            error_msg_lower = error_detail.message.lower()

            if (
                "organization_id" in error_msg_lower
                or "multi-tenant" in error_msg_lower
            ):
                relevant_fix = fix_map.get("multi_tenant")
            elif "auth" in error_msg_lower:
                relevant_fix = fix_map.get("auth")
            elif "type" in error_msg_lower:
                relevant_fix = fix_map.get("type")
            elif "hook" in error_msg_lower or "useeffect" in error_msg_lower:
                relevant_fix = fix_map.get("hook")

            self._create_archon_task_for_error(error_detail, relevant_fix)

        # If we have pending tasks, show summary
        if hasattr(self, "_pending_archon_tasks"):
            print(
                f"📋 Prepared {len(self._pending_archon_tasks)} Archon tasks for creation"
            )
            print(f"🎯 Project ID: {ARCHON_PROJECT_ID}")

    def get_pending_archon_tasks(self) -> List[Dict[str, Any]]:
        """Get list of pending Archon tasks to be created."""
        return getattr(self, "_pending_archon_tasks", [])

    def process_validation_results(
        self, results: Dict[str, List[ValidationResult]], validation_time: float
    ) -> ClaudeFeedback:
        """
        Process validation results into Claude-friendly feedback.

        Args:
            results: Dictionary of file paths to validation results
            validation_time: Time taken for validation in seconds

        Returns:
            Structured feedback for Claude Code
        """
        # Collect statistics
        total_errors = sum(
            len([r for r in file_results if r.severity == "error"])
            for file_results in results.values()
        )
        total_warnings = sum(
            len([r for r in file_results if r.severity == "warning"])
            for file_results in results.values()
        )
        files_validated = len(results)

        # Process errors with priority and fix suggestions
        error_details = self._process_errors(results)
        fix_suggestions = self._generate_fix_suggestions(error_details)

        # Create Archon tasks for all errors found
        self._create_archon_tasks_for_errors(error_details, fix_suggestions)

        # Determine success status
        success = total_errors == 0

        # Generate main message
        message = self._generate_main_message(
            success,
            total_errors,
            total_warnings,
            files_validated,
            validation_time,
            error_details,
        )

        # Determine if retry is recommended
        retry_recommended = (
            total_errors > 0 and total_errors <= 10
        )  # Don't retry if too many errors

        return ClaudeFeedback(
            success=success,
            message=message,
            files_validated=files_validated,
            total_errors=total_errors,
            total_warnings=total_warnings,
            validation_time=validation_time,
            error_details=[asdict(error) for error in error_details],
            fix_suggestions=fix_suggestions,
            retry_recommended=retry_recommended,
            session_id=self.session_id,
        )

    def _process_errors(
        self, results: Dict[str, List[ValidationResult]]
    ) -> List[ErrorDetail]:
        """Process validation results into structured error details."""
        error_details = []

        for file_path, file_results in results.items():
            for result in file_results:
                if result.severity == "error":
                    error_detail = ErrorDetail(
                        file=str(Path(file_path).name),  # Just filename for clarity
                        line=result.line_number,
                        column=result.column,
                        severity=result.severity,
                        message=result.message,
                        rule_id=result.rule_id,
                        fix_suggestion=result.fix_suggestion,
                        code_example=result.code_example,
                        priority=self._calculate_priority(result),
                    )
                    error_details.append(error_detail)

        # Sort by priority (highest first)
        error_details.sort(key=lambda x: (x.priority, x.file, x.line or 0))

        return error_details

    def _calculate_priority(self, result: ValidationResult) -> int:
        """Calculate error priority (1=highest, 5=lowest)."""
        message_lower = result.message.lower()

        # Critical security issues
        if any(
            keyword in message_lower
            for keyword in [
                "organization_id",
                "multi-tenant",
                "data leak",
                "sql injection",
            ]
        ):
            return 1

        # Authentication/authorization issues
        if any(
            keyword in message_lower
            for keyword in ["auth", "permission", "unauthorized", "token"]
        ):
            return 2

        # Type errors and runtime issues
        if any(
            keyword in message_lower
            for keyword in ["type error", "runtime", "exception", "undefined"]
        ):
            return 3

        # Code quality and best practices
        if any(
            keyword in message_lower
            for keyword in ["unused", "redundant", "complexity", "style"]
        ):
            return 4

        # Default priority
        return 3

    def _generate_fix_suggestions(self, error_details: List[ErrorDetail]) -> List[str]:
        """Generate actionable fix suggestions based on error patterns."""
        suggestions = []
        error_patterns = {}

        # Group errors by pattern
        for error in error_details:
            message_lower = error.message.lower()

            for pattern_name, pattern_info in self.fix_patterns.items():
                import re

                if re.search(pattern_info["pattern"], message_lower):
                    if pattern_name not in error_patterns:
                        error_patterns[pattern_name] = []
                    error_patterns[pattern_name].append(error)

        # Generate suggestions for each pattern
        for pattern_name, errors in error_patterns.items():
            pattern_info = self.fix_patterns[pattern_name]
            suggestion = f"🔧 {pattern_info['fix']}"

            if pattern_info.get("example"):
                suggestion += f"\n   Example: {pattern_info['example']}"

            # Add affected files
            affected_files = list(set(error.file for error in errors))
            if len(affected_files) <= 3:
                suggestion += f"\n   Files: {', '.join(affected_files)}"
            else:
                suggestion += f"\n   Files: {', '.join(affected_files[:3])} and {len(affected_files) - 3} more"

            suggestions.append(suggestion)

        # Add generic suggestions for uncategorized errors
        uncategorized_errors = [
            error
            for error in error_details
            if not any(
                any(
                    re.search(pattern_info["pattern"], error.message.lower())
                    for pattern_info in self.fix_patterns.values()
                )
            )
        ]

        if uncategorized_errors:
            suggestions.append(
                f"🔍 Review the {len(uncategorized_errors)} additional error(s) above and "
                "apply the specific fix suggestions provided for each one."
            )

        return suggestions

    def _generate_main_message(
        self,
        success: bool,
        total_errors: int,
        total_warnings: int,
        files_validated: int,
        validation_time: float,
        error_details: List[ErrorDetail],
    ) -> str:
        """Generate the main feedback message for Claude."""

        if success:
            if total_warnings > 0:
                return self.feedback_templates["success_with_warnings"].format(
                    total_warnings=total_warnings, files_validated=files_validated
                )
            else:
                return self.feedback_templates["success"].format(
                    files_validated=files_validated, validation_time=validation_time
                )

        # Check for critical issues
        critical_count = len([e for e in error_details if e.priority == 1])
        if critical_count > 0:
            # Check specifically for multi-tenant violations
            multi_tenant_errors = [
                e
                for e in error_details
                if any(
                    keyword in e.message.lower()
                    for keyword in ["organization_id", "multi-tenant", "data leak"]
                )
            ]

            if multi_tenant_errors:
                return self.feedback_templates["multi_tenant_violation"]
            else:
                return self.feedback_templates["critical_errors"].format(
                    critical_count=critical_count
                )

        # Standard error message
        return self.feedback_templates["errors_found"].format(
            total_errors=total_errors, files_validated=files_validated
        )

    def format_for_claude(self, feedback: ClaudeFeedback) -> str:
        """Format feedback into Claude-readable text."""
        lines = []

        # Header
        lines.append("=" * 80)
        lines.append("🤖 QUALITY CONTROL FEEDBACK FOR CLAUDE")
        lines.append("=" * 80)

        # Main message
        lines.append(f"\n{feedback.message}")

        # Summary if there are errors
        if not feedback.success:
            lines.append("\n📊 VALIDATION SUMMARY:")
            lines.append(f"   Files checked: {feedback.files_validated}")
            lines.append(f"   Errors found: {feedback.total_errors}")
            lines.append(f"   Warnings: {feedback.total_warnings}")
            lines.append(f"   Time taken: {feedback.validation_time:.2f}s")

        # Error details (top 5 most important)
        if feedback.error_details:
            lines.append("\n🚨 TOP PRIORITY ERRORS TO FIX:")
            for i, error in enumerate(feedback.error_details[:5], 1):
                lines.append(f"\n{i}. 📁 {error['file']}")
                if error["line"]:
                    lines.append(f"   📍 Line {error['line']}")
                lines.append(f"   ❌ {error['message']}")
                if error["fix_suggestion"]:
                    lines.append(f"   💡 Fix: {error['fix_suggestion']}")

            if len(feedback.error_details) > 5:
                lines.append(
                    f"\n   ... and {len(feedback.error_details) - 5} more errors"
                )

        # Fix suggestions
        if feedback.fix_suggestions:
            lines.append("\n🔧 RECOMMENDED ACTIONS:")
            for i, suggestion in enumerate(feedback.fix_suggestions, 1):
                lines.append(f"\n{i}. {suggestion}")

        # Next steps
        if feedback.retry_recommended:
            lines.append(f"\n{self.feedback_templates['retry_recommended']}")
        elif feedback.total_errors > 10:
            lines.append(
                f"\n🚫 Too many errors ({feedback.total_errors}) - please fix major issues first"
            )

        # Footer
        lines.append("\n" + "=" * 80)
        if feedback.success:
            lines.append("✅ QUALITY VALIDATION COMPLETE - READY TO PROCEED")
        else:
            lines.append("⚠️  FIX ERRORS ABOVE AND VALIDATION WILL RE-RUN AUTOMATICALLY")
        lines.append("=" * 80)

        return "\n".join(lines)

    def format_for_json(self, feedback: ClaudeFeedback) -> str:
        """Format feedback as JSON for programmatic consumption."""
        return json.dumps(asdict(feedback), indent=2, default=str)


def create_feedback_processor() -> FeedbackProcessor:
    """Create and return a configured FeedbackProcessor instance."""
    return FeedbackProcessor()
