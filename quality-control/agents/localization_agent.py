"""
Localization Agent - Internationalization and Translation Quality Specialist

This agent focuses on ensuring proper localization, particularly:
- Swedish translation quality and accuracy
- Consistent terminology across the application
- Proper use of localization hooks and context
- Cultural appropriateness of content
- Missing translations detection
"""

import re
import json
from typing import List, Dict, Any
from pathlib import Path

from pydantic import BaseModel

from .quality_control_agent import ValidationResult


class LocalizationPattern(BaseModel):
    """Localization pattern to check for."""

    pattern: str
    severity: str
    message: str
    fix_suggestion: str = ""


class LocalizationAgent:
    """
    Specialized agent for localization and internationalization validation.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # Common localization issues to detect
        self.localization_patterns = [
            LocalizationPattern(
                pattern=r"['\"](Fel|Error|Kunde inte|Failed to|Could not)['\"]\s*(?![,\)])(?!\s*\+)",
                severity="warning",
                message="Hard-coded error message detected",
                fix_suggestion="Use translation function: t('errorMessage') or translateError()",
            ),
            LocalizationPattern(
                pattern=r"console\.log\(['\"].*[åäöÅÄÖ].*['\"]",
                severity="info",
                message="Swedish text in console.log detected",
                fix_suggestion="Consider using English for debug messages",
            ),
            LocalizationPattern(
                pattern=r"alert\(['\"].*[åäöÅÄÖ].*['\"]",
                severity="warning",
                message="Hard-coded Swedish text in alert",
                fix_suggestion="Use translation function: alert(t('alertMessage'))",
            ),
            LocalizationPattern(
                pattern=r"placeholder=['\"].*[åäöÅÄÖ].*['\"]",
                severity="warning",
                message="Hard-coded Swedish placeholder text",
                fix_suggestion="Use translation: placeholder={t('placeholderText')}",
            ),
            LocalizationPattern(
                pattern=r"title=['\"].*[åäöÅÄÖ].*['\"]",
                severity="warning",
                message="Hard-coded Swedish title text",
                fix_suggestion="Use translation: title={t('titleText')}",
            ),
        ]

        # Swedish translation quality patterns
        self.translation_quality_patterns = [
            LocalizationPattern(
                pattern=r"'Ett fel uppstod'",
                severity="info",
                message="Generic error message detected",
                fix_suggestion="Consider more specific error messages for better user experience",
            ),
            LocalizationPattern(
                pattern=r"'Laddar\.\.\.'",
                severity="info",
                message="Loading text pattern found",
                fix_suggestion="Ensure consistent loading text across the application",
            ),
            LocalizationPattern(
                pattern=r"useTranslation\(\)\s*;\s*const\s+\{\s*t\s*\}",
                severity="info",
                message="Translation hook usage detected - good practice",
                fix_suggestion="",
            ),
        ]

        # Swedish terminology consistency
        self.terminology_patterns = {
            "organization": [
                "organisation",
                "företag",
                "bolag",
            ],  # Should be consistent
            "ingredient": ["ingrediens", "råvara"],
            "recipe": ["recept", "maträtt"],
            "menu": ["meny", "matsedel"],
            "cost": ["kostnad", "pris", "utgift"],
            "margin": ["marginal", "vinstmarginal"],
            "dashboard": ["instrumentpanel", "översikt", "kontrollpanel"],
        }

    async def validate(
        self, file_path: str, file_content: str, rules: Dict[str, Any] = None
    ) -> List[ValidationResult]:
        """
        Validate a file for localization issues.

        Args:
            file_path: Path to the file being validated
            file_content: Content of the file
            rules: Additional validation rules

        Returns:
            List of validation results
        """
        results = []
        file_extension = Path(file_path).suffix.lower()

        # Only validate relevant files
        if file_extension not in [".tsx", ".ts", ".jsx", ".js", ".json"]:
            return results

        # Check for localization patterns
        for pattern in self.localization_patterns:
            matches = re.finditer(
                pattern.pattern, file_content, re.MULTILINE | re.IGNORECASE
            )
            for match in matches:
                line_number = file_content[: match.start()].count("\n") + 1

                # Skip if this is in a comment or string that's already translated
                if self._is_in_comment_or_translated_context(
                    file_content, match.start()
                ):
                    continue

                results.append(
                    ValidationResult(
                        agent_type="localization",
                        file_path=file_path,
                        severity=pattern.severity,
                        message=pattern.message,
                        line_number=line_number,
                        rule_id=f"loc_{pattern.pattern[:20]}",
                        fix_suggestion=pattern.fix_suggestion,
                        code_example=match.group(0),
                    )
                )

        # Check translation quality patterns
        for pattern in self.translation_quality_patterns:
            matches = re.finditer(
                pattern.pattern, file_content, re.MULTILINE | re.IGNORECASE
            )
            for match in matches:
                line_number = file_content[: match.start()].count("\n") + 1

                results.append(
                    ValidationResult(
                        agent_type="localization",
                        file_path=file_path,
                        severity=pattern.severity,
                        message=pattern.message,
                        line_number=line_number,
                        rule_id=f"loc_quality_{pattern.pattern[:20]}",
                        fix_suggestion=pattern.fix_suggestion,
                        code_example=match.group(0),
                    )
                )

        # Check for terminology consistency
        results.extend(self._check_terminology_consistency(file_path, file_content))

        # Check for missing translation hooks in React components
        if file_extension in [".tsx", ".jsx"]:
            results.extend(self._check_translation_hooks(file_path, file_content))

        # Check for translation file completeness
        if "localization" in file_path.lower() or "i18n" in file_path.lower():
            results.extend(
                self._check_translation_completeness(file_path, file_content)
            )

        return results

    def _is_in_comment_or_translated_context(self, content: str, position: int) -> bool:
        """Check if the position is within a comment or already translated context."""
        # Get the line containing this position
        line_start = content.rfind("\n", 0, position) + 1
        line_end = content.find("\n", position)
        if line_end == -1:
            line_end = len(content)
        line = content[line_start:line_end]

        # Check if it's in a comment
        if "//" in line and position > line_start + line.find("//"):
            return True

        # Check if it's already in a translation context
        if "t(" in line or "translateError(" in line:
            return True

        # Check if it's in a multiline comment
        before_pos = content[:position]
        last_comment_start = before_pos.rfind("/*")
        last_comment_end = before_pos.rfind("*/")

        if last_comment_start > last_comment_end:
            return True

        return False

    def _check_terminology_consistency(
        self, file_path: str, file_content: str
    ) -> List[ValidationResult]:
        """Check for consistent terminology usage."""
        results = []

        for preferred_term, alternatives in self.terminology_patterns.items():
            for alternative in alternatives:
                # Look for the alternative term in Swedish strings
                pattern = rf"['\"].*\b{re.escape(alternative)}\b.*['\"]"
                matches = re.finditer(pattern, file_content, re.IGNORECASE)

                for match in matches:
                    # Skip if it's in a comment
                    if self._is_in_comment_or_translated_context(
                        file_content, match.start()
                    ):
                        continue

                    line_number = file_content[: match.start()].count("\n") + 1

                    results.append(
                        ValidationResult(
                            agent_type="localization",
                            file_path=file_path,
                            severity="info",
                            message=f"Consider using consistent terminology: '{preferred_term}' instead of '{alternative}'",
                            line_number=line_number,
                            rule_id="loc_terminology",
                            fix_suggestion=f"Use '{preferred_term}' for consistency across the application",
                            code_example=match.group(0),
                        )
                    )

        return results

    def _check_translation_hooks(
        self, file_path: str, file_content: str
    ) -> List[ValidationResult]:
        """Check for proper use of translation hooks in React components."""
        results = []

        # Check if component has Swedish text but no useTranslation hook
        has_swedish_text = bool(re.search(r"['\"].*[åäöÅÄÖ].*['\"]", file_content))
        has_translation_hook = bool(re.search(r"useTranslation", file_content))

        if has_swedish_text and not has_translation_hook:
            results.append(
                ValidationResult(
                    agent_type="localization",
                    file_path=file_path,
                    severity="warning",
                    message="Component contains Swedish text but doesn't use useTranslation hook",
                    line_number=1,
                    rule_id="loc_missing_hook",
                    fix_suggestion="Add: const { t } = useTranslation(); at the top of your component",
                    code_example="const { t } = useTranslation();",
                )
            )

        # Check for proper destructuring of translation functions
        if has_translation_hook:
            # Check if translateError is needed but not destructured
            has_error_handling = bool(
                re.search(r"catch.*error|Error.*message", file_content, re.IGNORECASE)
            )
            has_translate_error = bool(re.search(r"translateError", file_content))

            if has_error_handling and not has_translate_error:
                results.append(
                    ValidationResult(
                        agent_type="localization",
                        file_path=file_path,
                        severity="info",
                        message="Component handles errors but doesn't use translateError",
                        line_number=1,
                        rule_id="loc_missing_error_translation",
                        fix_suggestion="Add: const { t, translateError } = useTranslation();",
                        code_example="const { t, translateError } = useTranslation();",
                    )
                )

        return results

    def _check_translation_completeness(
        self, file_path: str, file_content: str
    ) -> List[ValidationResult]:
        """Check translation files for completeness and quality."""
        results = []

        try:
            # Handle both JSON and TypeScript translation files
            if file_path.endswith(".json"):
                translations = json.loads(file_content)
            else:
                # Extract translations from TypeScript files
                # This is a simplified extraction - could be enhanced
                return results  # Skip TS files for now

            # Check for missing translations (empty strings, TODO markers)
            def check_translations_recursive(obj, path=""):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        current_path = f"{path}.{key}" if path else key
                        if isinstance(value, dict):
                            check_translations_recursive(value, current_path)
                        elif isinstance(value, str):
                            if not value.strip():
                                results.append(
                                    ValidationResult(
                                        agent_type="localization",
                                        file_path=file_path,
                                        severity="warning",
                                        message=f"Empty translation for key: {current_path}",
                                        line_number=1,
                                        rule_id="loc_empty_translation",
                                        fix_suggestion=f"Provide Swedish translation for '{current_path}'",
                                    )
                                )
                            elif "TODO" in value.upper():
                                results.append(
                                    ValidationResult(
                                        agent_type="localization",
                                        file_path=file_path,
                                        severity="info",
                                        message=f"TODO marker in translation: {current_path}",
                                        line_number=1,
                                        rule_id="loc_todo_translation",
                                        fix_suggestion=f"Complete translation for '{current_path}'",
                                    )
                                )

            check_translations_recursive(translations)

        except json.JSONDecodeError as e:
            results.append(
                ValidationResult(
                    agent_type="localization",
                    file_path=file_path,
                    severity="error",
                    message=f"Invalid JSON in translation file: {e}",
                    line_number=1,
                    rule_id="loc_invalid_json",
                    fix_suggestion="Fix JSON syntax errors in translation file",
                )
            )
        except Exception:
            # Don't fail validation if translation parsing fails
            pass

        return results


# Helper function for easy agent instantiation
def create_localization_agent(config: Dict[str, Any] = None) -> LocalizationAgent:
    """Create and return a configured LocalizationAgent instance."""
    return LocalizationAgent(config)
