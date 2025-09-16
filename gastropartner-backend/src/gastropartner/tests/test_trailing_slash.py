"""Tests for trailing slash redirect behavior."""

from fastapi.testclient import TestClient

from gastropartner.main import app

client = TestClient(app)


def test_menu_items_without_trailing_slash() -> None:
    """Test that /api/v1/menu-items without trailing slash does not redirect."""
    response = client.get("/api/v1/menu-items", follow_redirects=False)

    # Should return 403 (forbidden) not 307 (redirect)
    # Both patterns should behave identically
    assert response.status_code == 403
    assert "redirect" not in response.headers


def test_menu_items_with_trailing_slash() -> None:
    """Test that /api/v1/menu-items/ with trailing slash works the same."""
    response = client.get("/api/v1/menu-items/", follow_redirects=False)

    # Should return 403 (forbidden) not 307 (redirect)
    assert response.status_code == 403
    assert "redirect" not in response.headers


def test_ingredients_without_trailing_slash() -> None:
    """Test that /api/v1/ingredients without trailing slash does not redirect."""
    response = client.get("/api/v1/ingredients", follow_redirects=False)

    # Should return 403 (forbidden) not 307 (redirect)
    assert response.status_code == 403
    assert "redirect" not in response.headers


def test_ingredients_with_trailing_slash() -> None:
    """Test that /api/v1/ingredients/ with trailing slash works the same."""
    response = client.get("/api/v1/ingredients/", follow_redirects=False)

    # Should return 403 (forbidden) not 307 (redirect)
    assert response.status_code == 403
    assert "redirect" not in response.headers


def test_recipes_without_trailing_slash() -> None:
    """Test that /api/v1/recipes without trailing slash does not redirect."""
    response = client.get("/api/v1/recipes", follow_redirects=False)

    # Should return 403 (forbidden) not 307 (redirect)
    assert response.status_code == 403
    assert "redirect" not in response.headers


def test_recipes_with_trailing_slash() -> None:
    """Test that /api/v1/recipes/ with trailing slash works the same."""
    response = client.get("/api/v1/recipes/", follow_redirects=False)

    # Should return 403 (forbidden) not 307 (redirect)
    assert response.status_code == 403
    assert "redirect" not in response.headers


def test_both_patterns_return_same_status() -> None:
    """Test that both URL patterns return the same HTTP status code."""
    endpoints_to_test = [
        "/api/v1/menu-items",
        "/api/v1/ingredients",
        "/api/v1/recipes",
        "/api/v1/organizations",
    ]

    for endpoint in endpoints_to_test:
        response_no_slash = client.get(endpoint, follow_redirects=False)
        response_with_slash = client.get(f"{endpoint}/", follow_redirects=False)

        # Both should return the same status code
        assert response_no_slash.status_code == response_with_slash.status_code, (
            f"Mismatch for {endpoint}: {response_no_slash.status_code} vs {response_with_slash.status_code}"
        )

        # Neither should redirect
        assert "redirect" not in response_no_slash.headers
        assert "redirect" not in response_with_slash.headers
