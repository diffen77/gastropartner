"""Tests för main module."""

from fastapi.testclient import TestClient

from gastropartner.main import app

client = TestClient(app)


def test_read_root() -> None:
    """Test root endpoint returnerar Hello World."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "GastroPartner" in data["message"]
    assert "environment" in data
    assert "version" in data


def test_health_check() -> None:
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "gastropartner-api"
    assert "environment" in data
