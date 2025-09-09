"""
Functional Agent - TypeScript/React Validation Specialist

This agent focuses on functional correctness including:
- TypeScript type safety and compilation
- React component prop validation
- Hook rules compliance
- API contract validation
- Import/export consistency
"""

import re
import json
from typing import List, Dict, Any, Set
from pathlib import Path

from pydantic import BaseModel
from pydantic_ai import Agent

from .quality_control_agent import ValidationResult


class ComponentAnalysis(BaseModel):
    """Analysis result for a React component."""
    name: str
    props: List[str]
    hooks: List[str]
    imports: List[str]
    exports: List[str]
    has_typescript: bool


class FunctionalAgent:
    """
    Specialized agent for functional validation of TypeScript/React code.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        # React Hook rules
        self.hook_rules = [
            {
                "pattern": r"use\w+\s*\(",
                "rule": "hooks_at_top_level",
                "message": "Hooks must be called at the top level of the function",
                "severity": "error"
            },
            {
                "pattern": r"if\s*\([^)]*\)\s*{[^}]*use\w+",
                "rule": "no_hooks_in_conditions", 
                "message": "Hooks cannot be called inside loops, conditions, or nested functions",
                "severity": "error"
            }
        ]
        
        # TypeScript patterns to check
        self.typescript_patterns = [
            {
                "pattern": r":\s*any\b",
                "severity": "warning",
                "message": "Avoid using 'any' type - use specific types instead",
                "fix": "Define specific interface or use union types"
            },
            {
                "pattern": r"@ts-ignore",
                "severity": "warning", 
                "message": "TypeScript error suppression found",
                "fix": "Fix the underlying type issue instead of ignoring it"
            },
            {
                "pattern": r"console\.log\(",
                "severity": "info",
                "message": "Console.log statement found - consider removing for production",
                "fix": "Use proper logging library or remove debug statements"
            }
        ]
        
        # Common React antipatterns
        self.react_antipatterns = [
            {
                "pattern": r"dangerouslySetInnerHTML",
                "severity": "warning",
                "message": "Using dangerouslySetInnerHTML - potential XSS risk",
                "fix": "Sanitize HTML content or use safer alternatives"
            },
            {
                "pattern": r"onclick\s*=\s*['\"]",
                "severity": "error",
                "message": "Use onClick instead of onclick in React",
                "fix": "Replace onclick with onClick"
            },
            {
                "pattern": r"className\s*=\s*['\"][^'\"]*\s[^'\"]*['\"]",
                "severity": "info",
                "message": "Multiple classes in single string - consider using classNames utility",
                "fix": "Use classnames library for conditional class names"
            }
        ]
        
        # React context and state synchronization patterns
        self.react_synchronization_patterns = [
            {
                "pattern": r"useState.*\[.*Settings.*\]",
                "severity": "warning", 
                "message": "Local state for settings detected - consider using React Context for global state",
                "fix": "Use React Context to share settings state across components",
                "context_check": True
            },
            {
                "pattern": r"const\s+\{.*Settings.*\}\s*=\s*use\w+\(\);",
                "severity": "info",
                "message": "Settings hook usage detected - verify context provider is correctly configured",
                "fix": "Ensure settings context provider wraps all consuming components",
                "context_check": True
            }
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
            instructions=self.config.get("system_prompt", self._default_system_prompt()),
            model_settings=model_settings if model_settings else None
        )
    
    def _default_system_prompt(self) -> str:
        """Default system prompt for the functional agent."""
        return """
        You are a senior software engineer specializing in TypeScript, React, and API validation.
        
        Your primary responsibilities:
        1. Ensure TypeScript type safety and proper type annotations
        2. Validate React component structure and prop handling
        3. Check compliance with React Hook rules
        4. Verify API endpoint contracts and error handling
        5. Validate import/export statements and module structure
        
        Focus on:
        - Type safety and avoiding 'any' types
        - Proper React component patterns
        - Hook usage following React rules
        - Error handling and validation
        - Performance implications
        - Accessibility basics
        
        Provide specific, actionable feedback with code examples when possible.
        """
    
    async def validate(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """
        Validate file for functional issues.
        
        Args:
            file_path: Path to the file being validated
            file_content: Content of the file
            validation_rules: Functional validation rules from config
            
        Returns:
            List of validation results
        """
        # Clear terminal output for agent execution tracking
        print(f"⚙️  FUNCTIONAL AGENT: Starting validation on {Path(file_path).name}")
        
        results = []
        file_ext = Path(file_path).suffix.lower()
        
        # TypeScript/JavaScript file validation
        if file_ext in [".ts", ".tsx", ".js", ".jsx"]:
            results.extend(self._validate_typescript_functional(file_path, file_content, validation_rules))
            
            # React-specific validation for component files
            if file_ext in [".tsx", ".jsx"] or "component" in file_path.lower():
                results.extend(self._validate_react_component(file_path, file_content, validation_rules))
        
        # Package.json validation
        elif file_path.endswith("package.json"):
            results.extend(self._validate_package_json(file_path, file_content, validation_rules))
        
        # API-related files
        elif "api" in file_path.lower() or "service" in file_path.lower():
            results.extend(self._validate_api_patterns(file_path, file_content, validation_rules))
        
        return results
    
    def _validate_typescript_functional(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Validate TypeScript-specific functional issues."""
        results = []
        lines = file_content.split('\n')
        
        # Check TypeScript patterns
        for pattern_obj in self.typescript_patterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)
            
            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(ValidationResult(
                        agent_type="functional",
                        file_path=file_path,
                        severity=pattern_obj["severity"],
                        message=pattern_obj["message"],
                        line_number=line_num,
                        fix_suggestion=pattern_obj.get("fix", ""),
                        rule_id=f"ts_{pattern_obj['pattern'][:20]}"
                    ))
        
        # Check for proper imports
        results.extend(self._validate_imports(file_path, file_content))
        
        # Check for type definitions
        results.extend(self._validate_type_definitions(file_path, file_content))
        
        return results
    
    def _validate_react_component(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Validate React component functional issues."""
        results = []
        lines = file_content.split('\n')
        
        # Analyze component structure
        component_analysis = self._analyze_component_structure(file_content)
        
        # Check React antipatterns
        for pattern_obj in self.react_antipatterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)
            
            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(ValidationResult(
                        agent_type="functional",
                        file_path=file_path,
                        severity=pattern_obj["severity"],
                        message=pattern_obj["message"],
                        line_number=line_num,
                        fix_suggestion=pattern_obj.get("fix", ""),
                        rule_id=f"react_{pattern_obj['pattern'][:20]}"
                    ))
        
        # Validate Hook usage
        results.extend(self._validate_hook_usage(file_path, file_content))
        
        # Check prop validation
        if validation_rules.get("react", {}).get("enforce_prop_types", True):
            results.extend(self._validate_prop_types(file_path, file_content, component_analysis))
        
        # Check for accessibility
        if validation_rules.get("react", {}).get("validate_accessibility", True):
            results.extend(self._validate_accessibility_basics(file_path, file_content))
            
        # Check for React state synchronization issues
        if validation_rules.get("react", {}).get("validate_state_synchronization", True):
            results.extend(self._validate_react_synchronization(file_path, file_content))
        
        return results
    
    def _analyze_component_structure(self, file_content: str) -> ComponentAnalysis:
        """Analyze React component structure."""
        # Extract component name
        component_name_match = re.search(r"(?:function|const)\s+(\w+)(?:\s*[:=]|\s*\()", file_content)
        component_name = component_name_match.group(1) if component_name_match else "UnknownComponent"
        
        # Extract imports
        import_matches = re.findall(r"import\s+.*?from\s+['\"]([^'\"]+)['\"]", file_content)
        
        # Extract hooks usage
        hook_matches = re.findall(r"(use\w+)\s*\(", file_content)
        
        # Extract props (simplified detection)
        props_matches = re.findall(r"props\.(\w+)", file_content)
        interface_props = re.findall(r"(\w+)\s*:\s*\w+", file_content) if "interface" in file_content else []
        
        # Check if it has TypeScript
        has_typescript = ".tsx" in file_content or "interface" in file_content or ":" in file_content
        
        return ComponentAnalysis(
            name=component_name,
            props=list(set(props_matches + interface_props)),
            hooks=list(set(hook_matches)),
            imports=import_matches,
            exports=[],  # Simplified for now
            has_typescript=has_typescript
        )
    
    def _validate_hook_usage(self, file_path: str, file_content: str) -> List[ValidationResult]:
        """Validate React Hook rules compliance."""
        results = []
        lines = file_content.split('\n')
        
        # Find hooks usage
        hook_lines = []
        for line_num, line in enumerate(lines, 1):
            if re.search(r"use\w+\s*\(", line):
                hook_lines.append((line_num, line.strip()))
        
        if not hook_lines:
            return results
        
        # Check if hooks are at top level (simplified check)
        for line_num, line in hook_lines:
            # Check if hook is inside a condition, loop, or nested function
            preceding_lines = lines[:line_num-1]
            
            # Count open braces vs close braces to detect nesting
            brace_count = 0
            condition_detected = False
            
            for prev_line in reversed(preceding_lines[-10:]):  # Check last 10 lines
                brace_count += prev_line.count('{') - prev_line.count('}')
                
                if re.search(r'\b(if|for|while|switch)\s*\(', prev_line):
                    condition_detected = True
                
                if brace_count < 0:  # We're inside a nested block
                    break
            
            if condition_detected and brace_count > 0:
                results.append(ValidationResult(
                    agent_type="functional",
                    file_path=file_path,
                    severity="error",
                    message="Hook called inside conditional statement or loop",
                    line_number=line_num,
                    fix_suggestion="Move hook to top level of component function",
                    rule_id="hook_rules_violation"
                ))
        
        return results
    
    def _validate_prop_types(self, file_path: str, file_content: str, component_analysis: ComponentAnalysis) -> List[ValidationResult]:
        """Validate component prop types."""
        results = []
        
        if not component_analysis.has_typescript and component_analysis.props:
            results.append(ValidationResult(
                agent_type="functional",
                file_path=file_path,
                severity="warning", 
                message="Component uses props but lacks TypeScript interface definition",
                fix_suggestion="Define a TypeScript interface for component props",
                rule_id="missing_prop_types"
            ))
        
        # Check for unused props
        defined_props = set(component_analysis.props)
        used_props = set(re.findall(r"props\.(\w+)", file_content))
        
        unused_props = defined_props - used_props
        if unused_props:
            results.append(ValidationResult(
                agent_type="functional",
                file_path=file_path,
                severity="info",
                message=f"Unused props detected: {', '.join(unused_props)}",
                fix_suggestion="Remove unused props from interface or use them in component",
                rule_id="unused_props"
            ))
        
        return results
    
    def _validate_accessibility_basics(self, file_path: str, file_content: str) -> List[ValidationResult]:
        """Validate basic accessibility requirements."""
        results = []
        lines = file_content.split('\n')
        
        accessibility_checks = [
            {
                "pattern": r"<img[^>]*(?!.*alt=)",
                "message": "Image element missing alt attribute",
                "fix": "Add alt attribute to describe the image for screen readers"
            },
            {
                "pattern": r"<button[^>]*onClick.*(?!.*aria-label)",
                "message": "Interactive element might need aria-label for screen readers", 
                "fix": "Add aria-label or ensure button text is descriptive"
            },
            {
                "pattern": r"<div[^>]*onClick",
                "message": "Avoid onClick on div elements - use button or add keyboard support",
                "fix": "Use <button> element or add onKeyDown handler"
            }
        ]
        
        for line_num, line in enumerate(lines, 1):
            for check in accessibility_checks:
                if re.search(check["pattern"], line, re.IGNORECASE):
                    results.append(ValidationResult(
                        agent_type="functional",
                        file_path=file_path,
                        severity="warning",
                        message=check["message"],
                        line_number=line_num,
                        fix_suggestion=check["fix"],
                        rule_id="accessibility_basic"
                    ))
        
        return results
    
    def _validate_react_synchronization(self, file_path: str, file_content: str) -> List[ValidationResult]:
        """Validate React state synchronization patterns to prevent context issues."""
        results = []
        lines = file_content.split('\n')
        
        # Check synchronization patterns
        for pattern_obj in self.react_synchronization_patterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)
            
            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(ValidationResult(
                        agent_type="functional",
                        file_path=file_path,
                        severity=pattern_obj["severity"],
                        message=pattern_obj["message"],
                        line_number=line_num,
                        fix_suggestion=pattern_obj["fix"],
                        rule_id=f"sync_{pattern_obj['pattern'][:20]}"
                    ))
        
        # Specific check for module settings patterns (the issue we just fixed)
        if "useModuleSettings" in file_content:
            # Check if it's imported from hooks instead of context
            if "import.*useModuleSettings.*from.*hooks" in file_content:
                results.append(ValidationResult(
                    agent_type="functional",
                    file_path=file_path,
                    severity="error",
                    message="useModuleSettings imported from hooks instead of context - this causes synchronization issues",
                    fix_suggestion="Change import to: import { useModuleSettings } from '../contexts/ModuleSettingsContext'",
                    rule_id="context_sync_issue"
                ))
            
            # Check if multiple components use module settings without global context
            if "useState" in file_content and "moduleSettings" in file_content:
                results.append(ValidationResult(
                    agent_type="functional",
                    file_path=file_path,
                    severity="warning", 
                    message="Local state management detected for module settings - may cause sync issues",
                    fix_suggestion="Ensure ModuleSettingsContext is used for global state synchronization",
                    rule_id="local_state_sync_warning"
                ))
        
        # Check for missing context providers
        if "Context" in file_content and "Provider" in file_content:
            # This is likely a context file, check if it's properly structured
            if "createContext" in file_content and "useState" in file_content:
                # Good - context with state management
                results.append(ValidationResult(
                    agent_type="functional",
                    file_path=file_path,
                    severity="info",
                    message="React Context detected - ensure this provider wraps all consuming components",
                    fix_suggestion="Add context provider to App.tsx or appropriate parent component",
                    rule_id="context_provider_reminder"
                ))
        
        return results
    
    def _validate_imports(self, file_path: str, file_content: str) -> List[ValidationResult]:
        """Validate import statements."""
        results = []
        lines = file_content.split('\n')
        
        imports_section = []
        non_import_started = False
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            
            if stripped.startswith('import '):
                if non_import_started:
                    results.append(ValidationResult(
                        agent_type="functional",
                        file_path=file_path,
                        severity="info",
                        message="Import statement after code - organize imports at top",
                        line_number=line_num,
                        fix_suggestion="Move all imports to the top of the file",
                        rule_id="import_organization"
                    ))
                imports_section.append((line_num, stripped))
            elif stripped and not stripped.startswith('//') and not stripped.startswith('/*'):
                non_import_started = True
        
        # Check for unused imports (simplified)
        for line_num, import_line in imports_section:
            import_match = re.search(r"import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from", import_line)
            if import_match:
                if import_match.group(1):  # Named imports
                    named_imports = [imp.strip() for imp in import_match.group(1).split(',')]
                    for named_import in named_imports:
                        if named_import not in file_content[len(import_line):]:
                            results.append(ValidationResult(
                                agent_type="functional",
                                file_path=file_path,
                                severity="info",
                                message=f"Unused import: {named_import}",
                                line_number=line_num,
                                fix_suggestion="Remove unused import to reduce bundle size",
                                rule_id="unused_import"
                            ))
        
        return results
    
    def _validate_type_definitions(self, file_path: str, file_content: str) -> List[ValidationResult]:
        """Validate TypeScript type definitions."""
        results = []
        
        # Check for function parameters without types
        function_pattern = r"function\s+\w+\s*\([^)]*\w+(?!\s*:)\s*[,)]"
        if re.search(function_pattern, file_content):
            results.append(ValidationResult(
                agent_type="functional",
                file_path=file_path,
                severity="warning",
                message="Function parameters missing type annotations",
                fix_suggestion="Add TypeScript type annotations to all parameters",
                rule_id="missing_parameter_types"
            ))
        
        # Check for return type annotations
        function_without_return_type = r"function\s+\w+\s*\([^)]*\)(?!\s*:)\s*{"
        if re.search(function_without_return_type, file_content):
            results.append(ValidationResult(
                agent_type="functional",
                file_path=file_path,
                severity="info",
                message="Function missing return type annotation",
                fix_suggestion="Add explicit return type to improve type safety",
                rule_id="missing_return_type"
            ))
        
        return results
    
    def _validate_package_json(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Validate package.json structure."""
        results = []
        
        try:
            package_data = json.loads(file_content)
            
            # Check required fields
            required_fields = ["name", "version", "scripts"]
            for field in required_fields:
                if field not in package_data:
                    results.append(ValidationResult(
                        agent_type="functional",
                        file_path=file_path,
                        severity="error",
                        message=f"Missing required field: {field}",
                        fix_suggestion=f"Add '{field}' field to package.json",
                        rule_id="missing_package_field"
                    ))
            
            # Check for security vulnerabilities in dependencies (basic check)
            if "dependencies" in package_data:
                for dep, version in package_data["dependencies"].items():
                    if "*" in version or "latest" in version:
                        results.append(ValidationResult(
                            agent_type="functional",
                            file_path=file_path,
                            severity="warning",
                            message=f"Dependency {dep} uses unpinned version: {version}",
                            fix_suggestion="Use specific version numbers for better reproducibility",
                            rule_id="unpinned_dependency"
                        ))
        
        except json.JSONDecodeError as e:
            results.append(ValidationResult(
                agent_type="functional",
                file_path=file_path,
                severity="error",
                message=f"Invalid JSON syntax: {e}",
                fix_suggestion="Fix JSON syntax errors",
                rule_id="invalid_json"
            ))
        
        return results
    
    def _validate_api_patterns(self, file_path: str, file_content: str, validation_rules: Dict[str, Any]) -> List[ValidationResult]:
        """Validate API-related patterns."""
        results = []
        
        # Check for proper error handling in API calls
        api_call_patterns = ["fetch(", "axios.", "http."]
        has_api_calls = any(pattern in file_content for pattern in api_call_patterns)
        
        if has_api_calls:
            if "catch" not in file_content and "try" not in file_content:
                results.append(ValidationResult(
                    agent_type="functional",
                    file_path=file_path,
                    severity="warning",
                    message="API calls without error handling detected",
                    fix_suggestion="Add try/catch or .catch() for proper error handling",
                    rule_id="missing_error_handling"
                ))
            
            # Check for status code validation
            if "status" not in file_content and "ok" not in file_content:
                results.append(ValidationResult(
                    agent_type="functional",
                    file_path=file_path,
                    severity="info",
                    message="API calls should validate response status",
                    fix_suggestion="Check response.ok or response.status for proper handling",
                    rule_id="missing_status_validation"
                ))
        
        return results