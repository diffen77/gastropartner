"""Tests for monitoring and health check endpoints."""

import pytest
from fastapi.testclient import TestClient

from gastropartner.main import app

client = TestClient(app)


def test_basic_health_check():
    """Test basic health check endpoint."""
    response = client.get("/health/")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] in ["healthy", "degraded", "unhealthy"]
    assert "uptime_seconds" in data
    assert "services" in data
    assert "timestamp" in data


def test_detailed_health_check():
    """Test detailed health check endpoint."""
    response = client.get("/health/detailed")
    assert response.status_code in [200, 503]  # May fail if dependencies are down

    data = response.json()
    assert data["status"] in ["healthy", "degraded", "unhealthy"]
    assert "services" in data
    assert len(data["services"]) > 0

    # Check that we have expected services
    service_names = [service["service"] for service in data["services"]]
    assert "database" in service_names or "api" in service_names


def test_readiness_probe():
    """Test readiness probe endpoint."""
    response = client.get("/health/readiness")
    assert response.status_code in [200, 503]

    if response.status_code == 200:
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]


def test_liveness_probe():
    """Test liveness probe endpoint."""
    response = client.get("/health/liveness")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "uptime_seconds" in data


def test_system_metrics():
    """Test system metrics endpoint."""
    response = client.get("/health/metrics")
    assert response.status_code == 200

    data = response.json()
    assert "timestamp" in data
    assert "metrics" in data
    assert "uptime_seconds" in data

    # Check basic metrics structure
    metrics = data["metrics"]
    if "memory" in metrics:
        assert "used_mb" in metrics["memory"]


def test_status_page():
    """Test status page endpoint."""
    response = client.get("/health/status")
    assert response.status_code == 200

    data = response.json()
    assert "overall_status" in data
    assert "last_updated" in data
    assert "services" in data
    assert "incidents" in data
    assert "maintenance" in data


def test_get_active_alerts():
    """Test getting active alerts."""
    response = client.get("/health/alerts")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)


def test_synthetic_test_unauthorized():
    """Test synthetic test endpoint without API key."""
    response = client.post("/health/synthetic/test?test_type=auth_flow")
    assert response.status_code == 401


def test_synthetic_test_with_api_key():
    """Test synthetic test endpoint with API key."""
    # Use the default dev API key
    api_key = "dev-synthetic-key-12345"

    response = client.post(f"/health/synthetic/test?test_type=auth_flow&api_key={api_key}")
    assert response.status_code == 200

    data = response.json()
    assert "test" in data
    assert "status" in data
    assert data["test"] == "auth_flow"


def test_create_alert_unauthorized():
    """Test creating alert without API key."""
    response = client.post("/health/alerts?title=Test Alert&description=Test")
    assert response.status_code == 401


def test_create_alert_with_api_key():
    """Test creating alert with API key."""
    api_key = "dev-synthetic-key-12345"

    response = client.post(
        f"/health/alerts?title=Test Alert&description=Test Description&severity=medium&api_key={api_key}"
    )
    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "Test Alert"
    assert data["description"] == "Test Description"
    assert data["severity"] == "medium"
    assert data["resolved"] is False

    # Clean up by resolving the alert
    alert_id = data["id"]
    resolve_response = client.post(f"/health/alerts/{alert_id}/resolve?api_key={api_key}")
    assert resolve_response.status_code == 200


def test_resolve_nonexistent_alert():
    """Test resolving a non-existent alert."""
    api_key = "dev-synthetic-key-12345"

    response = client.post(f"/health/alerts/nonexistent/resolve?api_key={api_key}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_monitoring_service_health_checks():
    """Test monitoring service health check methods."""
    from gastropartner.core.monitoring import monitoring_service

    # Test basic health check
    basic_health = await monitoring_service.get_basic_health()
    assert basic_health.status == "healthy"
    assert basic_health.uptime_seconds is not None

    # Test API health check
    api_health = await monitoring_service.check_api_health()
    assert api_health.service == "api"
    assert api_health.status in ["healthy", "unhealthy"]

    # Test system metrics
    metrics = await monitoring_service.get_system_metrics()
    assert isinstance(metrics, dict)
    # Note: metrics might have errors in test environment, that's ok


@pytest.mark.asyncio
async def test_alert_manager():
    """Test alert manager functionality."""
    from gastropartner.core.alerting import alert_manager

    # Create a test alert
    alert = await alert_manager.create_alert(
        alert_id="test_alert_123",
        title="Test Alert",
        description="This is a test alert",
        severity="medium",
        source="test"
    )

    assert alert.id == "test_alert_123"
    assert alert.title == "Test Alert"
    assert alert.severity == "medium"
    assert alert.resolved is False

    # Check it's in active alerts
    active_alerts = alert_manager.get_active_alerts()
    alert_ids = [a.id for a in active_alerts]
    assert "test_alert_123" in alert_ids

    # Resolve the alert
    resolved_alert = await alert_manager.resolve_alert("test_alert_123")
    assert resolved_alert is not None
    assert resolved_alert.resolved is True
    assert resolved_alert.resolved_at is not None

    # Check it's no longer in active alerts
    active_alerts = alert_manager.get_active_alerts()
    alert_ids = [a.id for a in active_alerts]
    assert "test_alert_123" not in alert_ids
