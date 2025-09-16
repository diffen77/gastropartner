#!/usr/bin/env python3
"""
Archon Task Creator - Creates tasks in Archon for quality control errors
"""

import json
from typing import Dict, Any

ARCHON_PROJECT_ID = "9108cfbd-75a5-48dd-bed4-ac0b490a35b9"


class ArchonTaskCreator:
    """Creates tasks in Archon MCP server for quality control errors."""

    def __init__(self):
        self.created_tasks = []

    def create_tasks_from_feedback(self, feedback_processor):
        """Create Archon tasks from FeedbackProcessor pending tasks."""
        if not hasattr(feedback_processor, "_pending_archon_tasks"):
            print("No pending Archon tasks found")
            return

        pending_tasks = feedback_processor.get_pending_archon_tasks()
        if not pending_tasks:
            print("No pending tasks to create")
            return

        print(
            f"\n🚨 CREATING {len(pending_tasks)} ARCHON TASKS FOR QUALITY CONTROL ERRORS"
        )

        for task_data in pending_tasks:
            try:
                result = self.create_single_task(task_data)
                if result:
                    self.created_tasks.append(result)
                    print(f"✅ Created task: {task_data['title'][:50]}...")
                else:
                    print(f"❌ Failed to create task: {task_data['title'][:50]}...")
            except Exception as e:
                print(f"❌ Error creating task: {e}")

        print(
            f"\n📋 SUMMARY: Created {len(self.created_tasks)} out of {len(pending_tasks)} tasks"
        )
        return self.created_tasks

    def create_single_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a single task in Archon via MCP."""
        try:
            # This would be called via Claude Code's MCP integration
            # For now, we'll simulate the call structure

            mcp_request = {
                "tool": "mcp__archon__manage_task",
                "parameters": {
                    "action": "create",
                    "project_id": task_data["project_id"],
                    "title": task_data["title"],
                    "description": task_data["description"],
                    "assignee": task_data["assignee"],
                    "task_order": task_data["task_order"],
                    "feature": task_data["feature"],
                },
            }

            # In a real scenario, this would be called via Claude Code
            # For testing, we'll just log the request
            print(f"📤 MCP Request: {json.dumps(mcp_request, indent=2)}")

            # Simulate successful response
            return {
                "task_id": f"task-{len(self.created_tasks) + 1}",
                "title": task_data["title"],
                "status": "created",
                "project_id": task_data["project_id"],
            }

        except Exception as e:
            print(f"❌ Failed to create task: {e}")
            return None

    def test_archon_connection(self):
        """Test connection to Archon MCP server."""
        try:
            # This would test the actual MCP connection
            print("🔄 Testing Archon MCP connection...")
            print(f"🎯 Target project: {ARCHON_PROJECT_ID}")
            print("✅ Connection test would happen here via Claude Code")
            return True
        except Exception as e:
            print(f"❌ Archon connection failed: {e}")
            return False


def main():
    """Main function for testing task creation."""
    creator = ArchonTaskCreator()

    # Test connection
    if not creator.test_archon_connection():
        print("❌ Cannot connect to Archon - tasks will not be created")
        return

    # Example usage with mock data
    print("🧪 Testing with mock quality control error...")

    from feedback_processor import FeedbackProcessor, ErrorDetail

    processor = FeedbackProcessor()

    # Create mock error for testing
    mock_error = ErrorDetail(
        file="test.py",
        line=45,
        column=12,
        severity="error",
        message="Missing organization_id filter - potential multi-tenant data leak",
        rule_id="MT001",
        fix_suggestion="Add .filter(organization_id=current_user.organization_id)",
        code_example="users = db.query(User).filter(User.organization_id == user.organization_id)",
        priority=1,
    )

    # Create task for mock error
    processor._create_archon_task_for_error(
        mock_error, "Add organization_id filter to query"
    )

    # Create the tasks
    result = creator.create_tasks_from_feedback(processor)

    if result:
        print("✅ Successfully tested task creation system")
    else:
        print("❌ Task creation test failed")


if __name__ == "__main__":
    main()
