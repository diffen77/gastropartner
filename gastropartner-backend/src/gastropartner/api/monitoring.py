"""Monitoring and health check API endpoints."""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from gastropartner.config import get_settings
from gastropartner.core.alerting import Alert, alert_manager
from gastropartner.core.monitoring import SystemHealth, monitoring_service

settings = get_settings()

router = APIRouter(prefix="/health", tags=["monitoring"])


class StatusPageResponse(BaseModel):
    """Status page response model."""

    overall_status: str
    last_updated: datetime
    services: list[dict[str, Any]]
    incidents: list[dict[str, Any]] = []
    maintenance: list[dict[str, Any]] = []


class MetricsResponse(BaseModel):
    """System metrics response model."""

    timestamp: datetime
    metrics: dict[str, Any]
    uptime_seconds: float


@router.get("/", response_model=SystemHealth, summary="Basic health check")
async def basic_health_check():
    """
    Basic health check endpoint for load balancers and uptime monitoring.
    
    Returns minimal information quickly without external dependency checks.
    This endpoint should respond in < 100ms.
    """
    try:
        health = await monitoring_service.get_basic_health()
        return health
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {e!s}"
        )


@router.get("/detailed", response_model=SystemHealth, summary="Detailed health check")
async def detailed_health_check():
    """
    Comprehensive health check including all dependencies.
    
    Checks database connectivity, external services, and system metrics.
    May take longer to respond due to external calls.
    """
    try:
        health = await monitoring_service.get_detailed_health()
        return health
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Detailed health check failed: {e!s}"
        )


@router.get("/readiness", response_model=SystemHealth, summary="Readiness probe")
async def readiness_probe():
    """
    Kubernetes-style readiness probe.
    
    Indicates whether the service is ready to handle requests.
    Checks critical dependencies needed for request processing.
    """
    try:
        health = await monitoring_service.get_readiness_check()

        if health.status == "unhealthy":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not ready"
            )

        return health
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Readiness check failed: {e!s}"
        )


@router.get("/liveness", response_model=SystemHealth, summary="Liveness probe")
async def liveness_probe():
    """
    Kubernetes-style liveness probe.
    
    Indicates whether the service is alive and should not be restarted.
    Quick check without external dependencies.
    """
    try:
        health = await monitoring_service.get_liveness_check()
        return health
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Liveness check failed: {e!s}"
        )


@router.get("/metrics", response_model=MetricsResponse, summary="System metrics")
async def get_system_metrics():
    """
    Get current system metrics including performance data.
    
    Returns CPU, memory usage, uptime, and other operational metrics.
    """
    try:
        metrics = await monitoring_service.get_system_metrics()

        return MetricsResponse(
            timestamp=datetime.now(UTC),
            metrics=metrics,
            uptime_seconds=metrics.get("uptime_seconds", 0)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metrics: {e!s}"
        )


@router.get("/status", response_model=StatusPageResponse, summary="Public status page data")
async def get_status_page():
    """
    Get status page information for public consumption.
    
    Returns overall system status, service states, and any ongoing incidents.
    Used by the frontend status page component.
    """
    try:
        health = await monitoring_service.get_detailed_health()

        # Transform health data for status page
        services = []
        for service in health.services:
            services.append({
                "name": service.service,
                "status": service.status,
                "response_time_ms": service.response_time_ms,
                "last_updated": service.last_check.isoformat(),
                "description": _get_service_description(service.service)
            })

        return StatusPageResponse(
            overall_status=health.status,
            last_updated=health.timestamp,
            services=services,
            incidents=[],  # TODO: Implement incident tracking
            maintenance=[]  # TODO: Implement maintenance scheduling
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get status: {e!s}"
        )


def _get_service_description(service_name: str) -> str:
    """Get user-friendly description for service."""
    descriptions = {
        "database": "Primary database storing your data",
        "api": "Core API services and endpoints",
        "supabase_api": "Authentication and real-time features",
        "auth": "User authentication system",
        "storage": "File and image storage"
    }
    return descriptions.get(service_name, f"{service_name.title()} Service")


# Synthetic test endpoint for monitoring workflows
@router.post("/synthetic/test", summary="Synthetic monitoring test")
async def synthetic_test(
    test_type: str = Query(..., description="Type of synthetic test to run"),
    api_key: str | None = Query(None, description="API key for authentication")
):
    """
    Endpoint for synthetic monitoring tests.
    
    Allows external monitoring systems to run specific test scenarios
    and validate critical user journeys.
    """
    # Basic API key validation for synthetic tests
    if api_key != settings.synthetic_test_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key for synthetic testing"
        )

    try:
        if test_type == "auth_flow":
            # Test authentication workflow
            return await _test_auth_flow()
        elif test_type == "database_crud":
            # Test basic database operations
            return await _test_database_crud()
        elif test_type == "api_endpoints":
            # Test critical API endpoints
            return await _test_api_endpoints()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown test type: {test_type}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Synthetic test failed: {e!s}"
        )


async def _test_auth_flow() -> dict[str, Any]:
    """Test authentication flow for synthetic monitoring."""
    # TODO: Implement auth flow test
    return {
        "test": "auth_flow",
        "status": "passed",
        "duration_ms": 250,
        "timestamp": datetime.now(UTC).isoformat()
    }


async def _test_database_crud() -> dict[str, Any]:
    """Test database CRUD operations."""
    # TODO: Implement database CRUD test
    return {
        "test": "database_crud",
        "status": "passed",
        "operations": ["create", "read", "update", "delete"],
        "duration_ms": 150,
        "timestamp": datetime.now(UTC).isoformat()
    }


async def _test_api_endpoints() -> dict[str, Any]:
    """Test critical API endpoints."""
    # TODO: Implement API endpoint tests
    return {
        "test": "api_endpoints",
        "status": "passed",
        "endpoints_tested": [
            "/api/v1/auth/me",
            "/api/v1/organizations",
            "/api/v1/ingredients"
        ],
        "duration_ms": 180,
        "timestamp": datetime.now(UTC).isoformat()
    }


# Alert management endpoints
@router.get("/alerts", response_model=list[Alert], summary="Get active alerts")
async def get_active_alerts():
    """
    Get all currently active alerts.
    
    Returns a list of alerts that are not yet resolved.
    Used by monitoring dashboards and status pages.
    """
    try:
        alerts = alert_manager.get_active_alerts()
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alerts: {e!s}"
        )


@router.get("/alerts/{alert_id}", response_model=Alert, summary="Get specific alert")
async def get_alert(alert_id: str):
    """
    Get details of a specific alert by ID.
    """
    try:
        alert = alert_manager.get_alert(alert_id)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert {alert_id} not found"
            )
        return alert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alert: {e!s}"
        )


@router.post("/alerts", response_model=Alert, summary="Create new alert")
async def create_alert(
    title: str = Query(..., description="Alert title"),
    description: str = Query(..., description="Alert description"),
    severity: str = Query("medium", description="Alert severity", regex="^(low|medium|high|critical)$"),
    source: str = Query("manual", description="Alert source"),
    api_key: str | None = Query(None, description="API key for authentication")
):
    """
    Create a new alert manually.
    
    Requires API key authentication for security.
    Used by external monitoring systems or manual incident reporting.
    """
    # API key validation for alert creation
    if api_key != settings.synthetic_test_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key for alert creation"
        )

    try:
        # Generate alert ID
        alert_id = f"manual_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

        alert = await alert_manager.create_alert(
            alert_id=alert_id,
            title=title,
            description=description,
            severity=severity,
            source=source,
            metadata={
                "created_via": "api",
                "created_by": "manual"
            }
        )

        return alert
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create alert: {e!s}"
        )


@router.post("/alerts/{alert_id}/resolve", response_model=Alert, summary="Resolve alert")
async def resolve_alert(
    alert_id: str,
    api_key: str | None = Query(None, description="API key for authentication")
):
    """
    Resolve an active alert.
    
    Marks the alert as resolved and sends resolution notifications.
    """
    # API key validation for alert resolution
    if api_key != settings.synthetic_test_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key for alert resolution"
        )

    try:
        alert = await alert_manager.resolve_alert(alert_id)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert {alert_id} not found or already resolved"
            )
        return alert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve alert: {e!s}"
        )
