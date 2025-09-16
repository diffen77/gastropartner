"""
Design Agent - CSS/Design System Consistency Specialist

This agent focuses on design consistency including:
- CSS class naming conventions (BEM)
- Design token usage
- Component style consistency
- Accessibility compliance
- Responsive design patterns
"""

import re
from typing import List, Dict, Any, Set
from pathlib import Path

from pydantic import BaseModel
from pydantic_ai import Agent

from .quality_control_agent import ValidationResult


class DesignTokens(BaseModel):
    """Design tokens detected in the system."""

    colors: Set[str] = set()
    spacing: Set[str] = set()
    typography: Set[str] = set()
    breakpoints: Set[str] = set()


class DesignAgent:
    """
    Specialized agent for design system validation and consistency.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # BEM naming convention patterns
        self.bem_patterns = {
            "block": r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$",
            "element": r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*__[a-z0-9]+(?:-[a-z0-9]+)*$",
            "modifier": r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?--[a-z0-9]+(?:-[a-z0-9]+)*$",
        }

        # Common design system tokens (can be extended)
        self.design_tokens = {
            "colors": [
                "primary",
                "secondary",
                "accent",
                "neutral",
                "success",
                "warning",
                "error",
                "text",
                "background",
                "surface",
                "border",
            ],
            "spacing": [
                "xs",
                "sm",
                "md",
                "lg",
                "xl",
                "2xl",
                "3xl",
                "4xl",
                "5xl",
                "6xl",
            ],
            "typography": ["heading", "body", "caption", "label", "code", "display"],
            "breakpoints": [
                "mobile",
                "tablet",
                "desktop",
                "wide",
                "sm",
                "md",
                "lg",
                "xl",
            ],
        }

        # CSS antipatterns to avoid
        self.css_antipatterns = [
            {
                "pattern": r"!important",
                "severity": "warning",
                "message": "Avoid !important - use more specific selectors instead",
                "fix": "Refactor CSS to avoid specificity conflicts",
            },
            {
                "pattern": r"position:\s*fixed",
                "severity": "info",
                "message": "Fixed positioning can cause mobile accessibility issues",
                "fix": "Consider sticky positioning or ensure mobile compatibility",
            },
            {
                "pattern": r"font-size:\s*\d+px",
                "severity": "warning",
                "message": "Use relative units (rem/em) instead of pixels for font-size",
                "fix": "Replace px with rem or em for better accessibility",
            },
            {
                "pattern": r"color:\s*#[0-9a-fA-F]{3,6}",
                "severity": "info",
                "message": "Consider using design tokens instead of hardcoded colors",
                "fix": "Define color in design token system",
            },
        ]

        # Accessibility checks for CSS
        self.accessibility_patterns = [
            {
                "pattern": r"outline:\s*none",
                "severity": "error",
                "message": "Removing outline affects keyboard navigation accessibility",
                "fix": "Provide alternative focus indicator",
            },
            {
                "pattern": r"font-size:\s*[0-9]+px(?:\s*;|\s*}|\s*,).*(?:font-size:\s*[0-9]+px|$)",
                "severity": "warning",
                "message": "Fixed font sizes may not respect user accessibility settings",
                "fix": "Use relative units that scale with user preferences",
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
        """Default system prompt for the design agent."""
        return """
        You are a design system specialist focused on UI consistency and accessibility.
        
        Your primary responsibilities:
        1. Enforce CSS class naming conventions (BEM methodology)
        2. Validate design token usage for colors, spacing, and typography
        3. Ensure component style consistency across the application
        4. Check WCAG 2.1 AA accessibility compliance
        5. Validate responsive design patterns
        
        Focus on:
        - Consistent class naming following BEM convention
        - Use of design tokens instead of hardcoded values
        - Accessibility best practices
        - Maintainable and scalable CSS architecture
        - Cross-browser compatibility
        
        GastroPartner design system priorities:
        - Clean, simple, modern design
        - Mobile-first responsive design
        - High contrast for readability
        - Consistent spacing and typography scale
        """

    async def validate(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """
        Validate file for design consistency issues.

        Args:
            file_path: Path to the file being validated
            file_content: Content of the file
            validation_rules: Design validation rules from config

        Returns:
            List of validation results
        """
        # Clear terminal output for agent execution tracking
        print(f"🎨 DESIGN AGENT: Starting validation on {Path(file_path).name}")

        results = []
        file_ext = Path(file_path).suffix.lower()

        # CSS file validation
        if file_ext in [".css", ".scss", ".sass"]:
            results.extend(
                self._validate_css_file(file_path, file_content, validation_rules)
            )

        # React/HTML component validation for inline styles and class names
        elif file_ext in [".tsx", ".jsx", ".html"]:
            results.extend(
                self._validate_component_styles(
                    file_path, file_content, validation_rules
                )
            )

        # Global validation for design token consistency
        results.extend(
            self._validate_design_token_usage(file_path, file_content, validation_rules)
        )

        return results

    def _validate_css_file(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate CSS file for design consistency."""
        results = []
        lines = file_content.split("\n")

        # Check CSS antipatterns
        for pattern_obj in self.css_antipatterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)

            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(
                        ValidationResult(
                            agent_type="design",
                            file_path=file_path,
                            severity=pattern_obj["severity"],
                            message=pattern_obj["message"],
                            line_number=line_num,
                            fix_suggestion=pattern_obj["fix"],
                            rule_id=f"css_{pattern_obj['pattern'][:20]}",
                        )
                    )

        # Check accessibility patterns
        for pattern_obj in self.accessibility_patterns:
            pattern = re.compile(pattern_obj["pattern"], re.IGNORECASE)

            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    results.append(
                        ValidationResult(
                            agent_type="design",
                            file_path=file_path,
                            severity=pattern_obj["severity"],
                            message=pattern_obj["message"],
                            line_number=line_num,
                            fix_suggestion=pattern_obj["fix"],
                            rule_id="accessibility_css",
                        )
                    )

        # Validate BEM naming convention
        if validation_rules.get("css", {}).get("enforce_naming_convention") == "BEM":
            results.extend(self._validate_bem_naming(file_path, file_content))

        # Check CSS specificity
        results.extend(
            self._validate_css_specificity(file_path, file_content, validation_rules)
        )

        # Check for responsive design patterns
        results.extend(self._validate_responsive_patterns(file_path, file_content))

        return results

    def _validate_component_styles(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate component styling in React/HTML files."""
        results = []
        lines = file_content.split("\n")

        # Check className usage
        class_name_pattern = r'className\s*=\s*["\']([^"\']+)["\']'

        for line_num, line in enumerate(lines, 1):
            class_matches = re.finditer(class_name_pattern, line)

            for match in class_matches:
                class_names = match.group(1).split()

                for class_name in class_names:
                    # Check BEM compliance
                    if (
                        validation_rules.get("css", {}).get("enforce_naming_convention")
                        == "BEM"
                    ):
                        if not self._is_valid_bem_class(class_name):
                            results.append(
                                ValidationResult(
                                    agent_type="design",
                                    file_path=file_path,
                                    severity="warning",
                                    message=f"Class '{class_name}' doesn't follow BEM convention",
                                    line_number=line_num,
                                    fix_suggestion="Use BEM format: block__element--modifier",
                                    rule_id="bem_violation",
                                )
                            )

        # Check for inline styles
        inline_style_pattern = r'style\s*=\s*["\'][^"\']*["\']'
        if re.search(inline_style_pattern, file_content):
            results.append(
                ValidationResult(
                    agent_type="design",
                    file_path=file_path,
                    severity="info",
                    message="Inline styles detected - consider using CSS classes",
                    fix_suggestion="Move styles to CSS files for better maintainability",
                    rule_id="inline_styles",
                )
            )

        # Check for hardcoded colors in style attributes
        color_pattern = r'style=["\'][^"\']*(?:color|background)[^"\']*#[0-9a-fA-F]{3,6}[^"\']*["\']'
        if re.search(color_pattern, file_content):
            results.append(
                ValidationResult(
                    agent_type="design",
                    file_path=file_path,
                    severity="warning",
                    message="Hardcoded colors in inline styles",
                    fix_suggestion="Use design token variables for colors",
                    rule_id="hardcoded_colors",
                )
            )

        return results

    def _validate_bem_naming(
        self, file_path: str, file_content: str
    ) -> List[ValidationResult]:
        """Validate BEM naming convention in CSS."""
        results = []

        # Extract CSS selectors
        selector_pattern = r"\.([a-zA-Z][a-zA-Z0-9_-]*)"
        selectors = re.findall(selector_pattern, file_content)

        for selector in selectors:
            if not self._is_valid_bem_class(selector):
                results.append(
                    ValidationResult(
                        agent_type="design",
                        file_path=file_path,
                        severity="info",
                        message=f"CSS class '{selector}' doesn't follow BEM convention",
                        fix_suggestion="Use BEM format: block, block__element, or block--modifier",
                        rule_id="bem_naming",
                    )
                )

        return results

    def _is_valid_bem_class(self, class_name: str) -> bool:
        """Check if a class name follows BEM convention."""
        # Allow utility classes and component library classes
        utility_prefixes = [
            "flex",
            "grid",
            "text-",
            "bg-",
            "p-",
            "m-",
            "w-",
            "h-",
            "btn",
            "card",
        ]
        if any(class_name.startswith(prefix) for prefix in utility_prefixes):
            return True

        # Check BEM patterns
        for pattern_type, pattern in self.bem_patterns.items():
            if re.match(pattern, class_name):
                return True

        return False

    def _validate_css_specificity(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate CSS specificity levels."""
        results = []
        max_specificity = validation_rules.get("css", {}).get("max_specificity", 3)

        # Simplified specificity check - count selector parts
        lines = file_content.split("\n")

        for line_num, line in enumerate(lines, 1):
            # Find CSS selectors (simplified)
            selector_match = re.match(r"^([^{]+){", line.strip())
            if selector_match:
                selector = selector_match.group(1).strip()

                # Count specificity indicators
                id_count = selector.count("#")
                class_count = selector.count(".")
                element_count = len(re.findall(r"\b[a-z]+\b", selector))

                # Simple specificity calculation
                specificity_score = id_count * 100 + class_count * 10 + element_count

                if specificity_score > max_specificity * 10:
                    results.append(
                        ValidationResult(
                            agent_type="design",
                            file_path=file_path,
                            severity="warning",
                            message=f"High specificity selector: {selector} (score: {specificity_score})",
                            line_number=line_num,
                            fix_suggestion="Reduce selector specificity by using classes instead of nested selectors",
                            rule_id="high_specificity",
                        )
                    )

        return results

    def _validate_responsive_patterns(
        self, file_path: str, file_content: str
    ) -> List[ValidationResult]:
        """Validate responsive design patterns."""
        results = []

        # Check for media queries
        has_media_queries = "@media" in file_content

        # Check for mobile-first approach
        mobile_first_pattern = r"@media\s*\([^)]*min-width"
        desktop_first_pattern = r"@media\s*\([^)]*max-width"

        mobile_first_count = len(re.findall(mobile_first_pattern, file_content))
        desktop_first_count = len(re.findall(desktop_first_pattern, file_content))

        if has_media_queries and desktop_first_count > mobile_first_count:
            results.append(
                ValidationResult(
                    agent_type="design",
                    file_path=file_path,
                    severity="info",
                    message="Consider mobile-first responsive design approach",
                    fix_suggestion="Use min-width media queries for mobile-first design",
                    rule_id="mobile_first_responsive",
                )
            )

        # Check for common responsive breakpoints
        if has_media_queries:
            common_breakpoints = ["768px", "1024px", "1280px"]
            used_breakpoints = []

            for breakpoint in common_breakpoints:
                if breakpoint in file_content:
                    used_breakpoints.append(breakpoint)

            if not used_breakpoints:
                results.append(
                    ValidationResult(
                        agent_type="design",
                        file_path=file_path,
                        severity="info",
                        message="Consider using standard breakpoint values",
                        fix_suggestion="Use common breakpoints like 768px, 1024px, 1280px",
                        rule_id="standard_breakpoints",
                    )
                )

        return results

    def _validate_design_token_usage(
        self, file_path: str, file_content: str, validation_rules: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate usage of design tokens."""
        results = []

        if not validation_rules.get("components", {}).get(
            "require_design_tokens", True
        ):
            return results

        # Check for hardcoded values that should use tokens
        hardcoded_patterns = [
            {
                "pattern": r"#[0-9a-fA-F]{3,6}",
                "token_type": "color",
                "message": "Hardcoded color value found",
                "fix": "Use design token variable for colors",
            },
            {
                "pattern": r"(?:padding|margin):\s*\d+px",
                "token_type": "spacing",
                "message": "Hardcoded spacing value found",
                "fix": "Use design token variable for spacing",
            },
            {
                "pattern": r"font-size:\s*\d+px",
                "token_type": "typography",
                "message": "Hardcoded font size found",
                "fix": "Use design token variable for typography",
            },
        ]

        lines = file_content.split("\n")

        for pattern_obj in hardcoded_patterns:
            pattern = re.compile(pattern_obj["pattern"])

            for line_num, line in enumerate(lines, 1):
                if pattern.search(line):
                    # Check if this line already uses variables/tokens
                    if not any(
                        token_indicator in line
                        for token_indicator in ["var(", "$", "--"]
                    ):
                        results.append(
                            ValidationResult(
                                agent_type="design",
                                file_path=file_path,
                                severity="info",
                                message=pattern_obj["message"],
                                line_number=line_num,
                                fix_suggestion=pattern_obj["fix"],
                                rule_id=f"design_token_{pattern_obj['token_type']}",
                            )
                        )

        return results

    def extract_design_tokens(self, file_content: str) -> DesignTokens:
        """Extract design tokens used in the file."""
        tokens = DesignTokens()

        # Extract CSS custom properties (--variable-name)
        css_vars = re.findall(r"--([a-zA-Z0-9-]+)", file_content)

        for var in css_vars:
            if any(color_token in var for color_token in self.design_tokens["colors"]):
                tokens.colors.add(var)
            elif any(
                spacing_token in var for spacing_token in self.design_tokens["spacing"]
            ):
                tokens.spacing.add(var)
            elif any(
                typo_token in var for typo_token in self.design_tokens["typography"]
            ):
                tokens.typography.add(var)

        # Extract SCSS variables
        scss_vars = re.findall(r"\$([a-zA-Z0-9-]+)", file_content)

        for var in scss_vars:
            if any(color_token in var for color_token in self.design_tokens["colors"]):
                tokens.colors.add(var)
            elif any(
                spacing_token in var for spacing_token in self.design_tokens["spacing"]
            ):
                tokens.spacing.add(var)
            elif any(
                typo_token in var for typo_token in self.design_tokens["typography"]
            ):
                tokens.typography.add(var)

        return tokens

    def get_design_consistency_report(
        self, results: List[ValidationResult]
    ) -> Dict[str, Any]:
        """Generate design consistency report."""
        design_results = [r for r in results if r.agent_type == "design"]

        categories = {
            "bem_violations": [r for r in design_results if "bem" in r.rule_id],
            "accessibility_issues": [
                r for r in design_results if "accessibility" in r.rule_id
            ],
            "design_token_issues": [
                r for r in design_results if "design_token" in r.rule_id
            ],
            "css_quality": [r for r in design_results if "css" in r.rule_id],
            "responsive_issues": [
                r for r in design_results if "responsive" in r.rule_id
            ],
        }

        return {
            "total_design_issues": len(design_results),
            "categories": {k: len(v) for k, v in categories.items()},
            "severity_breakdown": {
                "errors": len([r for r in design_results if r.severity == "error"]),
                "warnings": len([r for r in design_results if r.severity == "warning"]),
                "info": len([r for r in design_results if r.severity == "info"]),
            },
            "recommendations": self._generate_design_recommendations(design_results),
        }

    def _generate_design_recommendations(
        self, results: List[ValidationResult]
    ) -> List[str]:
        """Generate design recommendations based on found issues."""
        recommendations = []

        rule_counts = {}
        for result in results:
            rule_counts[result.rule_id] = rule_counts.get(result.rule_id, 0) + 1

        if rule_counts.get("bem_violation", 0) > 5:
            recommendations.append(
                "Establish and document BEM naming convention standards"
            )

        if rule_counts.get("design_token_color", 0) > 3:
            recommendations.append("Create a comprehensive color token system")

        if rule_counts.get("accessibility_css", 0) > 0:
            recommendations.append("Review CSS for accessibility compliance")

        if rule_counts.get("high_specificity", 0) > 2:
            recommendations.append("Refactor CSS to reduce selector specificity")

        if not recommendations:
            recommendations.append("Design system is well maintained")

        return recommendations
