"""
Security Agent - Multi-tenant Data Isolation Specialist

This agent focuses on ensuring multi-tenant security, particularly:
- organization_id filtering in all database queries
- JWT authentication validation
- Cross-organization data access prevention
- SQL injection prevention
"""

import re
import ast
from typing import List, Dict, Any
from pathlib import Path

from pydantic import BaseModel
from pydantic_ai import Agent

from .quality_control_agent import ValidationResult


class SecurityPattern(BaseModel):
    """Security pattern to check for."""
    pattern: str
    severity: str
    message: str
    fix_suggestion: str = ""


class SecurityAgent:
    """
    Specialized agent for security validation, particularly multi-tenant isolation.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        # Security patterns to detect - only match actual SQL statements, not comments
        self.dangerous_patterns = [
            SecurityPattern(
                pattern=r"(?:^|\s)SELECT\s+\*\s+FROM\s+\w+(?!\s+WHERE.*organization_id)",
                severity="error",
                message="SELECT * without organization_id filtering detected",
                fix_suggestion="Add WHERE organization_id = ? to filter by tenant"
            ),
            SecurityPattern(
                pattern=r"(?:^|\s)DELETE\s+FROM\s+\w+(?!\s+WHERE.*organization_id)",
                severity="error", 
                message="DELETE without organization_id filtering detected",
                fix_suggestion="Add WHERE organization_id = ? to prevent cross-tenant deletion"
            ),
            SecurityPattern(
                pattern=r"(?:^|\s)UPDATE\s+\w+\s+SET(?!\s+.*WHERE.*organization_id)",
                severity="error",
                message="UPDATE without organization_id filtering detected",  
                fix_suggestion="Add WHERE organization_id = ? to prevent cross-tenant updates"
            ),
            SecurityPattern(
                pattern=r"\.filter\([^)]*\)(?!.*organization_id)",
                severity="warning",
                message="Database filter without organization_id check",
                fix_suggestion="Include organization_id in filter criteria"
            ),
            SecurityPattern(
                pattern=r"password\s*=\s*['\"][^'\"]*['\"]",
                severity="error",
                message="Hardcoded password detected",
                fix_suggestion="Use environment variables or secure credential storage"
            ),
            SecurityPattern(
                pattern=r"api_key\s*=\s*['\"][^'\"]*['\"]",
                severity="error", 
                message="Hardcoded API key detected",
                fix_suggestion="Use environment variables for API keys"
            )
        ]
        
        # Required security patterns for multi-tenant apps
        self.required_patterns = [
            SecurityPattern(
                pattern=r"organization_id",
                severity="warning",
                message="File might need organization_id handling",
                fix_suggestion="Ensure proper multi-tenant filtering"
            )
        ]
        
        # Initialize PydanticAI agent
        from pydantic_ai.models import ModelSettings
        
        model_settings = ModelSettings()
        if "temperature" in self.config:
            model_settings["temperature"] = self.config["temperature"]
        if "max_tokens" in self.config:
            model_settings["max_tokens"] = self.config["max_tokens"]
        
        self.agent = Agent(
            model=self.config.get("model", "gpt-4o"),
            instructions=self.config.get("system_prompt", self._default_system_prompt()),
            model_settings=model_settings if model_settings else None
        )
    
    def _default_system_prompt(self) -> str:
        """Default system prompt for the security agent."""
        return """
        You are a security specialist focused on multi-tenant application security.
        
        Your primary responsibilities:
        1. Ensure ALL database operations include organization_id filtering
        2. Detect potential SQL injection vulnerabilities
        3. Flag hardcoded credentials or API keys
        4. Validate JWT authentication implementation
        5. Check for cross-organization data access risks
        
        CRITICAL: GastroPartner is a multi-tenant SaaS. Every database query MUST filter by organization_id
        to prevent data leakage between customers. This is non-negotiable.
        
        When you find issues, provide:
        - Clear severity level (error for security violations, warning for potential risks)
        - Specific line numbers when possible
        - Concrete fix suggestions with code examples
        - Explanation of the security risk
        """
    
    async def validate(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """
        Validate file for security issues.
        
        Args:
            file_path: Path to the file being validated
            file_content: Content of the file
            validation_rules: Security validation rules from config
            
        Returns:
            List of validation results
        """
        # Clear terminal output for agent execution tracking
        print(f"🛡️  SECURITY AGENT: Starting validation on {Path(file_path).name}")
        
        results = []
        file_ext = Path(file_path).suffix.lower()
        
        # Pattern-based validation
        results.extend(self._check_dangerous_patterns(file_path, file_content))
        
        # File-type specific validation
        if file_ext == ".py":
            results.extend(await self._validate_python_security(file_path, file_content, validation_rules))
        elif file_ext in [".ts", ".tsx", ".js", ".jsx"]:
            results.extend(await self._validate_typescript_security(file_path, file_content, validation_rules))
        elif file_ext == ".sql":
            results.extend(self._validate_sql_security(file_path, file_content, validation_rules))
        
        # Multi-tenant specific checks
        if validation_rules.get("multi_tenant", {}).get("enforce_organization_id", True):
            results.extend(self._check_organization_id_usage(file_path, file_content))
        
        # AI-powered security analysis
        try:
            ai_results = await self._run_ai_security_analysis(file_path, file_content, validation_rules)
            results.extend(ai_results)
        except Exception as e:
            results.append(ValidationResult(
                agent_type="security",
                file_path=file_path,
                severity="info",
                message=f"AI analysis failed: {e}",
                rule_id="ai_analysis_error"
            ))
        
        return results
    
    def _check_dangerous_patterns(self, file_path: str, file_content: str) -> List[ValidationResult]:
        """Check for dangerous security patterns using regex."""
        results = []
        lines = file_content.split('\n')
        
        for pattern_obj in self.dangerous_patterns:
            pattern = re.compile(pattern_obj.pattern, re.IGNORECASE | re.MULTILINE)
            
            for line_num, line in enumerate(lines, 1):
                # Skip comments and error messages
                line_stripped = line.strip()
                if line_stripped.startswith('#') or 'raise HTTPException' in line or 'detail=f"' in line:
                    continue
                    
                if pattern.search(line):
                    results.append(ValidationResult(
                        agent_type="security",
                        file_path=file_path,
                        severity=pattern_obj.severity,
                        message=pattern_obj.message,
                        line_number=line_num,
                        fix_suggestion=pattern_obj.fix_suggestion,
                        rule_id=f"security_{pattern_obj.pattern[:20]}"
                    ))
        
        return results
    
    def _check_organization_id_usage(self, file_path: str, file_content: str) -> List[ValidationResult]:
        """Check for proper organization_id usage in multi-tenant context."""
        results = []
        
        # Check if file deals with database operations but lacks organization_id
        db_keywords = ["SELECT", "INSERT", "UPDATE", "DELETE", "query", "filter", "find", "create"]
        file_content_upper = file_content.upper()
        
        has_db_operations = any(keyword in file_content_upper for keyword in db_keywords)
        has_organization_id = "organization_id" in file_content.lower()
        
        if has_db_operations and not has_organization_id:
            # Check if it's a legitimate exception (e.g., system tables, migrations)
            exceptions = ["migration", "seed", "system", "health", "__pycache__"]
            is_exception = any(exc in file_path.lower() for exc in exceptions)
            
            if not is_exception:
                results.append(ValidationResult(
                    agent_type="security",
                    file_path=file_path,
                    severity="warning",
                    message="Database operations detected but no organization_id filtering found",
                    fix_suggestion="Add organization_id filtering to ensure multi-tenant data isolation",
                    rule_id="multi_tenant_isolation"
                ))
        
        return results
    
    async def _validate_python_security(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Validate Python-specific security issues."""
        results = []
        
        try:
            # Parse Python AST for more sophisticated analysis
            tree = ast.parse(file_content)
            
            # Check for SQL injection risks
            for node in ast.walk(tree):
                if isinstance(node, ast.Str):
                    # Check for SQL string concatenation
                    if any(keyword in node.s.upper() for keyword in ["SELECT", "INSERT", "UPDATE", "DELETE"]):
                        # Look for string formatting or concatenation in SQL
                        if "%" in node.s or "{" in node.s:
                            results.append(ValidationResult(
                                agent_type="security",
                                file_path=file_path,
                                severity="error",
                                message="Potential SQL injection vulnerability - avoid string formatting in SQL",
                                line_number=node.lineno,
                                fix_suggestion="Use parameterized queries with ? placeholders",
                                rule_id="sql_injection_risk"
                            ))
                
                # Check for hardcoded secrets
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            if any(secret in target.id.lower() for secret in ["password", "secret", "key", "token"]):
                                if isinstance(node.value, ast.Str):
                                    results.append(ValidationResult(
                                        agent_type="security",
                                        file_path=file_path,
                                        severity="error",
                                        message=f"Hardcoded secret in variable '{target.id}'",
                                        line_number=node.lineno,
                                        fix_suggestion="Use environment variables or secure secret management",
                                        rule_id="hardcoded_secret"
                                    ))
        
        except SyntaxError:
            # File has syntax errors, skip AST analysis
            pass
        except Exception as e:
            results.append(ValidationResult(
                agent_type="security",
                file_path=file_path,
                severity="info",
                message=f"Could not perform deep security analysis: {e}",
                rule_id="analysis_error"
            ))
        
        return results
    
    async def _validate_typescript_security(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Validate TypeScript/JavaScript security issues."""
        results = []
        lines = file_content.split('\n')
        
        # Check for common frontend security issues
        security_checks = [
            (r"innerHTML\s*=", "Potential XSS vulnerability with innerHTML", "Use textContent or proper sanitization"),
            (r"eval\s*\(", "Dangerous eval() usage detected", "Avoid eval() - use safer alternatives"),
            (r"document\.write\s*\(", "Deprecated document.write usage", "Use modern DOM manipulation methods"),
            (r"localStorage\.setItem.*password", "Password stored in localStorage", "Use secure storage for sensitive data"),
            (r"console\.log.*password", "Password logged to console", "Remove sensitive data from logs"),
        ]
        
        for line_num, line in enumerate(lines, 1):
            for pattern, message, fix in security_checks:
                if re.search(pattern, line, re.IGNORECASE):
                    results.append(ValidationResult(
                        agent_type="security",
                        file_path=file_path,
                        severity="warning",
                        message=message,
                        line_number=line_num,
                        fix_suggestion=fix,
                        rule_id=f"js_security_{pattern[:20]}"
                    ))
        
        # Check for proper authentication handling
        if "fetch(" in file_content or "axios" in file_content:
            if "authorization" not in file_content.lower() and "bearer" not in file_content.lower():
                results.append(ValidationResult(
                    agent_type="security",
                    file_path=file_path,
                    severity="warning",
                    message="API calls detected but no authorization headers found",
                    fix_suggestion="Add proper JWT authorization headers to API calls",
                    rule_id="missing_auth_headers"
                ))
        
        return results
    
    def _validate_sql_security(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Validate SQL file security."""
        results = []
        lines = file_content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            line_upper = line.upper().strip()
            
            # Skip comments and empty lines
            if not line_upper or line_upper.startswith('--'):
                continue
            
            # Check for dangerous SQL patterns
            if any(pattern in line_upper for pattern in ["DROP TABLE", "TRUNCATE", "DELETE FROM"]):
                if "WHERE" not in line_upper:
                    results.append(ValidationResult(
                        agent_type="security",
                        file_path=file_path,
                        severity="error",
                        message="Potentially dangerous SQL operation without WHERE clause",
                        line_number=line_num,
                        fix_suggestion="Add appropriate WHERE clause to limit operation scope",
                        rule_id="dangerous_sql_operation"
                    ))
            
            # Check for multi-tenant isolation in data modification
            if any(op in line_upper for op in ["SELECT", "UPDATE", "DELETE"]) and "organization_id" not in line.lower():
                # Skip system operations and table creation
                skip_patterns = ["INFORMATION_SCHEMA", "CREATE", "DROP", "ALTER"]
                if not any(skip in line_upper for skip in skip_patterns):
                    results.append(ValidationResult(
                        agent_type="security",
                        file_path=file_path,
                        severity="warning",
                        message="SQL operation without organization_id filtering",
                        line_number=line_num,
                        fix_suggestion="Add organization_id condition for multi-tenant isolation",
                        rule_id="sql_multitenant_isolation"
                    ))
        
        return results
    
    def get_security_summary(self, results: List[ValidationResult]) -> Dict[str, Any]:
        """Generate security validation summary."""
        security_results = [r for r in results if r.agent_type == "security"]
        
        errors = [r for r in security_results if r.severity == "error"]
        warnings = [r for r in security_results if r.severity == "warning"]
        
        # Categorize issues
        categories = {
            "multi_tenant": [r for r in security_results if "organization_id" in r.message.lower()],
            "sql_injection": [r for r in security_results if "sql" in r.message.lower() and "injection" in r.message.lower()],
            "hardcoded_secrets": [r for r in security_results if any(word in r.message.lower() for word in ["password", "key", "secret"])],
            "xss": [r for r in security_results if "xss" in r.message.lower() or "innerhtml" in r.message.lower()],
            "other": []
        }
        
        # Classify remaining issues
        for result in security_results:
            categorized = False
            for category_results in categories.values():
                if result in category_results:
                    categorized = True
                    break
            if not categorized:
                categories["other"].append(result)
        
        return {
            "total_issues": len(security_results),
            "errors": len(errors),
            "warnings": len(warnings),
            "categories": {k: len(v) for k, v in categories.items()},
            "critical_issues": [r.message for r in errors],
            "recommendations": self._generate_security_recommendations(security_results)
        }
    
    def _generate_security_recommendations(self, results: List[ValidationResult]) -> List[str]:
        """Generate security recommendations based on found issues."""
        recommendations = []
        
        issue_types = [r.rule_id for r in results if r.rule_id]
        
        if any("multitenant" in issue_id for issue_id in issue_types):
            recommendations.append("Implement organization_id filtering in all database operations")
        
        if any("sql_injection" in issue_id for issue_id in issue_types):
            recommendations.append("Use parameterized queries to prevent SQL injection")
        
        if any("hardcoded" in issue_id for issue_id in issue_types):
            recommendations.append("Move all secrets to environment variables or secure storage")
        
        if any("auth" in issue_id for issue_id in issue_types):
            recommendations.append("Ensure all API calls include proper authorization headers")
        
        if not recommendations:
            recommendations.append("No major security improvements needed")
        
        return recommendations
    
    async def _run_ai_security_analysis(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Run AI-powered security analysis using PydanticAI."""
        results = []
        
        # Prepare context for AI analysis
        file_ext = Path(file_path).suffix.lower()
        analysis_prompt = f"""
        Analyze this {file_ext} file for security vulnerabilities specific to GastroPartner (a multi-tenant SaaS application).

        CRITICAL REQUIREMENTS for GastroPartner:
        1. ALL database queries MUST filter by organization_id for multi-tenant isolation
        2. NO hardcoded credentials, API keys, or secrets
        3. Prevent SQL injection vulnerabilities
        4. Secure authentication and authorization
        5. Input validation and sanitization

        File path: {file_path}
        File content:
        ```{file_ext}
        {file_content}
        ```

        For each issue found, provide:
        - Severity (error/warning/info)
        - Specific line number if possible
        - Clear description of the security risk
        - Concrete fix suggestion with code example
        - Rule ID for tracking

        If no issues are found, respond with "NO_ISSUES_FOUND".
        """

        try:
            # Run AI analysis
            response = await self.agent.run(analysis_prompt)
            
            # Parse AI response and convert to ValidationResult objects
            if response.data and response.data.strip() != "NO_ISSUES_FOUND":
                results.extend(self._parse_ai_response(file_path, response.data))
        
        except Exception as e:
            # Log error but don't fail validation
            results.append(ValidationResult(
                agent_type="security",
                file_path=file_path,
                severity="info",
                message=f"AI security analysis encountered an error: {str(e)}",
                rule_id="ai_security_error"
            ))
        
        return results
    
    def _parse_ai_response(self, file_path: str, ai_response: str) -> List[ValidationResult]:
        """Parse AI response and convert to ValidationResult objects."""
        results = []
        
        # Simple parsing - in production, you'd want more sophisticated parsing
        lines = ai_response.split('\n')
        current_issue = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for severity indicators
            if line.lower().startswith(('error:', 'warning:', 'info:')):
                # Save previous issue if exists
                if current_issue and 'message' in current_issue:
                    results.append(self._create_validation_result_from_ai(file_path, current_issue))
                
                # Start new issue
                severity = line.split(':')[0].lower()
                message = ':'.join(line.split(':')[1:]).strip()
                current_issue = {'severity': severity, 'message': message}
            
            elif line.lower().startswith('line'):
                # Extract line number
                try:
                    line_num = int(''.join(filter(str.isdigit, line)))
                    current_issue['line_number'] = line_num
                except:
                    pass
            
            elif line.lower().startswith('fix:'):
                current_issue['fix_suggestion'] = line[4:].strip()
            
            elif line.lower().startswith('rule:'):
                current_issue['rule_id'] = line[5:].strip()
        
        # Don't forget the last issue
        if current_issue and 'message' in current_issue:
            results.append(self._create_validation_result_from_ai(file_path, current_issue))
        
        return results
    
    def _create_validation_result_from_ai(self, file_path: str, issue_data: dict) -> ValidationResult:
        """Create ValidationResult from parsed AI issue data."""
        return ValidationResult(
            agent_type="security",
            file_path=file_path,
            severity=issue_data.get('severity', 'warning'),
            message=issue_data.get('message', 'AI detected security issue'),
            line_number=issue_data.get('line_number'),
            fix_suggestion=issue_data.get('fix_suggestion'),
            rule_id=issue_data.get('rule_id', 'ai_security_analysis')
        )