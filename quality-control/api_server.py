#!/usr/bin/env python3
"""
Quality Control API Server - REST API for real-time validation

Provides HTTP endpoints for Claude Code integration and external tool access.
Enables real-time quality control validation with structured responses.
"""

import asyncio
import uvicorn
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import quality control components
import sys
sys.path.insert(0, str(Path(__file__).parent))

from agents.quality_control_agent import QualityControlAgent
from feedback_processor import FeedbackProcessor, create_feedback_processor
from monitoring import QualityControlMonitor


# API Models
class ValidationRequest(BaseModel):
    """Request model for file validation."""
    files: List[str] = Field(..., description="List of file paths to validate")
    validation_types: Optional[List[str]] = Field(None, description="Specific validation types to run")
    session_id: Optional[str] = Field(None, description="Session ID for tracking")
    priority: str = Field("normal", description="Priority level: normal, high, critical")


class ValidationResponse(BaseModel):
    """Response model for validation results."""
    success: bool
    message: str
    session_id: str
    files_validated: int
    total_errors: int
    total_warnings: int
    validation_time: float
    error_details: List[Dict[str, Any]]
    fix_suggestions: List[str]
    retry_recommended: bool
    claude_feedback: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: datetime
    uptime_seconds: float
    active_agents: int
    total_validations: int
    success_rate: float


class MonitoringResponse(BaseModel):
    """Monitoring data response."""
    performance_metrics: Dict[str, Any]
    recent_sessions: List[Dict[str, Any]]
    error_patterns: List[Dict[str, Any]]
    system_status: str


# API Server
class QualityControlAPIServer:
    """
    FastAPI server for quality control integration.
    
    Provides endpoints for:
    - Real-time validation requests
    - Health monitoring
    - Performance metrics
    - Error pattern analysis
    """
    
    def __init__(self):
        self.app = FastAPI(
            title="Quality Control API",
            description="Real-time code quality validation for Claude Code integration",
            version="1.0.0",
            docs_url="/docs",
            redoc_url="/redoc"
        )
        
        # Initialize components
        self.quality_agent = None
        self.feedback_processor = None
        self.monitor = None
        
        # Server state
        self.start_time = time.time()
        self.validation_count = 0
        self.success_count = 0
        
        # Setup CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure appropriately for production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Setup routes
        self._setup_routes()
    
    async def initialize_components(self):
        """Initialize quality control components."""
        print("🚀 Initializing Quality Control API Server...")
        
        try:
            # Initialize quality agent
            print("   Loading PydanticAI agents...")
            self.quality_agent = QualityControlAgent()
            
            # Initialize feedback processor
            print("   Setting up feedback processing...")
            self.feedback_processor = create_feedback_processor()
            
            # Initialize monitoring
            print("   Starting monitoring system...")
            self.monitor = QualityControlMonitor()
            
            print("✅ Quality Control API Server ready!")
            
        except Exception as e:
            print(f"❌ Failed to initialize API server: {e}")
            raise
    
    def _setup_routes(self):
        """Setup API routes."""
        
        @self.app.on_event("startup")
        async def startup_event():
            await self.initialize_components()
        
        @self.app.get("/health", response_model=HealthResponse)
        async def health_check():
            """Health check endpoint."""
            uptime = time.time() - self.start_time
            success_rate = (self.success_count / max(self.validation_count, 1)) * 100
            
            return HealthResponse(
                status="healthy",
                timestamp=datetime.now(),
                uptime_seconds=uptime,
                active_agents=len(self.quality_agent.sub_agents) if self.quality_agent else 0,
                total_validations=self.validation_count,
                success_rate=success_rate
            )
        
        @self.app.post("/validate", response_model=ValidationResponse)
        async def validate_files(
            request: ValidationRequest,
            background_tasks: BackgroundTasks
        ):
            """
            Validate files and return structured feedback.
            
            This is the main endpoint used by Claude Code integration.
            """
            if not self.quality_agent or not self.feedback_processor:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Quality control system not initialized"
                )
            
            start_time = time.time()
            session_id = request.session_id or f"api_session_{int(start_time)}"
            
            try:
                # Start monitoring session
                if self.monitor:
                    self.monitor.start_validation_session(request.files)
                
                # Validate files
                validation_results = await self.quality_agent.validate_multiple_files(
                    request.files, 
                    request.validation_types
                )
                
                validation_time = time.time() - start_time
                
                # Process results through feedback processor
                feedback = self.feedback_processor.process_validation_results(
                    validation_results, validation_time
                )
                
                # Update monitoring
                if self.monitor:
                    self.monitor.record_validation_result(
                        session_id, 
                        feedback.success, 
                        feedback.total_errors, 
                        feedback.total_warnings,
                        validation_time,
                        {"request": request.dict(), "results": validation_results}
                    )
                
                # Update server stats
                self.validation_count += 1
                if feedback.success:
                    self.success_count += 1
                
                # Generate Claude-friendly feedback
                claude_feedback = self.feedback_processor.format_for_claude(feedback)
                
                # Record Claude interaction
                if self.monitor:
                    background_tasks.add_task(
                        self.monitor.record_claude_interaction,
                        session_id,
                        "validation_request",
                        True,  # feedback_provided
                        feedback.total_errors,
                        0,  # errors_after (will be updated later)
                        {"api_request": True, "priority": request.priority}
                    )
                
                return ValidationResponse(
                    success=feedback.success,
                    message=feedback.message,
                    session_id=session_id,
                    files_validated=feedback.files_validated,
                    total_errors=feedback.total_errors,
                    total_warnings=feedback.total_warnings,
                    validation_time=feedback.validation_time,
                    error_details=feedback.error_details,
                    fix_suggestions=feedback.fix_suggestions,
                    retry_recommended=feedback.retry_recommended,
                    claude_feedback=claude_feedback
                )
                
            except Exception as e:
                # Record error in monitoring
                if self.monitor:
                    self.monitor.record_validation_result(
                        session_id, False, 1, 0, time.time() - start_time,
                        {"error": str(e), "request": request.dict()}
                    )
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Validation failed: {str(e)}"
                )
        
        @self.app.get("/monitoring", response_model=MonitoringResponse)
        async def get_monitoring_data():
            """Get monitoring and performance data."""
            if not self.monitor:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Monitoring system not available"
                )
            
            try:
                # Get performance metrics
                performance_metrics = {
                    "total_validations": self.validation_count,
                    "successful_validations": self.success_count,
                    "success_rate": (self.success_count / max(self.validation_count, 1)) * 100,
                    "uptime_seconds": time.time() - self.start_time,
                    "average_response_time": 0.0  # Would calculate from monitoring data
                }
                
                # Get recent sessions
                recent_sessions_data = self.monitor.get_recent_sessions(10)
                recent_sessions = [
                    {
                        "session_id": session.session_id,
                        "start_time": session.start_time.isoformat(),
                        "success": session.success,
                        "files_validated": session.files_validated,
                        "total_errors": session.total_errors,
                        "validation_time": session.validation_time
                    }
                    for session in recent_sessions_data
                ]
                
                # Get error patterns
                error_patterns_data = self.monitor.get_error_patterns(7)
                error_patterns = [
                    {
                        "pattern_type": pattern.pattern_type,
                        "error_message": pattern.error_message[:100] + "..." if len(pattern.error_message) > 100 else pattern.error_message,
                        "frequency": pattern.frequency,
                        "affected_files_count": len(pattern.affected_files),
                        "fix_success_rate": pattern.fix_success_rate,
                        "last_seen": pattern.last_seen.isoformat()
                    }
                    for pattern in error_patterns_data
                ]
                
                # Determine system status
                system_status = "healthy"
                if self.validation_count > 0:
                    success_rate = (self.success_count / self.validation_count) * 100
                    if success_rate < 70:
                        system_status = "degraded"
                    elif success_rate < 50:
                        system_status = "critical"
                
                return MonitoringResponse(
                    performance_metrics=performance_metrics,
                    recent_sessions=recent_sessions,
                    error_patterns=error_patterns,
                    system_status=system_status
                )
                
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to get monitoring data: {str(e)}"
                )
        
        @self.app.post("/feedback")
        async def record_feedback(
            session_id: str,
            errors_before: int,
            errors_after: int,
            success: bool,
            details: Optional[Dict[str, Any]] = None
        ):
            """
            Record feedback from Claude about error correction.
            
            This endpoint is called after Claude attempts to fix errors.
            """
            if not self.monitor:
                return {"status": "monitoring not available"}
            
            try:
                self.monitor.record_claude_interaction(
                    session_id,
                    "error_correction",
                    True,
                    errors_before,
                    errors_after,
                    details or {}
                )
                
                return {
                    "status": "feedback recorded",
                    "session_id": session_id,
                    "improvement": errors_before - errors_after
                }
                
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to record feedback: {str(e)}"
                )
        
        @self.app.get("/")
        async def root():
            """Root endpoint with API information."""
            return {
                "name": "Quality Control API",
                "version": "1.0.0",
                "status": "active",
                "description": "Real-time code quality validation for Claude Code integration",
                "endpoints": {
                    "validate": "POST /validate - Validate files and get feedback",
                    "health": "GET /health - Health check",
                    "monitoring": "GET /monitoring - Performance metrics",
                    "feedback": "POST /feedback - Record Claude feedback",
                    "docs": "GET /docs - API documentation"
                }
            }


# Server instance
api_server = QualityControlAPIServer()


def run_server(host: str = "127.0.0.1", port: int = 8765, reload: bool = False):
    """Run the API server."""
    print(f"🚀 Starting Quality Control API Server on {host}:{port}")
    
    uvicorn.run(
        "api_server:api_server.app",
        host=host,
        port=port,
        reload=reload,
        access_log=False,  # Reduce noise in logs
        log_level="info"
    )


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Quality Control API Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    
    args = parser.parse_args()
    
    run_server(host=args.host, port=args.port, reload=args.reload)