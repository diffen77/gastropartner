"""
Quality Control Agent - Main Orchestrator

This agent coordinates all validation activities and manages the specialized sub-agents.
"""

import asyncio
import hashlib
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union, Any

import yaml
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table

# Import will be done lazily to avoid circular imports


class ValidationResult(BaseModel):
    """Result from a validation check."""
    agent_type: str
    file_path: str
    severity: str = Field(..., pattern="^(error|warning|info)$")
    message: str
    line_number: Optional[int] = None
    column: Optional[int] = None
    rule_id: Optional[str] = None
    fix_suggestion: Optional[str] = None
    code_example: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ValidationRequest(BaseModel):
    """Request for validation of one or more files."""
    files: List[str]
    validation_types: List[str] = ["security", "functional", "design", "backend"]
    context: Dict[str, Any] = Field(default_factory=dict)
    priority: str = "normal"  # normal, high, critical


class QualityControlAgent:
    """
    Main Quality Control Agent that orchestrates all validation activities.
    
    Responsibilities:
    - Route validation requests to appropriate sub-agents
    - Aggregate and prioritize results
    - Manage caching and performance optimization
    - Provide unified reporting interface
    """
    
    def __init__(self, config_path: str = None):
        self.console = Console()
        self.config_path = config_path or Path(__file__).parent.parent / "config" / "agent_config.yaml"
        self.validation_rules_path = Path(__file__).parent.parent / "config" / "validation_rules.yaml"
        
        # Load configuration
        self.config = self._load_config()
        self.validation_rules = self._load_validation_rules()
        
        # Initialize cache for validation results
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = self.config.get("cache", {}).get("ttl", 300)
        
        # Initialize sub-agents
        self.sub_agents = self._initialize_agents()
        
        # Performance tracking
        self.stats = {
            "validations_performed": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "average_validation_time": 0.0
        }
    
    def _load_config(self) -> Dict:
        """Load agent configuration from YAML file."""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.console.print(f"[red]Error loading config: {e}[/red]")
            return self._default_config()
    
    def _load_validation_rules(self) -> Dict:
        """Load validation rules from YAML file."""
        try:
            with open(self.validation_rules_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.console.print(f"[red]Error loading validation rules: {e}[/red]")
            return {}
    
    def _default_config(self) -> Dict:
        """Return default configuration if config file is unavailable."""
        return {
            "quality_control_agent": {
                "model": "gpt-4o-mini",
                "temperature": 0.1,
                "max_tokens": 1000
            },
            "cache": {
                "enabled": True,
                "ttl": 300
            },
            "concurrency": {
                "max_agents": 3
            }
        }
    
    def _initialize_agents(self) -> Dict[str, Any]:
        """Initialize all specialized sub-agents."""
        agents = {}
        
        try:
            # Lazy imports to avoid circular dependencies
            from .security_agent import SecurityAgent
            from .functional_agent import FunctionalAgent  
            from .design_agent import DesignAgent
            from .backend_agent import BackendAgent
            
            # Initialize each specialized agent
            agents["security"] = SecurityAgent(self.config.get("agents", {}).get("security_agent", {}))
            agents["functional"] = FunctionalAgent(self.config.get("agents", {}).get("functional_agent", {}))
            agents["design"] = DesignAgent(self.config.get("agents", {}).get("design_agent", {}))
            agents["backend"] = BackendAgent(self.config.get("agents", {}).get("backend_agent", {}))
            
            self.console.print("[green]✓[/green] All sub-agents initialized successfully")
            
        except Exception as e:
            self.console.print(f"[red]Error initializing agents: {e}[/red]")
            
        return agents
    
    def _get_cache_key(self, file_path: str, file_content: str = None) -> str:
        """Generate cache key based on file path and content hash."""
        if file_content is None:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
            except Exception:
                file_content = ""
        
        content_hash = hashlib.md5(file_content.encode()).hexdigest()
        return f"{file_path}:{content_hash}"
    
    def _is_cache_valid(self, cache_entry: Dict) -> bool:
        """Check if cache entry is still valid based on TTL."""
        if not self.config.get("cache", {}).get("enabled", True):
            return False
            
        timestamp = cache_entry.get("timestamp", 0)
        return (time.time() - timestamp) < self._cache_ttl
    
    def _determine_validation_types(self, file_path: str) -> List[str]:
        """Determine which validation types are needed based on file extension."""
        file_path = Path(file_path)
        extension = file_path.suffix.lower()
        
        validation_types = []
        
        # Always run security validation
        validation_types.append("security")
        
        # Frontend files
        if extension in [".tsx", ".ts", ".jsx", ".js"]:
            validation_types.extend(["functional"])
            if "component" in file_path.name.lower() or extension in [".tsx", ".jsx"]:
                validation_types.append("design")
        
        # CSS files
        elif extension in [".css", ".scss", ".sass"]:
            validation_types.append("design")
        
        # Backend files
        elif extension == ".py":
            validation_types.append("backend")
        
        # Config files get all validations
        elif file_path.name in ["package.json", "pyproject.toml"] or ".config." in file_path.name:
            validation_types.extend(["functional", "backend"])
        
        return list(set(validation_types))  # Remove duplicates
    
    async def validate_file(self, file_path: str, validation_types: List[str] = None) -> List[ValidationResult]:
        """
        Validate a single file using appropriate sub-agents.
        
        Args:
            file_path: Path to the file to validate
            validation_types: List of validation types to run (if None, auto-detect)
            
        Returns:
            List of validation results
        """
        start_time = time.time()
        
        # Auto-detect validation types if not specified
        if validation_types is None:
            validation_types = self._determine_validation_types(file_path)
        
        # Check cache first
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
        except Exception as e:
            return [ValidationResult(
                agent_type="system",
                file_path=file_path,
                severity="error",
                message=f"Could not read file: {e}"
            )]
        
        cache_key = self._get_cache_key(file_path, file_content)
        if cache_key in self._cache and self._is_cache_valid(self._cache[cache_key]):
            self.stats["cache_hits"] += 1
            return self._cache[cache_key]["results"]
        
        self.stats["cache_misses"] += 1
        
        # Run validations concurrently
        tasks = []
        for validation_type in validation_types:
            if validation_type in self.sub_agents:
                task = self._run_validation(validation_type, file_path, file_content)
                tasks.append(task)
        
        # Wait for all validations to complete
        results = []
        if tasks:
            validation_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in validation_results:
                if isinstance(result, Exception):
                    results.append(ValidationResult(
                        agent_type="system",
                        file_path=file_path,
                        severity="error", 
                        message=f"Validation error: {result}"
                    ))
                elif isinstance(result, list):
                    results.extend(result)
                elif result:
                    results.append(result)
        
        # Cache results
        self._cache[cache_key] = {
            "results": results,
            "timestamp": time.time()
        }
        
        # Update performance stats
        validation_time = time.time() - start_time
        self.stats["validations_performed"] += 1
        self.stats["average_validation_time"] = (
            (self.stats["average_validation_time"] * (self.stats["validations_performed"] - 1) + validation_time)
            / self.stats["validations_performed"]
        )
        
        return results
    
    async def _run_validation(self, validation_type: str, file_path: str, file_content: str) -> List[ValidationResult]:
        """Run a specific type of validation."""
        agent = self.sub_agents.get(validation_type)
        if not agent:
            return []
        
        # Clear terminal logging for agent execution
        print(f"🤖 AGENT STARTING: {validation_type.upper()} validation on {Path(file_path).name}")
        
        try:
            start_time = time.time()
            results = await agent.validate(file_path, file_content, self.validation_rules.get(validation_type, {}))
            duration = time.time() - start_time
            
            # Log completion with results summary
            error_count = len([r for r in results if r.severity == "error"])
            warning_count = len([r for r in results if r.severity == "warning"])
            
            if error_count > 0:
                print(f"❌ AGENT COMPLETE: {validation_type.upper()} found {error_count} errors, {warning_count} warnings ({duration:.2f}s)")
            elif warning_count > 0:
                print(f"⚠️  AGENT COMPLETE: {validation_type.upper()} found {warning_count} warnings ({duration:.2f}s)")
            else:
                print(f"✅ AGENT COMPLETE: {validation_type.upper()} validation passed ({duration:.2f}s)")
            
            return results
        except Exception as e:
            print(f"💥 AGENT FAILED: {validation_type.upper()} validation failed: {e}")
            return [ValidationResult(
                agent_type=validation_type,
                file_path=file_path,
                severity="error",
                message=f"Agent {validation_type} failed: {e}"
            )]
    
    async def validate_multiple_files(self, files: List[str], validation_types: List[str] = None) -> Dict[str, List[ValidationResult]]:
        """
        Validate multiple files concurrently.
        
        Args:
            files: List of file paths to validate
            validation_types: List of validation types to run on all files
            
        Returns:
            Dictionary mapping file paths to their validation results
        """
        semaphore = asyncio.Semaphore(self.config.get("concurrency", {}).get("max_agents", 3))
        
        async def validate_with_semaphore(file_path: str):
            async with semaphore:
                return file_path, await self.validate_file(file_path, validation_types)
        
        tasks = [validate_with_semaphore(file_path) for file_path in files]
        results = await asyncio.gather(*tasks)
        
        return dict(results)
    
    def format_results(self, results: Union[List[ValidationResult], Dict[str, List[ValidationResult]]], 
                      format_type: str = "console") -> str:
        """
        Format validation results for display.
        
        Args:
            results: Validation results to format
            format_type: Output format (console, json, markdown)
            
        Returns:
            Formatted string
        """
        if format_type == "console":
            return self._format_console_results(results)
        elif format_type == "json":
            return self._format_json_results(results)
        elif format_type == "markdown":
            return self._format_markdown_results(results)
        else:
            return str(results)
    
    def _format_console_results(self, results: Union[List[ValidationResult], Dict[str, List[ValidationResult]]]) -> str:
        """Format results for console display using Rich."""
        if isinstance(results, list):
            results = {"file": results}
        
        # Count issues by severity
        total_errors = sum(len([r for r in file_results if r.severity == "error"]) 
                          for file_results in results.values())
        total_warnings = sum(len([r for r in file_results if r.severity == "warning"]) 
                            for file_results in results.values())
        total_info = sum(len([r for r in file_results if r.severity == "info"]) 
                        for file_results in results.values())
        
        # Create summary table
        table = Table(title="Quality Control Validation Results")
        table.add_column("File", style="cyan")
        table.add_column("Errors", style="red", justify="right")
        table.add_column("Warnings", style="yellow", justify="right")
        table.add_column("Info", style="blue", justify="right")
        
        for file_path, file_results in results.items():
            errors = len([r for r in file_results if r.severity == "error"])
            warnings = len([r for r in file_results if r.severity == "warning"])
            info = len([r for r in file_results if r.severity == "info"])
            
            table.add_row(file_path, str(errors), str(warnings), str(info))
        
        # Add summary row
        table.add_row("TOTAL", str(total_errors), str(total_warnings), str(total_info), style="bold")
        
        with Console().capture() as capture:
            Console().print(table)
        
        return capture.get()
    
    def _format_json_results(self, results: Union[List[ValidationResult], Dict[str, List[ValidationResult]]]) -> str:
        """Format results as JSON."""
        import json
        
        if isinstance(results, list):
            return json.dumps([result.dict() for result in results], indent=2, default=str)
        else:
            return json.dumps({
                file_path: [result.dict() for result in file_results]
                for file_path, file_results in results.items()
            }, indent=2, default=str)
    
    def _format_markdown_results(self, results: Union[List[ValidationResult], Dict[str, List[ValidationResult]]]) -> str:
        """Format results as Markdown."""
        if isinstance(results, list):
            results = {"file": results}
        
        output = ["# Quality Control Validation Results\n"]
        
        for file_path, file_results in results.items():
            output.append(f"## {file_path}\n")
            
            if not file_results:
                output.append("✅ No issues found\n")
                continue
            
            for result in file_results:
                severity_emoji = {"error": "❌", "warning": "⚠️", "info": "ℹ️"}
                emoji = severity_emoji.get(result.severity, "•")
                
                output.append(f"{emoji} **{result.severity.upper()}**: {result.message}")
                if result.line_number:
                    output.append(f" (Line {result.line_number})")
                output.append("\n")
                
                if result.fix_suggestion:
                    output.append(f"   💡 **Fix**: {result.fix_suggestion}\n")
                
                output.append("\n")
        
        return "".join(output)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        cache_hit_rate = 0
        if self.stats["cache_hits"] + self.stats["cache_misses"] > 0:
            cache_hit_rate = self.stats["cache_hits"] / (self.stats["cache_hits"] + self.stats["cache_misses"])
        
        return {
            **self.stats,
            "cache_hit_rate": f"{cache_hit_rate:.1%}",
            "cache_size": len(self._cache),
            "active_agents": len(self.sub_agents)
        }
    
    def clear_cache(self):
        """Clear validation cache."""
        self._cache.clear()
        self.console.print("[green]✓[/green] Cache cleared")


# Helper function for easy agent instantiation
def create_quality_control_agent(config_path: str = None) -> QualityControlAgent:
    """Create and return a configured QualityControlAgent instance."""
    return QualityControlAgent(config_path)