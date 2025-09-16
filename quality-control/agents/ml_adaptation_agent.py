"""
ML Adaptation Agent - Machine Learning Data Collection and Pattern Recognition

This agent collects validation results and patterns to continuously improve
the quality control system through machine learning insights.
"""

import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field


class ValidationResult(BaseModel):
    """Result from ML validation tracking."""

    file_path: str
    rule_name: str
    pattern_type: str
    success: bool
    confidence: float = Field(ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.now)
    error_type: Optional[str] = None
    fix_applied: bool = False
    context: Dict[str, Any] = Field(default_factory=dict)


class PatternInsight(BaseModel):
    """Machine learning insight about code patterns."""

    pattern_type: str
    success_rate: float
    common_errors: List[str]
    recommendations: List[str]
    confidence: float
    sample_count: int


class MLAdaptationAgent:
    """
    Machine Learning agent that collects validation data and provides insights
    for continuous quality improvement.

    Responsibilities:
    - Record validation results for pattern analysis
    - Identify common error patterns
    - Provide success rate statistics
    - Generate improvement recommendations
    - Store learning data persistently
    """

    def __init__(self, db_path: str = None):
        """Initialize the ML adaptation agent."""
        self.db_path = db_path or Path(__file__).parent.parent / "validation_history.db"
        self._init_database()

        # Pattern tracking
        self._pattern_cache: Dict[str, PatternInsight] = {}
        self._cache_expiry = 300  # 5 minutes
        self._last_cache_update = 0

    def _init_database(self):
        """Initialize the SQLite database for storing validation results."""
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS validation_results (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        file_path TEXT NOT NULL,
                        rule_name TEXT NOT NULL,
                        pattern_type TEXT NOT NULL,
                        success INTEGER NOT NULL,
                        confidence REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        error_type TEXT,
                        fix_applied INTEGER NOT NULL DEFAULT 0,
                        context TEXT
                    )
                """)

                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_pattern_type 
                    ON validation_results(pattern_type)
                """)

                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_timestamp 
                    ON validation_results(timestamp)
                """)

                conn.commit()

        except Exception as e:
            print(f"⚠️ ML DATABASE INIT FAILED: {e}")
            # Continue without database - not critical for core functionality

    def record_validation_result(self, result: ValidationResult):
        """Record a validation result for ML analysis."""
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.execute(
                    """
                    INSERT INTO validation_results 
                    (file_path, rule_name, pattern_type, success, confidence, 
                     timestamp, error_type, fix_applied, context)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        result.file_path,
                        result.rule_name,
                        result.pattern_type,
                        int(result.success),
                        result.confidence,
                        result.timestamp.isoformat(),
                        result.error_type,
                        int(result.fix_applied),
                        str(result.context) if result.context else None,
                    ),
                )
                conn.commit()

        except Exception as e:
            print(f"⚠️ ML DATA RECORDING FAILED: {e}")
            # Continue without recording - not critical for core functionality

    def get_pattern_insights(
        self, pattern_type: str = None, days: int = 30
    ) -> List[PatternInsight]:
        """Get ML insights about code patterns and their success rates."""
        try:
            # Check cache first
            cache_key = f"{pattern_type}_{days}"
            if (
                cache_key in self._pattern_cache
                and time.time() - self._last_cache_update < self._cache_expiry
            ):
                return [self._pattern_cache[cache_key]]

            with sqlite3.connect(str(self.db_path)) as conn:
                # Base query
                where_clause = "WHERE timestamp >= datetime('now', '-{} days')".format(
                    days
                )
                if pattern_type:
                    where_clause += " AND pattern_type = ?"
                    params = (pattern_type,)
                else:
                    params = ()

                # Get pattern statistics
                query = f"""
                    SELECT 
                        pattern_type,
                        AVG(CAST(success AS REAL)) as success_rate,
                        COUNT(*) as sample_count,
                        AVG(confidence) as avg_confidence
                    FROM validation_results 
                    {where_clause}
                    GROUP BY pattern_type
                    HAVING sample_count >= 5
                    ORDER BY success_rate DESC
                """

                patterns = conn.execute(query, params).fetchall()
                insights = []

                for pattern, success_rate, sample_count, avg_confidence in patterns:
                    # Get common errors for this pattern
                    error_query = f"""
                        SELECT error_type, COUNT(*) as count
                        FROM validation_results 
                        WHERE pattern_type = ? AND success = 0 AND error_type IS NOT NULL
                        AND timestamp >= datetime('now', '-{days} days')
                        GROUP BY error_type
                        ORDER BY count DESC
                        LIMIT 5
                    """

                    errors = conn.execute(error_query, (pattern,)).fetchall()
                    common_errors = [error for error, count in errors]

                    # Generate recommendations based on success rate
                    recommendations = self._generate_recommendations(
                        pattern, success_rate, common_errors
                    )

                    insight = PatternInsight(
                        pattern_type=pattern,
                        success_rate=success_rate,
                        common_errors=common_errors,
                        recommendations=recommendations,
                        confidence=avg_confidence,
                        sample_count=sample_count,
                    )

                    insights.append(insight)
                    self._pattern_cache[cache_key] = insight

                self._last_cache_update = time.time()
                return insights

        except Exception as e:
            print(f"⚠️ ML PATTERN ANALYSIS FAILED: {e}")
            return []

    def _generate_recommendations(
        self, pattern_type: str, success_rate: float, common_errors: List[str]
    ) -> List[str]:
        """Generate improvement recommendations based on pattern analysis."""
        recommendations = []

        # Success rate based recommendations
        if success_rate < 0.5:
            recommendations.append(
                f"Pattern {pattern_type} has low success rate ({success_rate:.1%}). Consider reviewing validation rules."
            )
        elif success_rate < 0.8:
            recommendations.append(
                f"Pattern {pattern_type} needs improvement ({success_rate:.1%} success rate)."
            )
        else:
            recommendations.append(
                f"Pattern {pattern_type} is performing well ({success_rate:.1%} success rate)."
            )

        # Error-specific recommendations
        for error in common_errors[:3]:  # Top 3 errors
            if "security" in error.lower():
                recommendations.append(
                    "Consider implementing stricter security validation rules."
                )
            elif "organization_id" in error.lower():
                recommendations.append("Focus on multi-tenant data isolation patterns.")
            elif "typescript" in error.lower() or "lint" in error.lower():
                recommendations.append("Enhance TypeScript and linting rule coverage.")
            elif "test" in error.lower():
                recommendations.append("Improve test coverage and testing patterns.")

        return recommendations[:5]  # Limit to 5 recommendations

    def get_success_rate_by_file_type(self, days: int = 7) -> Dict[str, float]:
        """Get success rates grouped by file type."""
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                query = """
                    SELECT 
                        CASE 
                            WHEN file_path LIKE '%.tsx' THEN 'tsx'
                            WHEN file_path LIKE '%.ts' THEN 'ts' 
                            WHEN file_path LIKE '%.py' THEN 'py'
                            WHEN file_path LIKE '%.js' THEN 'js'
                            WHEN file_path LIKE '%.jsx' THEN 'jsx'
                            ELSE 'other'
                        END as file_type,
                        AVG(CAST(success AS REAL)) as success_rate,
                        COUNT(*) as count
                    FROM validation_results 
                    WHERE timestamp >= datetime('now', '-{} days')
                    GROUP BY file_type
                    HAVING count >= 3
                    ORDER BY success_rate DESC
                """.format(days)

                results = conn.execute(query).fetchall()
                return {
                    file_type: success_rate
                    for file_type, success_rate, count in results
                }

        except Exception as e:
            print(f"⚠️ ML FILE TYPE ANALYSIS FAILED: {e}")
            return {}

    def get_improvement_trends(
        self, pattern_type: str = None, days: int = 30
    ) -> Dict[str, Any]:
        """Analyze improvement trends over time."""
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                where_clause = "WHERE timestamp >= datetime('now', '-{} days')".format(
                    days
                )
                params = ()

                if pattern_type:
                    where_clause += " AND pattern_type = ?"
                    params = (pattern_type,)

                query = f"""
                    SELECT 
                        DATE(timestamp) as date,
                        AVG(CAST(success AS REAL)) as daily_success_rate,
                        COUNT(*) as daily_validations
                    FROM validation_results 
                    {where_clause}
                    GROUP BY DATE(timestamp)
                    ORDER BY date DESC
                    LIMIT 14
                """

                results = conn.execute(query, params).fetchall()

                if len(results) < 2:
                    return {"trend": "insufficient_data", "change": 0}

                # Calculate trend (compare first week to second week)
                recent_avg = sum(rate for date, rate, count in results[:7]) / min(
                    7, len(results)
                )
                older_avg = sum(rate for date, rate, count in results[7:14]) / max(
                    1, len(results) - 7
                )

                change = recent_avg - older_avg
                trend = (
                    "improving"
                    if change > 0.05
                    else "declining"
                    if change < -0.05
                    else "stable"
                )

                return {
                    "trend": trend,
                    "change": change,
                    "recent_success_rate": recent_avg,
                    "previous_success_rate": older_avg,
                    "data_points": len(results),
                }

        except Exception as e:
            print(f"⚠️ ML TREND ANALYSIS FAILED: {e}")
            return {"trend": "error", "change": 0}

    def cleanup_old_data(self, days: int = 90):
        """Clean up validation results older than specified days."""
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                cursor = conn.execute(
                    """
                    DELETE FROM validation_results 
                    WHERE timestamp < datetime('now', '-{} days')
                """.format(days)
                )

                deleted_count = cursor.rowcount
                conn.commit()

                print(f"🧹 ML CLEANUP: Removed {deleted_count} old validation results")

        except Exception as e:
            print(f"⚠️ ML CLEANUP FAILED: {e}")

    def get_database_stats(self) -> Dict[str, Any]:
        """Get statistics about the ML database."""
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                # Total records
                total_records = conn.execute(
                    "SELECT COUNT(*) FROM validation_results"
                ).fetchone()[0]

                # Records by success
                success_records = conn.execute(
                    "SELECT COUNT(*) FROM validation_results WHERE success = 1"
                ).fetchone()[0]

                # Recent records (last 7 days)
                recent_records = conn.execute("""
                    SELECT COUNT(*) FROM validation_results 
                    WHERE timestamp >= datetime('now', '-7 days')
                """).fetchone()[0]

                # Most common patterns
                top_patterns = conn.execute("""
                    SELECT pattern_type, COUNT(*) as count 
                    FROM validation_results 
                    GROUP BY pattern_type 
                    ORDER BY count DESC 
                    LIMIT 5
                """).fetchall()

                return {
                    "total_records": total_records,
                    "success_records": success_records,
                    "success_rate": success_records / max(1, total_records),
                    "recent_records": recent_records,
                    "top_patterns": dict(top_patterns),
                    "database_path": str(self.db_path),
                }

        except Exception as e:
            print(f"⚠️ ML STATS FAILED: {e}")
            return {"error": str(e)}


# Helper functions for easy usage
def create_ml_agent(db_path: str = None) -> MLAdaptationAgent:
    """Create and return a configured MLAdaptationAgent instance."""
    return MLAdaptationAgent(db_path)


def record_validation_success(
    file_path: str,
    rule_name: str,
    pattern_type: str,
    confidence: float = 0.9,
    ml_agent: MLAdaptationAgent = None,
):
    """Quick helper to record a successful validation."""
    if ml_agent is None:
        ml_agent = create_ml_agent()

    result = ValidationResult(
        file_path=file_path,
        rule_name=rule_name,
        pattern_type=pattern_type,
        success=True,
        confidence=confidence,
    )

    ml_agent.record_validation_result(result)


def record_validation_failure(
    file_path: str,
    rule_name: str,
    pattern_type: str,
    error_type: str,
    confidence: float = 0.8,
    ml_agent: MLAdaptationAgent = None,
):
    """Quick helper to record a failed validation."""
    if ml_agent is None:
        ml_agent = create_ml_agent()

    result = ValidationResult(
        file_path=file_path,
        rule_name=rule_name,
        pattern_type=pattern_type,
        success=False,
        confidence=confidence,
        error_type=error_type,
    )

    ml_agent.record_validation_result(result)
