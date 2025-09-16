"""Pytest configuration and fixtures for gastropartner tests."""

from unittest.mock import MagicMock
from uuid import UUID

import pytest
from supabase import Client


@pytest.fixture
def supabase_client():
    """Mock Supabase client for testing."""
    mock_client = MagicMock(spec=Client)

    # Create a mock table that supports method chaining
    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table

    # Configure default responses
    mock_response = MagicMock()
    mock_response.data = []
    mock_response.count = 0
    mock_table.execute.return_value = mock_response

    # Make table() method return the mock table
    mock_client.table.return_value = mock_table

    return mock_client


@pytest.fixture
def mock_organization_id():
    """Mock organization ID for testing."""
    return UUID("87654321-4321-4321-4321-210987654321")


@pytest.fixture
def mock_user_id():
    """Mock user ID for testing."""
    return UUID("12345678-1234-1234-1234-123456789012")


@pytest.fixture
def mock_organization_user_data():
    """Mock organization user data for testing."""
    return {
        "role": "owner",
        "joined_at": "2024-01-01T00:00:00Z",
        "organization_id": "87654321-4321-4321-4321-210987654321",
        "user_id": "12345678-1234-1234-1234-123456789012",
    }


@pytest.fixture
def mock_organization_data():
    """Mock organization data for testing."""
    return {
        "organization_id": "87654321-4321-4321-4321-210987654321",
        "name": "Test Organization",
        "slug": "test-org",
        "plan": "free",
        "description": "Test organization for unit tests",
        "created_at": "2024-01-01T00:00:00Z",
    }
