"""
Change Detector - Intelligent change detection system

Analyzes file changes to determine the most efficient validation strategy.
"""

import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple, Any
import sqlite3

from pydantic import BaseModel


class FileChange(BaseModel):
    """Represents a file change event."""
    file_path: str
    change_type: str  # "modified", "created", "deleted", "renamed"
    timestamp: datetime
    file_hash: str
    size_bytes: int
    validation_required: bool = True


class ValidationHistory(BaseModel):
    """Represents validation history for a file."""
    file_path: str
    file_hash: str
    last_validated: datetime
    validation_results_count: int
    last_validation_passed: bool


class ChangeDetector:
    """
    Intelligent change detector that optimizes validation by analyzing:
    - File content changes vs. metadata changes
    - Change patterns and frequency
    - Validation history and results
    - Dependencies between files
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "quality-control/change_detector.db"
        self.setup_database()
        
        # Cache for file hashes and metadata
        self._file_cache: Dict[str, Dict] = {}
        self._dependency_graph: Dict[str, Set[str]] = {}
        
        # Configuration
        self.validation_threshold_hours = 24  # Re-validate after 24 hours even if no changes
        self.change_sensitivity = 0.1  # Minimum change ratio to trigger validation
        
    def setup_database(self):
        """Setup SQLite database for change tracking."""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS file_changes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT NOT NULL,
                    change_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    validation_required BOOLEAN DEFAULT 1
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS validation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    results_count INTEGER NOT NULL,
                    validation_passed BOOLEAN NOT NULL,
                    validation_time_ms REAL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS file_dependencies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_file TEXT NOT NULL,
                    dependent_file TEXT NOT NULL,
                    dependency_type TEXT NOT NULL
                )
            """)
            
            # Create indices for better performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_file_path ON file_changes(file_path)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON file_changes(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_validation_file ON validation_history(file_path)")
    
    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash of file content."""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception:
            return ""
    
    def detect_change(self, file_path: str, change_type: str = "modified") -> Optional[FileChange]:
        """
        Detect and analyze a file change.
        
        Args:
            file_path: Path to the changed file
            change_type: Type of change (modified, created, deleted, renamed)
            
        Returns:
            FileChange object if validation is required, None otherwise
        """
        path = Path(file_path)
        
        if not path.exists() and change_type != "deleted":
            return None
        
        # Calculate file properties
        current_hash = self.calculate_file_hash(file_path) if path.exists() else ""
        file_size = path.stat().st_size if path.exists() else 0
        
        # Check if file actually changed
        if change_type == "modified":
            cached_info = self._file_cache.get(file_path, {})
            if cached_info.get("hash") == current_hash:
                return None  # No actual content change
        
        # Create change object
        change = FileChange(
            file_path=file_path,
            change_type=change_type,
            timestamp=datetime.now(),
            file_hash=current_hash,
            size_bytes=file_size,
            validation_required=True
        )
        
        # Determine if validation is actually required
        change.validation_required = self._should_validate(change)
        
        # Store change in database
        self._store_change(change)
        
        # Update file cache
        self._file_cache[file_path] = {
            "hash": current_hash,
            "size": file_size,
            "last_modified": change.timestamp
        }
        
        return change if change.validation_required else None
    
    def _should_validate(self, change: FileChange) -> bool:
        """Determine if a file change requires validation."""
        
        # Always validate new files
        if change.change_type == "created":
            return True
        
        # Skip validation for deleted files
        if change.change_type == "deleted":
            return False
        
        # Check validation history
        last_validation = self._get_last_validation(change.file_path)
        
        if last_validation:
            # Skip if recently validated with same content
            if (last_validation.file_hash == change.file_hash and
                last_validation.last_validated > datetime.now() - timedelta(hours=1)):
                return False
            
            # Force validation if too much time has passed
            if last_validation.last_validated < datetime.now() - timedelta(hours=self.validation_threshold_hours):
                return True
        
        # Check file type sensitivity
        file_ext = Path(change.file_path).suffix.lower()
        
        # Configuration files always need validation
        config_extensions = [".json", ".yaml", ".yml", ".toml", ".cfg", ".ini"]
        if file_ext in config_extensions:
            return True
        
        # Check change significance for code files
        if file_ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".css", ".scss"]:
            return self._is_significant_change(change)
        
        return True
    
    def _is_significant_change(self, change: FileChange) -> bool:
        """Determine if a change is significant enough to warrant validation."""
        
        # Get previous version info
        previous_info = self._file_cache.get(change.file_path)
        if not previous_info:
            return True  # No previous info, assume significant
        
        # Calculate change ratio
        size_diff = abs(change.size_bytes - previous_info.get("size", 0))
        size_ratio = size_diff / max(previous_info.get("size", 1), 1)
        
        # Significant if size changed by more than threshold
        if size_ratio > self.change_sensitivity:
            return True
        
        # Check specific patterns that indicate significant changes
        try:
            with open(change.file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Keywords that indicate significant changes
            significant_keywords = [
                "function", "class", "def ", "const ", "let ", "var ",
                "import", "from", "export", "@", "async", "await",
                "if ", "else", "while", "for", "try", "catch",
                "organization_id", "security", "auth", "login", "password"
            ]
            
            # Count keyword occurrences (simplified heuristic)
            keyword_count = sum(content.lower().count(keyword) for keyword in significant_keywords)
            
            # If many keywords changed, it's likely significant
            if keyword_count > 10:
                return True
                
        except Exception:
            pass  # If we can't read the file, assume it's significant
        
        return False
    
    def _get_last_validation(self, file_path: str) -> Optional[ValidationHistory]:
        """Get the last validation record for a file."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT file_path, file_hash, timestamp, results_count, validation_passed
                FROM validation_history
                WHERE file_path = ?
                ORDER BY timestamp DESC
                LIMIT 1
            """, (file_path,))
            
            row = cursor.fetchone()
            if row:
                return ValidationHistory(
                    file_path=row[0],
                    file_hash=row[1],
                    last_validated=datetime.fromisoformat(row[2]),
                    validation_results_count=row[3],
                    last_validation_passed=bool(row[4])
                )
        
        return None
    
    def _store_change(self, change: FileChange):
        """Store file change in database."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO file_changes 
                (file_path, change_type, timestamp, file_hash, size_bytes, validation_required)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                change.file_path,
                change.change_type,
                change.timestamp.isoformat(),
                change.file_hash,
                change.size_bytes,
                change.validation_required
            ))
    
    def record_validation_result(self, file_path: str, file_hash: str, 
                               results_count: int, validation_passed: bool,
                               validation_time_ms: float = 0.0):
        """Record validation results for future reference."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO validation_history
                (file_path, file_hash, timestamp, results_count, validation_passed, validation_time_ms)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                file_path,
                file_hash,
                datetime.now().isoformat(),
                results_count,
                validation_passed,
                validation_time_ms
            ))
    
    def get_change_history(self, file_path: str, days: int = 7) -> List[FileChange]:
        """Get change history for a file within specified days."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT file_path, change_type, timestamp, file_hash, size_bytes, validation_required
                FROM file_changes
                WHERE file_path = ? AND timestamp >= ?
                ORDER BY timestamp DESC
            """, (file_path, cutoff_date.isoformat()))
            
            changes = []
            for row in cursor.fetchall():
                changes.append(FileChange(
                    file_path=row[0],
                    change_type=row[1],
                    timestamp=datetime.fromisoformat(row[2]),
                    file_hash=row[3],
                    size_bytes=row[4],
                    validation_required=bool(row[5])
                ))
            
            return changes
    
    def get_frequently_changed_files(self, days: int = 7, min_changes: int = 5) -> List[Tuple[str, int]]:
        """Get files that change frequently (potential hotspots)."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT file_path, COUNT(*) as change_count
                FROM file_changes
                WHERE timestamp >= ?
                GROUP BY file_path
                HAVING change_count >= ?
                ORDER BY change_count DESC
            """, (cutoff_date.isoformat(), min_changes))
            
            return cursor.fetchall()
    
    def get_validation_patterns(self, days: int = 30) -> Dict[str, Any]:
        """Analyze validation patterns to optimize future validations."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        with sqlite3.connect(self.db_path) as conn:
            # Get validation success rates by file type
            cursor = conn.execute("""
                SELECT 
                    CASE 
                        WHEN file_path LIKE '%.py' THEN 'Python'
                        WHEN file_path LIKE '%.ts' OR file_path LIKE '%.tsx' THEN 'TypeScript'
                        WHEN file_path LIKE '%.js' OR file_path LIKE '%.jsx' THEN 'JavaScript'
                        WHEN file_path LIKE '%.css' OR file_path LIKE '%.scss' THEN 'CSS'
                        ELSE 'Other'
                    END as file_type,
                    COUNT(*) as total_validations,
                    SUM(CASE WHEN validation_passed THEN 1 ELSE 0 END) as passed_validations,
                    AVG(validation_time_ms) as avg_time_ms
                FROM validation_history
                WHERE timestamp >= ?
                GROUP BY file_type
                ORDER BY total_validations DESC
            """, (cutoff_date.isoformat(),))
            
            validation_stats = {}
            for row in cursor.fetchall():
                file_type, total, passed, avg_time = row
                validation_stats[file_type] = {
                    "total_validations": total,
                    "success_rate": passed / total if total > 0 else 0,
                    "average_time_ms": avg_time or 0
                }
            
            # Get most problematic files
            cursor = conn.execute("""
                SELECT file_path, COUNT(*) as validation_count,
                       SUM(CASE WHEN validation_passed THEN 1 ELSE 0 END) as passed_count
                FROM validation_history
                WHERE timestamp >= ?
                GROUP BY file_path
                HAVING validation_count >= 3
                ORDER BY (passed_count * 1.0 / validation_count) ASC
                LIMIT 10
            """, (cutoff_date.isoformat(),))
            
            problematic_files = [
                {
                    "file_path": row[0],
                    "validation_count": row[1],
                    "success_rate": row[2] / row[1] if row[1] > 0 else 0
                }
                for row in cursor.fetchall()
            ]
            
            return {
                "validation_stats": validation_stats,
                "problematic_files": problematic_files,
                "analysis_period_days": days
            }
    
    def optimize_validation_schedule(self) -> Dict[str, List[str]]:
        """
        Suggest optimal validation schedule based on change patterns.
        
        Returns:
            Dictionary with suggested schedules for different file categories
        """
        patterns = self.get_validation_patterns(days=30)
        frequently_changed = self.get_frequently_changed_files(days=7)
        
        schedule = {
            "real_time": [],      # Files that should be validated immediately
            "frequent": [],       # Files that should be validated every few hours
            "daily": [],          # Files that can be validated daily
            "weekly": []          # Files that can be validated weekly
        }
        
        # Categorize based on change frequency and validation success rate
        for file_path, change_count in frequently_changed:
            if change_count > 20:  # Very frequently changed
                schedule["real_time"].append(file_path)
            elif change_count > 10:
                schedule["frequent"].append(file_path)
            elif change_count > 3:
                schedule["daily"].append(file_path)
            else:
                schedule["weekly"].append(file_path)
        
        # Add problematic files to real-time monitoring
        for file_info in patterns.get("problematic_files", []):
            if file_info["success_rate"] < 0.8:  # Less than 80% success rate
                file_path = file_info["file_path"]
                if file_path not in schedule["real_time"]:
                    schedule["real_time"].append(file_path)
        
        return schedule
    
    def cleanup_old_data(self, days_to_keep: int = 90):
        """Clean up old change and validation data."""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        with sqlite3.connect(self.db_path) as conn:
            # Clean up old changes
            result1 = conn.execute("""
                DELETE FROM file_changes
                WHERE timestamp < ?
            """, (cutoff_date.isoformat(),))
            
            # Clean up old validation history
            result2 = conn.execute("""
                DELETE FROM validation_history
                WHERE timestamp < ?
            """, (cutoff_date.isoformat(),))
            
            deleted_changes = result1.rowcount
            deleted_validations = result2.rowcount
            
            return {
                "deleted_changes": deleted_changes,
                "deleted_validations": deleted_validations,
                "cutoff_date": cutoff_date.isoformat()
            }