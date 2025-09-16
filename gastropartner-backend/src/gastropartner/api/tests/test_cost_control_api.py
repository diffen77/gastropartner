"""Tests för cost control API endpoints."""

from datetime import datetime
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from gastropartner.main import app


class TestCostControlAPI:
    """Test class för cost control API endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return Mock(id=uuid4(), email="test@example.com", full_name="Test User")

    @pytest.fixture
    def mock_organization_context(self):
        """Mock organization context."""
        return {"organization_id": str(uuid4()), "role": "admin"}

    @patch("gastropartner.api.cost_control.get_current_user")
    @patch("gastropartner.api.cost_control.get_organization_context")
    @patch("gastropartner.api.cost_control.get_cost_control_service")
    async def test_get_cost_analysis(
        self,
        mock_service,
        mock_org_context,
        mock_user_dep,
        client,
        mock_user,
        mock_organization_context,
    ):
        """Test cost analysis endpoint."""
        # Setup mocks
        mock_user_dep.return_value = mock_user
        mock_org_context.return_value = mock_organization_context

        mock_cost_service = Mock()
        mock_cost_service.calculate_comprehensive_costs.return_value = {
            "period": {"start_date": "2023-01-01", "end_date": "2023-01-31"},
            "ingredient_analysis": {
                "total_ingredients": 10,
                "total_cost": 500.0,
                "average_cost_per_ingredient": 50.0,
            },
            "recipe_analysis": {
                "total_recipes": 5,
                "total_cost": 250.0,
                "average_cost_per_recipe": 50.0,
            },
            "menu_analysis": {
                "total_menu_items": 3,
                "total_potential_revenue": 900.0,
                "total_food_cost": 300.0,
                "average_margin": 200.0,
            },
            "cost_efficiency": {"food_cost_percentage": 33.3, "margin_percentage": 66.7},
        }
        mock_service.return_value = mock_cost_service

        # Make request
        response = client.get("/api/v1/cost-control/analysis")

        # Verify response
        assert response.status_code == 200
        data = response.json()

        assert "period" in data
        assert "ingredient_analysis" in data
        assert "recipe_analysis" in data
        assert "menu_analysis" in data
        assert "cost_efficiency" in data

        assert data["ingredient_analysis"]["total_ingredients"] == 10
        assert data["cost_efficiency"]["food_cost_percentage"] == 33.3

    @patch("gastropartner.api.cost_control.get_current_user")
    @patch("gastropartner.api.cost_control.get_organization_context")
    @patch("gastropartner.api.cost_control.get_cost_control_service")
    async def test_create_budget(
        self,
        mock_service,
        mock_org_context,
        mock_user_dep,
        client,
        mock_user,
        mock_organization_context,
    ):
        """Test budget creation endpoint."""
        # Setup mocks
        mock_user_dep.return_value = mock_user
        mock_org_context.return_value = mock_organization_context

        mock_cost_service = Mock()
        mock_cost_service.create_cost_budget.return_value = {
            "budget_id": str(uuid4()),
            "organization_id": mock_organization_context["organization_id"],
            "name": "Monthly Food Budget",
            "category": "ingredients",
            "budget_amount": 5000.0,
            "period": "monthly",
        }
        mock_service.return_value = mock_cost_service

        # Prepare request data
        budget_data = {
            "name": "Monthly Food Budget",
            "category": "ingredients",
            "budget_amount": 5000.0,
            "period": "monthly",
            "start_date": "2023-01-01T00:00:00",
            "end_date": "2023-01-31T23:59:59",
        }

        # Make request
        response = client.post("/api/v1/cost-control/budget", json=budget_data)

        # Verify response
        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "Monthly Food Budget"
        assert data["category"] == "ingredients"
        assert data["budget_amount"] == 5000.0

    @patch("gastropartner.api.cost_control.get_current_user")
    @patch("gastropartner.api.cost_control.get_organization_context")
    @patch("gastropartner.api.cost_control.get_cost_control_service")
    async def test_get_cost_forecast(
        self,
        mock_service,
        mock_org_context,
        mock_user_dep,
        client,
        mock_user,
        mock_organization_context,
    ):
        """Test cost forecast endpoint."""
        from decimal import Decimal

        from gastropartner.core.cost_control import CostForecast

        # Setup mocks
        mock_user_dep.return_value = mock_user
        mock_org_context.return_value = mock_organization_context

        mock_cost_service = Mock()
        mock_cost_service.generate_cost_forecast.return_value = CostForecast(
            period="next_month",
            predicted_total_cost=Decimal("1200.00"),
            confidence_level=85.0,
            factors=["Historical trends", "Seasonal patterns"],
            recommendations=["Negotiate with suppliers", "Optimize portions"],
        )
        mock_service.return_value = mock_cost_service

        # Make request
        response = client.get("/api/v1/cost-control/forecast?period=next_month")

        # Verify response
        assert response.status_code == 200
        data = response.json()

        assert data["period"] == "next_month"
        assert data["predicted_total_cost"] == 1200.0
        assert data["confidence_level"] == 85.0
        assert len(data["factors"]) == 2
        assert len(data["recommendations"]) == 2

    @patch("gastropartner.api.cost_control.get_current_user")
    @patch("gastropartner.api.cost_control.get_organization_context")
    @patch("gastropartner.api.cost_control.get_cost_control_service")
    async def test_get_cost_alerts(
        self,
        mock_service,
        mock_org_context,
        mock_user_dep,
        client,
        mock_user,
        mock_organization_context,
    ):
        """Test cost alerts endpoint."""
        # Setup mocks
        mock_user_dep.return_value = mock_user
        mock_org_context.return_value = mock_organization_context

        mock_cost_service = Mock()
        mock_cost_service.check_cost_alerts.return_value = [
            {
                "alert_id": str(uuid4()),
                "type": "margin_warning",
                "severity": "high",
                "message": "Food cost percentage is 42.0% - exceeds recommended 35%",
                "recommendation": "Review ingredient costs and menu pricing",
                "triggered_at": datetime.now().isoformat(),
            }
        ]
        mock_service.return_value = mock_cost_service

        # Make request
        response = client.get("/api/v1/cost-control/alerts")

        # Verify response
        assert response.status_code == 200
        data = response.json()

        assert len(data) == 1
        alert = data[0]
        assert alert["type"] == "margin_warning"
        assert alert["severity"] == "high"
        assert "42.0%" in alert["message"]

    @patch("gastropartner.api.cost_control.get_current_user")
    @patch("gastropartner.api.cost_control.get_organization_context")
    @patch("gastropartner.api.cost_control.get_cost_control_service")
    async def test_get_cost_optimization(
        self,
        mock_service,
        mock_org_context,
        mock_user_dep,
        client,
        mock_user,
        mock_organization_context,
    ):
        """Test cost optimization endpoint."""
        # Setup mocks
        mock_user_dep.return_value = mock_user
        mock_org_context.return_value = mock_organization_context

        mock_cost_service = Mock()
        mock_cost_service.optimize_costs.return_value = {
            "total_potential_savings": 450.0,
            "optimizations": [
                {
                    "type": "ingredient_substitution",
                    "target": "Premium Beef",
                    "suggestion": "Consider substituting high-cost ingredient ($45.00/unit)",
                    "potential_saving": 200.0,
                },
                {
                    "type": "price_optimization",
                    "target": "Gourmet Burger",
                    "suggestion": "Consider increasing price by $12.00",
                    "current_food_cost_pct": 38.0,
                    "potential_saving": 120.0,
                },
            ],
            "priority_actions": [
                {
                    "type": "ingredient_substitution",
                    "target": "Premium Beef",
                    "suggestion": "Consider substituting high-cost ingredient ($45.00/unit)",
                    "potential_saving": 200.0,
                }
            ],
            "analysis_date": datetime.now().isoformat(),
        }
        mock_service.return_value = mock_cost_service

        # Make request
        response = client.get("/api/v1/cost-control/optimization")

        # Verify response
        assert response.status_code == 200
        data = response.json()

        assert data["total_potential_savings"] == 450.0
        assert len(data["optimizations"]) == 2
        assert len(data["priority_actions"]) == 1

        # Check optimization details
        ingredient_opt = next(
            o for o in data["optimizations"] if o["type"] == "ingredient_substitution"
        )
        assert ingredient_opt["target"] == "Premium Beef"
        assert ingredient_opt["potential_saving"] == 200.0

    @patch("gastropartner.api.cost_control.get_current_user")
    @patch("gastropartner.api.cost_control.get_organization_context")
    @patch("gastropartner.api.cost_control.get_cost_control_service")
    async def test_get_cost_dashboard(
        self,
        mock_service,
        mock_org_context,
        mock_user_dep,
        client,
        mock_user,
        mock_organization_context,
    ):
        """Test cost dashboard endpoint."""
        from decimal import Decimal

        from gastropartner.core.cost_control import CostForecast

        # Setup mocks
        mock_user_dep.return_value = mock_user
        mock_org_context.return_value = mock_organization_context

        mock_cost_service = Mock()

        # Mock all required service methods
        mock_cost_service.calculate_comprehensive_costs.return_value = {
            "ingredient_analysis": {
                "total_ingredients": 15,
                "total_cost": 750.0,
                "average_cost_per_ingredient": 50.0,
            },
            "recipe_analysis": {
                "total_recipes": 8,
                "total_cost": 400.0,
                "average_cost_per_recipe": 50.0,
            },
            "menu_analysis": {
                "total_menu_items": 5,
                "total_potential_revenue": 1500.0,
                "total_food_cost": 450.0,
                "average_margin": 210.0,
            },
            "cost_efficiency": {"food_cost_percentage": 30.0, "margin_percentage": 70.0},
        }

        mock_cost_service.generate_cost_forecast.return_value = CostForecast(
            period="next_month",
            predicted_total_cost=Decimal("1300.00"),
            confidence_level=80.0,
            factors=["Seasonal trends", "Historical data"],
            recommendations=["Monitor supplier prices", "Consider menu adjustments"],
        )

        mock_cost_service.check_cost_alerts.return_value = [
            {
                "alert_id": str(uuid4()),
                "type": "cost_spike",
                "severity": "medium",
                "message": "Ingredient costs increased 15% this week",
                "recommendation": "Review supplier contracts",
                "triggered_at": datetime.now().isoformat(),
            }
        ]

        mock_cost_service.optimize_costs.return_value = {
            "total_potential_savings": 320.0,
            "optimizations": [
                {
                    "type": "price_optimization",
                    "target": "Signature Dish",
                    "suggestion": "Increase price by $8",
                    "potential_saving": 80.0,
                }
            ],
            "priority_actions": [
                {
                    "type": "price_optimization",
                    "target": "Signature Dish",
                    "suggestion": "Increase price by $8",
                    "potential_saving": 80.0,
                }
            ],
        }

        mock_service.return_value = mock_cost_service

        # Make request
        response = client.get("/api/v1/cost-control/dashboard")

        # Verify response
        assert response.status_code == 200
        data = response.json()

        # Verify dashboard structure
        assert "summary" in data
        assert "costs" in data
        assert "forecast" in data
        assert "alerts" in data
        assert "optimization" in data
        assert "trends" in data
        assert "recommendations" in data
        assert "last_updated" in data

        # Verify summary data
        summary = data["summary"]
        assert summary["total_ingredients"] == 15
        assert summary["total_recipes"] == 8
        assert summary["total_menu_items"] == 5
        assert summary["food_cost_percentage"] == 30.0
        assert summary["margin_percentage"] == 70.0

    @patch("gastropartner.api.cost_control.get_current_user")
    @patch("gastropartner.api.cost_control.get_organization_context")
    @patch("gastropartner.api.cost_control.get_cost_control_service")
    async def test_get_cost_metrics(
        self,
        mock_service,
        mock_org_context,
        mock_user_dep,
        client,
        mock_user,
        mock_organization_context,
    ):
        """Test cost metrics endpoint."""
        # Setup mocks
        mock_user_dep.return_value = mock_user
        mock_org_context.return_value = mock_organization_context

        mock_cost_service = Mock()

        # Mock current and previous period analysis
        current_analysis = {
            "cost_efficiency": {"food_cost_percentage": 32.0, "margin_percentage": 68.0},
            "ingredient_analysis": {"average_cost_per_ingredient": 18.5},
            "menu_analysis": {"total_food_cost": 850.0, "total_potential_revenue": 2500.0},
        }

        previous_analysis = {
            "cost_efficiency": {"food_cost_percentage": 35.0, "margin_percentage": 65.0},
            "ingredient_analysis": {"average_cost_per_ingredient": 20.0},
            "menu_analysis": {"total_food_cost": 900.0, "total_potential_revenue": 2400.0},
        }

        mock_cost_service.calculate_comprehensive_costs.side_effect = [
            current_analysis,
            previous_analysis,
        ]
        mock_service.return_value = mock_cost_service

        # Make request
        response = client.get("/api/v1/cost-control/metrics?period_days=30")

        # Verify response
        assert response.status_code == 200
        data = response.json()

        assert data["period_days"] == 30
        assert "metrics" in data
        assert "overall_health" in data

        # Verify metrics structure
        metrics = data["metrics"]
        assert "food_cost_percentage" in metrics
        assert "margin_percentage" in metrics
        assert "avg_ingredient_cost" in metrics

        # Verify trend calculations
        food_cost_metric = metrics["food_cost_percentage"]
        assert food_cost_metric["current"] == 32.0
        assert food_cost_metric["target"] == 30.0
        assert food_cost_metric["trend"]["direction"] == "down"  # 35.0 -> 32.0 is improvement

    async def test_invalid_budget_creation(self, client, mock_user, mock_organization_context):
        """Test budget creation with missing fields."""
        with (
            patch("gastropartner.api.cost_control.get_current_user") as mock_user_dep,
            patch("gastropartner.api.cost_control.get_organization_context") as mock_org_context,
        ):
            mock_user_dep.return_value = mock_user
            mock_org_context.return_value = mock_organization_context

            # Missing required fields
            budget_data = {
                "name": "Incomplete Budget",
                # Missing category, budget_amount, period, dates
            }

            response = client.post("/api/v1/cost-control/budget", json=budget_data)

            assert response.status_code == 400
            assert "Missing required field" in response.json()["detail"]

    async def test_invalid_forecast_period(self, client, mock_user, mock_organization_context):
        """Test forecast with invalid period."""
        with (
            patch("gastropartner.api.cost_control.get_current_user") as mock_user_dep,
            patch("gastropartner.api.cost_control.get_organization_context") as mock_org_context,
        ):
            mock_user_dep.return_value = mock_user
            mock_org_context.return_value = mock_organization_context

            response = client.get("/api/v1/cost-control/forecast?period=invalid_period")

            assert response.status_code == 400
            assert "Invalid period" in response.json()["detail"]
