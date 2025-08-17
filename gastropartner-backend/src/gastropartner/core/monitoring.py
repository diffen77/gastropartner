"""Core monitoring functionality for system health checks and metrics."""

import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

from gastropartner.core.database import get_supabase_client
from gastropartner.config import get_settings

settings = get_settings()


class HealthStatus(BaseModel):
    """Health check status model."""
    
    service: str
    status: str = Field(..., description="healthy, degraded, or unhealthy")
    response_time_ms: Optional[float] = None
    last_check: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class SystemHealth(BaseModel):
    """Overall system health model."""
    
    status: str = Field(..., description="Overall system status")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: str = "0.1.0"
    environment: str = settings.environment
    uptime_seconds: Optional[float] = None
    services: List[HealthStatus] = []


class MonitoringService:
    """Service for monitoring system health and performance."""
    
    def __init__(self):
        self.start_time = time.time()
        self._cache: Dict[str, HealthStatus] = {}
        self._cache_ttl = 30  # Cache results for 30 seconds
    
    async def check_database_health(self) -> HealthStatus:
        """Check Supabase database connectivity and performance."""
        start_time = time.time()
        
        try:
            client = get_supabase_client()
            
            # Simple health check query
            response = client.table('organizations').select('count', count='exact').limit(1).execute()
            
            response_time = (time.time() - start_time) * 1000
            
            # Check if we got a valid response
            if hasattr(response, 'count') or hasattr(response, 'data'):
                return HealthStatus(
                    service="database",
                    status="healthy" if response_time < 500 else "degraded",
                    response_time_ms=response_time,
                    details={
                        "connection_pool": "active",
                        "query_performance": "normal" if response_time < 200 else "slow"
                    }
                )
            else:
                return HealthStatus(
                    service="database",
                    status="unhealthy",
                    response_time_ms=response_time,
                    error="Invalid response from database"
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthStatus(
                service="database",
                status="unhealthy",
                response_time_ms=response_time,
                error=str(e)
            )
    
    async def check_api_health(self) -> HealthStatus:
        """Check internal API health and response times."""
        start_time = time.time()
        
        try:
            # Check if we can import and access core modules
            from gastropartner.core.auth import AuthService
            from gastropartner.core.models import Organization
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthStatus(
                service="api",
                status="healthy",
                response_time_ms=response_time,
                details={
                    "modules_loaded": True,
                    "auth_service": "available",
                    "models": "loaded"
                }
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthStatus(
                service="api",
                status="unhealthy",
                response_time_ms=response_time,
                error=f"Module loading error: {str(e)}"
            )
    
    async def check_external_dependencies(self) -> List[HealthStatus]:
        """Check external service dependencies."""
        dependencies = []
        
        # Check Supabase API health
        try:
            start_time = time.time()
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Check if Supabase is responding
                response = await client.get(f"{settings.supabase_url}/rest/v1/", 
                                          headers={"apikey": settings.supabase_anon_key})
                response_time = (time.time() - start_time) * 1000
                
                dependencies.append(HealthStatus(
                    service="supabase_api",
                    status="healthy" if response.status_code < 500 else "degraded",
                    response_time_ms=response_time,
                    details={"status_code": response.status_code}
                ))
                
        except Exception as e:
            dependencies.append(HealthStatus(
                service="supabase_api",
                status="unhealthy",
                error=str(e)
            ))
        
        return dependencies
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get basic system metrics."""
        import psutil
        import os
        
        try:
            # Get process info
            process = psutil.Process(os.getpid())
            
            return {
                "memory": {
                    "used_mb": round(process.memory_info().rss / 1024 / 1024, 2),
                    "percent": round(process.memory_percent(), 2)
                },
                "cpu": {
                    "percent": round(process.cpu_percent(), 2)
                },
                "uptime_seconds": round(time.time() - self.start_time, 2),
                "process_id": os.getpid(),
                "threads": process.num_threads()
            }
        except Exception as e:
            return {"error": f"Could not get system metrics: {str(e)}"}
    
    async def get_basic_health(self) -> SystemHealth:
        """Get basic health check (fast, no external calls)."""
        uptime = time.time() - self.start_time
        
        return SystemHealth(
            status="healthy",
            uptime_seconds=uptime,
            services=[
                HealthStatus(
                    service="api",
                    status="healthy",
                    details={"uptime_seconds": uptime}
                )
            ]
        )
    
    async def get_detailed_health(self) -> SystemHealth:
        """Get comprehensive health check including external dependencies."""
        # Run all health checks concurrently
        tasks = [
            self.check_database_health(),
            self.check_api_health(),
            self.check_external_dependencies()
        ]
        
        try:
            # Wait for all checks with timeout
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=15.0
            )
            
            database_health = results[0] if not isinstance(results[0], Exception) else HealthStatus(
                service="database", status="unhealthy", error=str(results[0])
            )
            
            api_health = results[1] if not isinstance(results[1], Exception) else HealthStatus(
                service="api", status="unhealthy", error=str(results[1])
            )
            
            external_deps = results[2] if not isinstance(results[2], Exception) else []
            
            all_services = [database_health, api_health] + external_deps
            
            # Determine overall status
            unhealthy_count = sum(1 for s in all_services if s.status == "unhealthy")
            degraded_count = sum(1 for s in all_services if s.status == "degraded")
            
            if unhealthy_count > 0:
                overall_status = "unhealthy"
            elif degraded_count > 0:
                overall_status = "degraded"
            else:
                overall_status = "healthy"
            
            return SystemHealth(
                status=overall_status,
                uptime_seconds=time.time() - self.start_time,
                services=all_services
            )
            
        except asyncio.TimeoutError:
            return SystemHealth(
                status="unhealthy",
                uptime_seconds=time.time() - self.start_time,
                services=[
                    HealthStatus(
                        service="health_check",
                        status="unhealthy",
                        error="Health check timeout"
                    )
                ]
            )
    
    async def get_readiness_check(self) -> SystemHealth:
        """Kubernetes-style readiness probe - can service handle requests?"""
        # Check only critical dependencies needed to serve requests
        database_health = await self.check_database_health()
        
        status = "healthy" if database_health.status != "unhealthy" else "unhealthy"
        
        return SystemHealth(
            status=status,
            uptime_seconds=time.time() - self.start_time,
            services=[database_health]
        )
    
    async def get_liveness_check(self) -> SystemHealth:
        """Kubernetes-style liveness probe - is the service alive?"""
        # Simple check that the service is running
        return await self.get_basic_health()


# Global monitoring service instance
monitoring_service = MonitoringService()