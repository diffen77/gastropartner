"""
Backend Agent - Python/FastAPI Quality Specialist

This agent focuses on backend code quality including:
- Python code standards (PEP 8)
- FastAPI route validation
- Database query optimization
- Error handling patterns
- Type hints and documentation
"""

import ast
import re
from typing import List, Dict, Any
from pathlib import Path

from pydantic import BaseModel
from pydantic_ai import Agent

from .quality_control_agent import ValidationResult


class CodeMetrics(BaseModel):
    """Code quality metrics."""

    lines_of_code: int
    cyclomatic_complexity: int
    functions: List[str]
    classes: List[str]
    imports: List[str]
    has_type_hints: bool


class BackendAgent:
    """
    Specialized agent for Python/FastAPI backend validation.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # Python code quality patterns
        self.python_patterns = [
            {
                "pattern": r"except\s*:",
                "severity": "warning",
                "message": "Bare except clause - catch specific exceptions",
                "fix": "Replace 'except:' with specific exception types",
            },
            {
                "pattern": r"print\s*\(",
                "severity": "info",
                "message": "Print statement found - use logging instead",
                "fix": "Replace print() with proper logging",
            },
            {
                "pattern": r"TODO|FIXME|XXX",
                "severity": "info",
                "message": "TODO/FIXME comment found",
                "fix": "Complete the TODO or create a ticket",
            },
            {
                "pattern": r"import\s+\*",
                "severity": "warning",
                "message": "Wildcard import detected",
                "fix": "Import specific names instead of using *",
            },
        ]

        # FastAPI specific patterns
        self.fastapi_patterns = [
            {
                "pattern": r"@app\.(get|post|put|delete).*(?!\(.*response_model)",
                "severity": "info",
                "message": "API endpoint missing response_model",
                "fix": "Add response_model parameter for API documentation",
            },
            {
                "pattern": r"raise\s+HTTPException\s*\(",
                "severity": "info",
                "message": "HTTPException without detail context",
                "fix": "Ensure HTTPException includes meaningful detail message",
            },
        ]

        # Database patterns
        self.database_patterns = [
            {
                "pattern": r"\.execute\([^)]*f['\"]",
                "severity": "error",
                "message": "Potential SQL injection with f-string",
                "fix": "Use parameterized queries instead of f-strings",
            },
            {
                "pattern": r"\.execute\([^)]*\%",
                "severity": "error",
                "message": "Potential SQL injection with string formatting",
                "fix": "Use parameterized queries with placeholders",
            },
        ]

        # Initialize PydanticAI agent
        from pydantic_ai.models import ModelSettings

        model_settings = ModelSettings()
        if "temperature" in self.config:
            model_settings["temperature"] = self.config["temperature"]
        if "max_tokens" in self.config:
            model_settings["max_tokens"] = self.config["max_tokens"]

        self.agent = Agent(
            model=self.config.get("model", "gpt-4o-mini"),
            instructions=self.config.get(
                "system_prompt", self._default_system_prompt()
            ),
            model_settings=model_settings if model_settings else None,
        )

    def _default_system_prompt(self) -> str:
        """Default system prompt for the backend agent."""
        return """
        You are a Python/FastAPI specialist focused on backend code quality and performance.
        
        Your primary responsibilities:
        1. Validate code follows PEP 8 standards and uses proper type hints
        2. Check FastAPI routes for proper validation and error handling
        3. Ensure database operations are secure and efficient
        4. Validate error handling patterns and logging
        5. Check for performance and maintainability issues
        
        GastroPartner specific requirements:
        - Multi-tenant architecture with organization_id filtering
        - FastAPI with Pydantic v2 for API validation
        - Supabase for database operations
        - Proper error handling with meaningful messages
        - Type hints for all function signatures
        
        Focus on:
        - Code maintainability and readability
        - Performance implications
        - Security best practices
        - Proper testing patterns
        """

    async def validate(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """
        Validate Python/FastAPI file for backend quality issues.

        Args:
            file_path: Path to the file being validated
            file_content: Content of the file
            validation_rules: Backend validation rules from config

        Returns:
            List of validation results
        """
        # Clear terminal output for agent execution tracking
        print(f"🚀 BACKEND AGENT: Starting validation on {Path(file_path).name}")

        results = []
        file_ext = Path(file_path).suffix.lower()

        if file_ext == ".py":
            results.extend(
                self._validate_python_code(file_path, file_content, validation_rules)
            )

            # FastAPI specific validation
            if self._is_fastapi_file(file_content):
                results.extend(
                    self._validate_fastapi_patterns(
                        file_path, file_content, validation_rules
                    )
                )

            # Database file validation
            if self._is_database_file(file_path, file_content):
                results.extend(
                    self._validate_database_patterns(
                        file_path, file_content, validation_rules
                    )
                )

            # AST-based validation
            results.extend(
                await self._validate_python_ast(
                    file_path, file_content, validation_rules
                )
            )

        return results

    def _is_fastapi_file(self, file_content: str) -> bool:
        """Check if file contains FastAPI code."""
        fastapi_indicators = ["FastAPI", "@app.", "APIRouter", "HTTPException"]
        return any(indicator in file_content for indicator in fastapi_indicators)

    def _is_database_file(self, file_path: str, file_content: str) -> bool:
        """Check if file contains database operations."""
        db_indicators = ["supabase", "execute", "query", "cursor", "connection"]
        return any(indicator in file_content.lower() for indicator in db_indicators)

    def _validate_python_code(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate general Python code patterns."""
        results = []
        lines = file_content.split("\n")

        # Check Python patterns
        for pattern_obj in self.python_patterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)

            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(
                        ValidationResult(
                            agent_type="backend",
                            file_path=file_path,
                            severity=pattern_obj["severity"],
                            message=pattern_obj["message"],
                            line_number=line_num,
                            fix_suggestion=pattern_obj["fix"],
                            rule_id=f"python_{pattern_obj['pattern'][:20]}",
                        )
                    )

        # Check line length
        max_line_length = validation_rules.get("python", {}).get("max_line_length", 100)
        for line_num, line in enumerate(lines, 1):
            if len(line) > max_line_length:
                results.append(
                    ValidationResult(
                        agent_type="backend",
                        file_path=file_path,
                        severity="info",
                        message=f"Line too long ({len(line)} > {max_line_length} characters)",
                        line_number=line_num,
                        fix_suggestion="Break long lines or use line continuation",
                        rule_id="line_length",
                    )
                )

        return results

    def _validate_fastapi_patterns(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate FastAPI specific patterns."""
        results = []
        lines = file_content.split("\n")

        # Check FastAPI patterns
        for pattern_obj in self.fastapi_patterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)

            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(
                        ValidationResult(
                            agent_type="backend",
                            file_path=file_path,
                            severity=pattern_obj["severity"],
                            message=pattern_obj["message"],
                            line_number=line_num,
                            fix_suggestion=pattern_obj["fix"],
                            rule_id=f"fastapi_{pattern_obj['pattern'][:20]}",
                        )
                    )

        # Check for proper route organization
        if validation_rules.get("fastapi", {}).get("validate_routes", True):
            results.extend(self._validate_route_organization(file_path, file_content))

        # Check for request/response models
        if validation_rules.get("fastapi", {}).get("check_request_models", True):
            results.extend(self._validate_pydantic_models(file_path, file_content))

        return results

    def _validate_database_patterns(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate database operation patterns."""
        results = []
        lines = file_content.split("\n")

        # Check database patterns
        for pattern_obj in self.database_patterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)

            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(
                        ValidationResult(
                            agent_type="backend",
                            file_path=file_path,
                            severity=pattern_obj["severity"],
                            message=pattern_obj["message"],
                            line_number=line_num,
                            fix_suggestion=pattern_obj["fix"],
                            rule_id=f"database_{pattern_obj['pattern'][:20]}",
                        )
                    )

        # Check for organization_id filtering
        if validation_rules.get("database", {}).get(
            "require_organization_filter", True
        ):
            has_db_operations = any(
                op in file_content.lower()
                for op in ["select", "update", "delete", "insert"]
            )
            has_org_filter = "organization_id" in file_content.lower()

            if has_db_operations and not has_org_filter:
                # Check for exceptions (migrations, system operations)
                exceptions = ["migration", "seed", "system", "health"]
                is_exception = any(exc in file_path.lower() for exc in exceptions)

                if not is_exception:
                    results.append(
                        ValidationResult(
                            agent_type="backend",
                            file_path=file_path,
                            severity="warning",
                            message="Database operations without organization_id filtering",
                            fix_suggestion="Add organization_id filtering for multi-tenant isolation",
                            rule_id="missing_organization_filter",
                        )
                    )

        return results

    async def _validate_python_ast(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate Python code using AST analysis."""
        results = []

        try:
            tree = ast.parse(file_content)

            # Analyze code metrics
            metrics = self._calculate_code_metrics(tree)

            # Check function length
            max_function_length = validation_rules.get("python", {}).get(
                "max_function_length", 50
            )
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    function_length = (
                        node.end_lineno - node.lineno
                        if hasattr(node, "end_lineno")
                        else 0
                    )
                    if function_length > max_function_length:
                        results.append(
                            ValidationResult(
                                agent_type="backend",
                                file_path=file_path,
                                severity="warning",
                                message=f"Function '{node.name}' is too long ({function_length} lines)",
                                line_number=node.lineno,
                                fix_suggestion="Break down into smaller functions",
                                rule_id="function_too_long",
                            )
                        )

            # Check class length
            max_class_length = validation_rules.get("python", {}).get(
                "max_class_length", 100
            )
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    class_length = (
                        node.end_lineno - node.lineno
                        if hasattr(node, "end_lineno")
                        else 0
                    )
                    if class_length > max_class_length:
                        results.append(
                            ValidationResult(
                                agent_type="backend",
                                file_path=file_path,
                                severity="warning",
                                message=f"Class '{node.name}' is too long ({class_length} lines)",
                                line_number=node.lineno,
                                fix_suggestion="Break down into smaller classes or mixins",
                                rule_id="class_too_long",
                            )
                        )

            # Check for type hints
            if validation_rules.get("python", {}).get("enforce_type_hints", True):
                results.extend(self._validate_type_hints(tree, file_path))

            # Check for complex functions (simplified cyclomatic complexity)
            results.extend(self._validate_function_complexity(tree, file_path))

        except SyntaxError as e:
            results.append(
                ValidationResult(
                    agent_type="backend",
                    file_path=file_path,
                    severity="error",
                    message=f"Syntax error: {e.msg}",
                    line_number=e.lineno,
                    fix_suggestion="Fix Python syntax error",
                    rule_id="syntax_error",
                )
            )
        except Exception as e:
            results.append(
                ValidationResult(
                    agent_type="backend",
                    file_path=file_path,
                    severity="info",
                    message=f"Could not perform AST analysis: {e}",
                    rule_id="ast_analysis_error",
                )
            )

        return results

    def _calculate_code_metrics(self, tree: ast.AST) -> CodeMetrics:
        """Calculate basic code metrics from AST."""
        functions = []
        classes = []
        imports = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append(node.name)
            elif isinstance(node, ast.ClassDef):
                classes.append(node.name)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)

        # Simple complexity calculation (count control flow statements)
        complexity = 0
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.Try, ast.With)):
                complexity += 1

        return CodeMetrics(
            lines_of_code=0,  # Would need line counting
            cyclomatic_complexity=complexity,
            functions=functions,
            classes=classes,
            imports=imports,
            has_type_hints=False,  # Would need annotation analysis
        )

    def _validate_type_hints(
        self, tree: ast.AST, file_path: str
    ) -> List[ValidationResult]:
        """Validate type hint usage."""
        results = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check function parameters
                for arg in node.args.args:
                    if not arg.annotation and arg.arg != "self":
                        results.append(
                            ValidationResult(
                                agent_type="backend",
                                file_path=file_path,
                                severity="info",
                                message=f"Parameter '{arg.arg}' in function '{node.name}' missing type hint",
                                line_number=node.lineno,
                                fix_suggestion="Add type annotation to parameter",
                                rule_id="missing_type_hint",
                            )
                        )

                # Check return type
                if not node.returns and node.name != "__init__":
                    results.append(
                        ValidationResult(
                            agent_type="backend",
                            file_path=file_path,
                            severity="info",
                            message=f"Function '{node.name}' missing return type annotation",
                            line_number=node.lineno,
                            fix_suggestion="Add return type annotation",
                            rule_id="missing_return_type",
                        )
                    )

        return results

    def _validate_function_complexity(
        self, tree: ast.AST, file_path: str
    ) -> List[ValidationResult]:
        """Validate function complexity."""
        results = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Count decision points in function
                complexity = 1  # Base complexity

                for child in ast.walk(node):
                    if isinstance(child, (ast.If, ast.While, ast.For)):
                        complexity += 1
                    elif isinstance(child, ast.Try):
                        complexity += 1
                    elif isinstance(child, ast.ExceptHandler):
                        complexity += 1

                if complexity > 10:  # Cyclomatic complexity threshold
                    results.append(
                        ValidationResult(
                            agent_type="backend",
                            file_path=file_path,
                            severity="warning",
                            message=f"Function '{node.name}' has high complexity ({complexity})",
                            line_number=node.lineno,
                            fix_suggestion="Break down into smaller functions",
                            rule_id="high_complexity",
                        )
                    )

        return results

    def _validate_route_organization(
        self, file_path: str, file_content: str
    ) -> List[ValidationResult]:
        """Validate FastAPI route organization."""
        results = []

        # Check for route grouping
        route_patterns = re.findall(
            r'@\w+\.(get|post|put|delete)\s*\(["\']([^"\']+)["\']', file_content
        )

        if len(route_patterns) > 5:
            # Suggest using APIRouter for route organization
            if "APIRouter" not in file_content:
                results.append(
                    ValidationResult(
                        agent_type="backend",
                        file_path=file_path,
                        severity="info",
                        message="Consider using APIRouter for better route organization",
                        fix_suggestion="Group related routes using APIRouter",
                        rule_id="route_organization",
                    )
                )

        # Check route path consistency
        paths = [path for _, path in route_patterns]
        if paths:
            # Check for consistent naming
            inconsistent_naming = []
            for path in paths:
                if not re.match(r"^/[a-z0-9-_/]*$", path):
                    inconsistent_naming.append(path)

            if inconsistent_naming:
                results.append(
                    ValidationResult(
                        agent_type="backend",
                        file_path=file_path,
                        severity="info",
                        message=f"Inconsistent route path naming: {inconsistent_naming}",
                        fix_suggestion="Use lowercase with hyphens for route paths",
                        rule_id="route_path_naming",
                    )
                )

        return results

    def _validate_pydantic_models(
        self, file_path: str, file_content: str
    ) -> List[ValidationResult]:
        """Validate Pydantic model usage."""
        results = []

        # Check for Pydantic model definitions
        has_models = "BaseModel" in file_content
        has_routes = any(
            method in file_content
            for method in ["@app.post", "@app.put", "@router.post", "@router.put"]
        )

        if has_routes and not has_models:
            results.append(
                ValidationResult(
                    agent_type="backend",
                    file_path=file_path,
                    severity="info",
                    message="Routes defined but no Pydantic models found",
                    fix_suggestion="Define request/response models using Pydantic",
                    rule_id="missing_pydantic_models",
                )
            )

        # Check for proper model validation
        if has_models:
            if "Field(" not in file_content and "validator" not in file_content:
                results.append(
                    ValidationResult(
                        agent_type="backend",
                        file_path=file_path,
                        severity="info",
                        message="Pydantic models could benefit from field validation",
                        fix_suggestion="Add Field() constraints or custom validators",
                        rule_id="model_validation",
                    )
                )

        return results

    def get_backend_quality_report(
        self, results: List[ValidationResult]
    ) -> Dict[str, Any]:
        """Generate backend quality report."""
        backend_results = [r for r in results if r.agent_type == "backend"]

        categories = {
            "python_quality": [r for r in backend_results if "python" in r.rule_id],
            "fastapi_issues": [r for r in backend_results if "fastapi" in r.rule_id],
            "database_issues": [r for r in backend_results if "database" in r.rule_id],
            "complexity_issues": [
                r
                for r in backend_results
                if "complexity" in r.rule_id or "length" in r.rule_id
            ],
            "type_hint_issues": [
                r for r in backend_results if "type_hint" in r.rule_id
            ],
        }

        return {
            "total_backend_issues": len(backend_results),
            "categories": {k: len(v) for k, v in categories.items()},
            "severity_breakdown": {
                "errors": len([r for r in backend_results if r.severity == "error"]),
                "warnings": len(
                    [r for r in backend_results if r.severity == "warning"]
                ),
                "info": len([r for r in backend_results if r.severity == "info"]),
            },
            "code_quality_score": self._calculate_quality_score(backend_results),
            "recommendations": self._generate_backend_recommendations(backend_results),
        }

    def _calculate_quality_score(self, results: List[ValidationResult]) -> int:
        """Calculate code quality score (0-100)."""
        if not results:
            return 100

        total_issues = len(results)
        error_weight = 10
        warning_weight = 5
        info_weight = 1

        weighted_score = sum(
            [
                error_weight
                if r.severity == "error"
                else warning_weight
                if r.severity == "warning"
                else info_weight
                for r in results
            ]
        )

        # Simple scoring algorithm
        max_score = total_issues * error_weight
        quality_score = (
            max(0, 100 - (weighted_score / max_score * 100)) if max_score > 0 else 100
        )

        return int(quality_score)

    def _generate_backend_recommendations(
        self, results: List[ValidationResult]
    ) -> List[str]:
        """Generate backend recommendations based on found issues."""
        recommendations = []

        rule_counts = {}
        for result in results:
            rule_counts[result.rule_id] = rule_counts.get(result.rule_id, 0) + 1

        if rule_counts.get("missing_type_hint", 0) > 5:
            recommendations.append(
                "Add comprehensive type hints throughout the codebase"
            )

        if rule_counts.get("function_too_long", 0) > 2:
            recommendations.append(
                "Refactor long functions into smaller, more focused functions"
            )

        if rule_counts.get("high_complexity", 0) > 1:
            recommendations.append(
                "Reduce cyclomatic complexity by simplifying control flow"
            )

        if rule_counts.get("missing_organization_filter", 0) > 0:
            recommendations.append(
                "Ensure all database operations include organization_id filtering"
            )

        if rule_counts.get("route_organization", 0) > 0:
            recommendations.append(
                "Consider using APIRouter for better route organization"
            )

        if not recommendations:
            recommendations.append("Backend code quality is well maintained")

        return recommendations
