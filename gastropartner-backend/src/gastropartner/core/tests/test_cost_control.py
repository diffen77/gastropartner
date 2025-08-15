"""Tests för cost control service."""

from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest

from gastropartner.core.cost_control import CostControlService, CostForecast, CostReport


class TestCostControlService:
    """Test class för CostControlService."""

    @pytest.fixture
    def mock_supabase(self):
        """Mock Supabase client."""
        mock_client = Mock()
        return mock_client

    @pytest.fixture
    def cost_service(self, mock_supabase):
        """Create CostControlService instance."""
        return CostControlService(mock_supabase)

    @pytest.fixture
    def mock_organization_id(self):
        """Mock organization ID."""
        return uuid4()

    @pytest.fixture
    def mock_ingredients_response(self):
        """Mock ingredients response."""
        return Mock(
            data=[
                {
                    "ingredient_id": str(uuid4()),
                    "name": "Beef",
                    "cost_per_unit": 25.0,
                    "category": "Meat",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                },
                {
                    "ingredient_id": str(uuid4()),
                    "name": "Onion",
                    "cost_per_unit": 8.0,
                    "category": "Vegetables",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
            ]
        )

    @pytest.fixture
    def mock_recipes_response(self):
        """Mock recipes response."""
        return Mock(
            data=[
                {
                    "recipe_id": str(uuid4()),
                    "name": "Burger",
                    "total_cost": 15.0,
                    "cost_per_serving": 15.0,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
            ]
        )

    @pytest.fixture
    def mock_menu_items_response(self):
        """Mock menu items response."""
        return Mock(
            data=[
                {
                    "menu_item_id": str(uuid4()),
                    "name": "Classic Burger",
                    "selling_price": 120.0,
                    "food_cost": 30.0,
                    "food_cost_percentage": 25.0,
                    "margin": 90.0,
                    "created_at": datetime.now().isoformat()
                }
            ]
        )

    async def test_calculate_comprehensive_costs(
        self, cost_service, mock_organization_id,
        mock_ingredients_response, mock_recipes_response, mock_menu_items_response
    ):
        """Test comprehensive cost calculation."""
        # Setup mocks
        cost_service.supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_ingredients_response,
            mock_recipes_response,
            mock_menu_items_response
        ]

        start_date = datetime.now() - timedelta(days=30)
        end_date = datetime.now()

        result = await cost_service.calculate_comprehensive_costs(
            mock_organization_id, start_date, end_date
        )

        # Verify structure
        assert "period" in result
        assert "ingredient_analysis" in result
        assert "recipe_analysis" in result
        assert "menu_analysis" in result
        assert "cost_efficiency" in result

        # Verify ingredient analysis
        ingredient_analysis = result["ingredient_analysis"]
        assert ingredient_analysis["total_ingredients"] == 2
        assert ingredient_analysis["total_cost"] == 33.0  # 25.0 + 8.0
        assert ingredient_analysis["average_cost_per_ingredient"] == 16.5

        # Verify menu analysis
        menu_analysis = result["menu_analysis"]
        assert menu_analysis["total_menu_items"] == 1
        assert menu_analysis["total_potential_revenue"] == 120.0
        assert menu_analysis["total_food_cost"] == 30.0

        # Verify cost efficiency
        cost_efficiency = result["cost_efficiency"]
        assert cost_efficiency["food_cost_percentage"] == 25.0
        assert cost_efficiency["margin_percentage"] == 75.0

    async def test_create_cost_budget(self, cost_service, mock_organization_id):
        """Test cost budget creation."""
        # Mock organization response
        mock_org_response = Mock(data=[{"settings": {}}])
        cost_service.supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_org_response
        cost_service.supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()

        budget_data = {
            "name": "Monthly Food Budget",
            "category": "ingredients",
            "budget_amount": 10000.0,
            "period": "monthly",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat()
        }

        result = await cost_service.create_cost_budget(mock_organization_id, budget_data)

        assert result["name"] == "Monthly Food Budget"
        assert result["category"] == "ingredients"
        assert result["budget_amount"] == 10000.0
        assert result["actual_spent"] == 0.0
        assert result["variance"] == 10000.0

    async def test_generate_cost_forecast(self, cost_service, mock_organization_id):
        """Test cost forecast generation."""
        # Mock cost analysis response
        with patch.object(cost_service, 'calculate_comprehensive_costs') as mock_calc:
            mock_calc.return_value = {
                "ingredient_analysis": {"total_cost": 1000.0},
                "recipe_analysis": {"total_cost": 500.0},
                "cost_efficiency": {
                    "food_cost_percentage": 25.0,
                    "margin_percentage": 75.0
                },
                "menu_analysis": {"average_margin": 90.0}
            }

            result = await cost_service.generate_cost_forecast(mock_organization_id, "next_month")

            assert isinstance(result, CostForecast)
            assert result.period == "next_month"
            assert result.predicted_total_cost > 0
            assert 0 <= result.confidence_level <= 100
            assert len(result.factors) > 0
            assert len(result.recommendations) >= 0

    async def test_check_cost_alerts(self, cost_service, mock_organization_id):
        """Test cost alerts checking."""
        # Mock cost analysis with high food cost percentage
        with patch.object(cost_service, 'calculate_comprehensive_costs') as mock_calc:
            mock_calc.return_value = {
                "cost_efficiency": {"food_cost_percentage": 38.0},
                "ingredient_analysis": {"average_cost_per_ingredient": 22.0}
            }

            alerts = await cost_service.check_cost_alerts(mock_organization_id)

            assert len(alerts) > 0

            # Check for food cost alert
            food_cost_alert = next((a for a in alerts if a["type"] == "margin_warning"), None)
            assert food_cost_alert is not None
            assert food_cost_alert["severity"] == "medium"
            assert "35%" in food_cost_alert["message"]

    async def test_generate_cost_report(self, cost_service, mock_organization_id):
        """Test cost report generation."""
        # Mock responses
        with patch.object(cost_service, 'calculate_comprehensive_costs') as mock_calc:
            mock_calc.return_value = {
                "ingredient_analysis": {"total_cost": 1000.0},
                "recipe_analysis": {"total_cost": 500.0},
                "menu_analysis": {"total_food_cost": 800.0, "total_menu_items": 5},
                "cost_efficiency": {"food_cost_percentage": 30.0}
            }

            # Mock ingredients response for top cost drivers
            mock_ingredients_response = Mock(
                data=[
                    {"name": "Premium Beef", "cost_per_unit": 35.0, "category": "Meat"},
                    {"name": "Truffle Oil", "cost_per_unit": 120.0, "category": "Condiments"}
                ]
            )
            cost_service.supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_ingredients_response

            result = await cost_service.generate_cost_report(mock_organization_id)

            assert isinstance(result, CostReport)
            assert result.organization_id == mock_organization_id
            assert result.report_type == "summary"
            assert "ingredients" in result.total_costs
            assert "recipes" in result.total_costs
            assert len(result.top_cost_drivers) > 0
            assert len(result.recommendations) > 0

    async def test_optimize_costs(self, cost_service, mock_organization_id):
        """Test cost optimization suggestions."""
        # Mock expensive ingredients
        mock_ingredients_response = Mock(
            data=[
                {
                    "ingredient_id": str(uuid4()),
                    "name": "Premium Wagyu",
                    "cost_per_unit": 45.0,
                    "category": "Meat"
                }
            ]
        )

        # Mock menu items with high food cost percentage
        mock_menu_items_response = Mock(
            data=[
                {
                    "menu_item_id": str(uuid4()),
                    "name": "Expensive Dish",
                    "selling_price": 100.0,
                    "food_cost": 40.0,
                    "food_cost_percentage": 40.0
                }
            ]
        )

        cost_service.supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_ingredients_response,
            mock_menu_items_response
        ]

        with patch.object(cost_service, 'calculate_comprehensive_costs') as mock_calc:
            mock_calc.return_value = {
                "cost_efficiency": {"food_cost_percentage": 35.0}
            }

            result = await cost_service.optimize_costs(mock_organization_id)

            assert result["total_potential_savings"] > 0
            assert len(result["optimizations"]) > 0

            # Check for ingredient substitution suggestion
            ingredient_opt = next((o for o in result["optimizations"] if o["type"] == "ingredient_substitution"), None)
            assert ingredient_opt is not None
            assert "Premium Wagyu" in ingredient_opt["target"]

            # Check for price optimization suggestion
            price_opt = next((o for o in result["optimizations"] if o["type"] == "price_optimization"), None)
            assert price_opt is not None
            assert "Expensive Dish" in price_opt["target"]


class TestCostControlModels:
    """Test cost control data models."""

    def test_cost_forecast_model(self):
        """Test CostForecast model validation."""
        forecast = CostForecast(
            period="next_month",
            predicted_total_cost=Decimal("1500.00"),
            confidence_level=85.0,
            factors=["Historical trends", "Seasonal patterns"],
            recommendations=["Negotiate with suppliers", "Optimize inventory"]
        )

        assert forecast.period == "next_month"
        assert forecast.predicted_total_cost == Decimal("1500.00")
        assert forecast.confidence_level == 85.0
        assert len(forecast.factors) == 2
        assert len(forecast.recommendations) == 2

    def test_cost_report_model(self):
        """Test CostReport model validation."""
        organization_id = uuid4()

        report = CostReport(
            report_id=uuid4(),
            organization_id=organization_id,
            report_type="summary",
            period_start=datetime.now() - timedelta(days=30),
            period_end=datetime.now(),
            total_costs={
                "ingredients": Decimal("1000.00"),
                "recipes": Decimal("500.00")
            },
            budget_performance={},
            top_cost_drivers=[
                {"name": "Beef", "cost": 25.0, "category": "Meat"}
            ],
            recommendations=["Reduce portion sizes"],
            generated_at=datetime.now()
        )

        assert report.organization_id == organization_id
        assert report.report_type == "summary"
        assert "ingredients" in report.total_costs
        assert len(report.top_cost_drivers) == 1
        assert len(report.recommendations) == 1
