#!/usr/bin/env python3
"""
🛡️ MULTI-TENANT SECURITY VALIDATION TOOL
===========================================

CRITICAL security validation tool for GastroPartner multi-tenant system.
Ensures organization data isolation and prevents security vulnerabilities.

🚨 MANDATORY USAGE: Run this tool before ANY deployment to production!

Usage:
    python security_validation_tool.py --check-all
    python security_validation_tool.py --check-queries
    python security_validation_tool.py --check-auth
    python security_validation_tool.py --check-dev-bypasses
"""

import argparse
import re
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class SeverityLevel(Enum):
    """Security issue severity levels."""

    CRITICAL = "🚨 CRITICAL"
    HIGH = "🔴 HIGH"
    MEDIUM = "🟡 MEDIUM"
    LOW = "🟢 LOW"
    INFO = "i INFO"


@dataclass
class SecurityIssue:
    """Represents a security issue found during validation."""

    severity: SeverityLevel
    title: str
    description: str
    file_path: str
    line_number: int
    code_snippet: str
    recommendation: str
    compliance_rule: str


class MultiTenantSecurityValidator:
    """
    Validates multi-tenant security compliance in GastroPartner codebase.

    MANDATORY SECURITY RULES:
    1. ALL database queries MUST filter by organization_id
    2. ALL API endpoints MUST require authentication
    3. ALL INSERT operations MUST set organization_id and creator_id
    4. NO development bypasses in production code
    5. ALL user data MUST be organization-isolated
    """

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.src_path = project_root / "gastropartner-backend" / "src"
        self.issues: list[SecurityIssue] = []

        # Development user ID that should NEVER appear in production
        self.DEV_USER_ID = "12345678-1234-1234-1234-123456789012"
        self.DEV_ORG_ID = "87654321-4321-4321-4321-210987654321"

    def validate_all(self) -> bool:
        """Run all security validations."""
        print("🛡️ STARTING COMPREHENSIVE MULTI-TENANT SECURITY VALIDATION")
        print("=" * 70)

        self.validate_database_queries()
        self.validate_api_authentication()
        self.validate_insert_operations()
        self.validate_development_bypasses()
        self.validate_organization_filtering()

        return self.report_results()

    def validate_database_queries(self) -> None:
        """
        CRITICAL: Validate all database queries filter by organization_id.

        RULE: Alla SELECT, UPDATE, DELETE queries MÅSTE filtrera på organization_id
        """
        print("\n🔍 Validating database query organization filtering...")

        # Tables that MUST be organization-filtered
        org_filtered_tables = {"recipes", "ingredients", "menu_items", "recipe_ingredients"}

        for py_file in self.src_path.rglob("*.py"):
            content = py_file.read_text()
            lines = content.split("\n")

            for line_num, line in enumerate(lines, 1):
                # Check for table queries
                if ".table(" in line and ".select(" in line:
                    # Extract table name
                    table_match = re.search(r'\.table\("([^"]+)"\)', line)
                    if table_match:
                        table_name = table_match.group(1)

                        if table_name in org_filtered_tables and "organization_id" not in line:
                            # Look ahead for organization_id filter
                            has_org_filter = False
                            for next_line_num in range(line_num, min(line_num + 5, len(lines))):
                                if "organization_id" in lines[next_line_num]:
                                    has_org_filter = True
                                    break

                            if not has_org_filter:
                                self.issues.append(
                                    SecurityIssue(
                                        severity=SeverityLevel.CRITICAL,
                                        title=f"Missing organization_id filter on {table_name} table",
                                        description=f"Query on {table_name} table does not filter by organization_id, allowing cross-organization data access",
                                        file_path=str(py_file.relative_to(self.project_root)),
                                        line_number=line_num,
                                        code_snippet=line.strip(),
                                        recommendation="Add .eq('organization_id', str(organization_id)) to the query",
                                        compliance_rule="REGEL 3: Alla queries MÅSTE filtrera på organization_id",
                                    )
                                )

    def validate_api_authentication(self) -> None:
        """
        CRITICAL: Validate all API endpoints require authentication.

        RULE: Alla API endpoints MÅSTE kräva autentisering
        """
        print("🔐 Validating API endpoint authentication...")

        router_pattern = re.compile(r"@router\.(get|post|put|delete|patch)\(")
        auth_dependency_pattern = re.compile(
            r"Depends\(get_current_active_user\)|Depends\(get_user_organization\)"
        )

        for py_file in (self.src_path / "gastropartner" / "api").rglob("*.py"):
            if py_file.name == "__init__.py":
                continue

            content = py_file.read_text()
            lines = content.split("\n")

            for line_num, line in enumerate(lines, 1):
                if router_pattern.search(line):
                    # Found an endpoint, check if it has auth dependency
                    endpoint_func_lines = []
                    for next_line_num in range(line_num, min(line_num + 10, len(lines))):
                        endpoint_func_lines.append(lines[next_line_num])
                        if lines[next_line_num].strip().startswith("def "):
                            break

                    endpoint_func = "\n".join(endpoint_func_lines)

                    # Check for development endpoints (allowed to skip auth)
                    if "/dev/" in line or "setup" in line.lower():
                        continue

                    # Check for health/monitoring endpoints (may skip auth)
                    if any(keyword in line.lower() for keyword in ["health", "ping", "status"]):
                        continue

                    if not auth_dependency_pattern.search(endpoint_func):
                        self.issues.append(
                            SecurityIssue(
                                severity=SeverityLevel.HIGH,
                                title="API endpoint missing authentication",
                                description="API endpoint does not require user authentication",
                                file_path=str(py_file.relative_to(self.project_root)),
                                line_number=line_num,
                                code_snippet=line.strip(),
                                recommendation="Add 'current_user: User = Depends(get_current_active_user)' parameter",
                                compliance_rule="REGEL 2: Alla API endpoints MÅSTE kräva autentisering",
                            )
                        )

    def validate_insert_operations(self) -> None:
        """
        CRITICAL: Validate INSERT operations set organization_id and creator_id.

        RULE: Alla INSERT queries MÅSTE sätta organization_id och creator_id
        """
        print("💾 Validating INSERT operations organization tracking...")

        # Tables that MUST have organization_id
        org_tracked_tables = {"recipes", "ingredients", "menu_items"}

        for py_file in self.src_path.rglob("*.py"):
            content = py_file.read_text()
            lines = content.split("\n")

            for line_num, line in enumerate(lines, 1):
                if ".insert({" in line:
                    # Find the table name
                    table_match = re.search(r'\.table\("([^"]+)"\)\.insert', line)
                    if not table_match:
                        # Look backwards for table name
                        for prev_line_num in range(line_num - 1, max(line_num - 5, 0), -1):
                            table_match = re.search(r'\.table\("([^"]+)"\)', lines[prev_line_num])
                            if table_match:
                                break

                    if table_match:
                        table_name = table_match.group(1)

                        if table_name in org_tracked_tables:
                            # Collect the insert statement (may span multiple lines)
                            insert_block = []
                            for next_line_num in range(
                                line_num - 1, min(line_num + 10, len(lines))
                            ):
                                insert_block.append(lines[next_line_num])
                                if "}).execute()" in lines[next_line_num]:
                                    break

                            insert_text = "\n".join(insert_block)

                            # Check for organization_id
                            if '"organization_id"' not in insert_text:
                                self.issues.append(
                                    SecurityIssue(
                                        severity=SeverityLevel.CRITICAL,
                                        title="INSERT operation missing organization_id",
                                        description=f"INSERT into {table_name} does not set organization_id",
                                        file_path=str(py_file.relative_to(self.project_root)),
                                        line_number=line_num,
                                        code_snippet=line.strip(),
                                        recommendation="Add '\"organization_id\": str(organization_id)' to insert data",
                                        compliance_rule="REGEL 5: Alla INSERT queries MÅSTE sätta organization_id",
                                    )
                                )

    def validate_development_bypasses(self) -> None:
        """
        CRITICAL: Ensure no development bypasses exist in production code.

        RULE: Inga development bypasses får finnas i produktionskod
        """
        print("🚧 Validating development bypasses removal...")

        dev_patterns = [
            (self.DEV_USER_ID, "Development user ID found"),
            (self.DEV_ORG_ID, "Development organization ID found"),
            (r"dev_token_", "Development token pattern found"),
            (r"if.*development", "Development mode check found"),
            (r"Development.*mode", "Development mode reference found"),
        ]

        for py_file in self.src_path.rglob("*.py"):
            # Skip test files and conftest
            if "test" in py_file.name or "conftest" in py_file.name:
                continue

            content = py_file.read_text()
            lines = content.split("\n")

            for line_num, line in enumerate(lines, 1):
                for pattern, description in dev_patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        # Check if it's in a comment - might be acceptable
                        if line.strip().startswith("#"):
                            severity = SeverityLevel.MEDIUM
                        else:
                            severity = SeverityLevel.CRITICAL

                        self.issues.append(
                            SecurityIssue(
                                severity=severity,
                                title="Development bypass detected",
                                description=description,
                                file_path=str(py_file.relative_to(self.project_root)),
                                line_number=line_num,
                                code_snippet=line.strip(),
                                recommendation="Remove development bypass code before production deployment",
                                compliance_rule="REGEL 4: Inga development bypasses i produktionskod",
                            )
                        )

    def validate_organization_filtering(self) -> None:
        """
        CRITICAL: Validate all data access is organization-filtered.

        RULE: All user data access MUST be organization-isolated
        """
        print("🏢 Validating organization isolation...")

        # Look for get_user_organization dependency usage
        auth_functions = [
            "get_user_organization",
            "get_current_active_user",
            "get_organization_context",
        ]

        for py_file in (self.src_path / "gastropartner" / "api").rglob("*.py"):
            if py_file.name == "__init__.py":
                continue

            content = py_file.read_text()

            # Check if file defines API endpoints but doesn't use auth
            if "@router." in content:
                has_auth_import = any(func in content for func in auth_functions)
                if not has_auth_import:
                    self.issues.append(
                        SecurityIssue(
                            severity=SeverityLevel.HIGH,
                            title="API module missing authentication imports",
                            description="API module defines endpoints but doesn't import authentication functions",
                            file_path=str(py_file.relative_to(self.project_root)),
                            line_number=1,
                            code_snippet="",
                            recommendation="Import and use get_current_active_user and get_user_organization",
                            compliance_rule="REGEL 1: Alla API moduler MÅSTE använda autentisering",
                        )
                    )

    def report_results(self) -> bool:
        """Generate comprehensive security validation report."""
        print("\n" + "=" * 70)
        print("🛡️ MULTI-TENANT SECURITY VALIDATION REPORT")
        print("=" * 70)

        if not self.issues:
            print("✅ EXCELLENT! No security issues found.")
            print("🎉 All multi-tenant security rules are properly implemented.")
            return True

        # Group issues by severity
        issues_by_severity = {}
        for issue in self.issues:
            if issue.severity not in issues_by_severity:
                issues_by_severity[issue.severity] = []
            issues_by_severity[issue.severity].append(issue)

        # Report statistics
        total_issues = len(self.issues)
        critical_count = len(issues_by_severity.get(SeverityLevel.CRITICAL, []))
        high_count = len(issues_by_severity.get(SeverityLevel.HIGH, []))

        print(f"📊 TOTAL ISSUES FOUND: {total_issues}")
        print(f"🚨 CRITICAL: {critical_count}")
        print(f"🔴 HIGH: {high_count}")
        print(f"🟡 MEDIUM: {len(issues_by_severity.get(SeverityLevel.MEDIUM, []))}")
        print(f"🟢 LOW: {len(issues_by_severity.get(SeverityLevel.LOW, []))}")

        # Report each issue
        for severity in [
            SeverityLevel.CRITICAL,
            SeverityLevel.HIGH,
            SeverityLevel.MEDIUM,
            SeverityLevel.LOW,
        ]:
            if severity in issues_by_severity:
                print(f"\n{severity.value} ISSUES:")
                print("-" * 50)

                for i, issue in enumerate(issues_by_severity[severity], 1):
                    print(f"\n{i}. {issue.title}")
                    print(f"   📁 File: {issue.file_path}:{issue.line_number}")
                    print(f"   📋 Rule: {issue.compliance_rule}")
                    print(f"   📝 Description: {issue.description}")
                    if issue.code_snippet:
                        print(f"   💻 Code: {issue.code_snippet}")
                    print(f"   🔧 Fix: {issue.recommendation}")

        # Deployment recommendation
        print("\n" + "=" * 70)
        if critical_count > 0:
            print(
                "🚨 DEPLOYMENT BLOCKED! Critical security issues must be fixed before production deployment."
            )
            print("❌ DO NOT DEPLOY TO PRODUCTION until all CRITICAL issues are resolved.")
        elif high_count > 0:
            print("⚠️ DEPLOYMENT NOT RECOMMENDED! High-priority security issues should be fixed.")
            print("🔍 Review and fix HIGH priority issues before production deployment.")
        else:
            print("✅ DEPLOYMENT APPROVED! No critical security issues found.")
            print("💡 Consider fixing remaining medium/low priority issues for optimal security.")

        print("\n🛡️ Multi-tenant security validation complete.")
        return critical_count == 0 and high_count == 0


def main():
    """Main CLI interface for security validation."""
    parser = argparse.ArgumentParser(
        description="GastroPartner Multi-Tenant Security Validation Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
SÄKERHETSKONTROLL - OBLIGATORISK FÖRE DEPLOYMENT!

Exempel på användning:
  python security_validation_tool.py --check-all
  python security_validation_tool.py --check-queries
  python security_validation_tool.py --check-auth

🚨 VIKTIGT: Kör detta verktyg innan VARJE deployment till produktion!
        """,
    )

    parser.add_argument(
        "--check-all", action="store_true", help="Kör alla säkerhetskontroller (rekommenderat)"
    )

    parser.add_argument(
        "--check-queries",
        action="store_true",
        help="Kontrollera databas queries för organization_id filtering",
    )

    parser.add_argument(
        "--check-auth", action="store_true", help="Kontrollera API endpoint autentisering"
    )

    parser.add_argument(
        "--check-dev-bypasses", action="store_true", help="Kontrollera development bypasses"
    )

    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path.cwd(),
        help="Projekt root directory (default: current directory)",
    )

    args = parser.parse_args()

    # Default to check-all if no specific checks requested
    if not any([args.check_all, args.check_queries, args.check_auth, args.check_dev_bypasses]):
        args.check_all = True

    validator = MultiTenantSecurityValidator(args.project_root)

    if args.check_all:
        success = validator.validate_all()
    else:
        if args.check_queries:
            validator.validate_database_queries()
        if args.check_auth:
            validator.validate_api_authentication()
        if args.check_dev_bypasses:
            validator.validate_development_bypasses()

        success = validator.report_results()

    # Exit with error code if critical issues found
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
