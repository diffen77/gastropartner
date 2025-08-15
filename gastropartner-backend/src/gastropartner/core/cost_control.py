"""Advanced Cost Control Module för GastroPartner.

This module provides comprehensive cost tracking, analysis, budgeting,
and forecasting capabilities beyond basic ingredient/recipe costing.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from supabase import Client

from gastropartner.core.models import TenantMixin


class CostBudget(TenantMixin, BaseModel):
    """Budget tracking model."""

    budget_id: UUID = Field(default_factory=lambda: UUID())
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., max_length=100)  # ingredients, labor, overhead, etc.
    budget_amount: Decimal = Field(ge=0, decimal_places=2)
    period: str = Field(..., pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    start_date: datetime
    end_date: datetime
    actual_spent: Decimal = Field(default=0, ge=0, decimal_places=2)
    variance: Decimal = Field(default=0, decimal_places=2)  # budget - actual
    variance_percentage: float = Field(default=0.0)  # (variance / budget) * 100
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class CostAlert(TenantMixin, BaseModel):
    """Cost alert configuration."""

    alert_id: UUID = Field(default_factory=lambda: UUID())
    name: str = Field(..., min_length=1, max_length=255)
    alert_type: str = Field(..., pattern="^(budget_exceeded|cost_spike|margin_warning|usage_limit)$")
    threshold_type: str = Field(..., pattern="^(percentage|absolute)$")
    threshold_value: float = Field(ge=0)
    category: str | None = Field(None, max_length=100)
    is_enabled: bool = True
    last_triggered: datetime | None = None
    created_at: datetime


class CostTrend(TenantMixin, BaseModel):
    """Historical cost trend data."""

    trend_id: UUID = Field(default_factory=lambda: UUID())
    date: datetime
    category: str = Field(..., max_length=100)
    total_cost: Decimal = Field(ge=0, decimal_places=2)
    ingredient_count: int = Field(ge=0)
    recipe_count: int = Field(ge=0)
    average_cost_per_ingredient: Decimal = Field(ge=0, decimal_places=2)
    average_cost_per_recipe: Decimal = Field(ge=0, decimal_places=2)


class CostForecast(BaseModel):
    """Cost forecasting model."""

    period: str  # "next_week", "next_month", "next_quarter"
    predicted_total_cost: Decimal
    confidence_level: float = Field(ge=0, le=100)  # 0-100%
    factors: list[str]  # factors influencing the prediction
    recommendations: list[str]


class CostReport(BaseModel):
    """Comprehensive cost report."""

    report_id: UUID = Field(default_factory=lambda: UUID())
    organization_id: UUID
    report_type: str  # "summary", "detailed", "budget_variance", "trend_analysis"
    period_start: datetime
    period_end: datetime
    total_costs: dict[str, Decimal]
    budget_performance: dict[str, Any]
    top_cost_drivers: list[dict[str, Any]]
    recommendations: list[str]
    generated_at: datetime


class CostControlService:
    """Service for advanced cost control operations."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def calculate_comprehensive_costs(
        self,
        organization_id: UUID,
        start_date: datetime,
        end_date: datetime
    ) -> dict[str, Any]:
        """Calculate comprehensive cost breakdown for a period."""

        # Development mode: return mock data for development organization
        if str(organization_id) == "87654321-4321-4321-4321-210987654321":
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "ingredient_analysis": {
                    "total_ingredients": 15,
                    "total_cost": 450.0,
                    "average_cost_per_ingredient": 30.0
                },
                "recipe_analysis": {
                    "total_recipes": 3,
                    "total_cost": 120.0,
                    "average_cost_per_recipe": 40.0
                },
                "menu_analysis": {
                    "total_menu_items": 2,
                    "total_potential_revenue": 500.0,
                    "total_food_cost": 150.0,
                    "average_margin": 175.0
                },
                "cost_efficiency": {
                    "food_cost_percentage": 30.0,
                    "margin_percentage": 70.0
                }
            }

        # Get all ingredients with their costs
        ingredients_response = self.supabase.table("ingredients").select(
            "ingredient_id, name, cost_per_unit, category, created_at, updated_at"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        # Get all recipes with cost calculations
        recipes_response = self.supabase.table("recipes").select(
            "recipe_id, name, total_cost, cost_per_serving, created_at, updated_at"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        # Get all menu items with margins
        menu_items_response = self.supabase.table("menu_items").select(
            "menu_item_id, name, selling_price, food_cost, food_cost_percentage, margin, created_at"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        # Calculate totals
        total_ingredient_cost = sum(
            float(ingredient.get("cost_per_unit", 0))
            for ingredient in ingredients_response.data or []
        )

        total_recipe_cost = sum(
            float(recipe.get("total_cost", 0))
            for recipe in recipes_response.data or []
        )

        total_menu_revenue = sum(
            float(item.get("selling_price", 0))
            for item in menu_items_response.data or []
        )

        total_food_cost = sum(
            float(item.get("food_cost", 0))
            for item in menu_items_response.data or []
        )

        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "ingredient_analysis": {
                "total_ingredients": len(ingredients_response.data or []),
                "total_cost": float(total_ingredient_cost),
                "average_cost_per_ingredient": (
                    float(total_ingredient_cost) / len(ingredients_response.data)
                    if ingredients_response.data else 0
                )
            },
            "recipe_analysis": {
                "total_recipes": len(recipes_response.data or []),
                "total_cost": float(total_recipe_cost),
                "average_cost_per_recipe": (
                    float(total_recipe_cost) / len(recipes_response.data)
                    if recipes_response.data else 0
                )
            },
            "menu_analysis": {
                "total_menu_items": len(menu_items_response.data or []),
                "total_potential_revenue": float(total_menu_revenue),
                "total_food_cost": float(total_food_cost),
                "average_margin": (
                    float(total_menu_revenue - total_food_cost) / len(menu_items_response.data)
                    if menu_items_response.data else 0
                )
            },
            "cost_efficiency": {
                "food_cost_percentage": (
                    (float(total_food_cost) / float(total_menu_revenue)) * 100
                    if total_menu_revenue > 0 else 0
                ),
                "margin_percentage": (
                    ((float(total_menu_revenue) - float(total_food_cost)) / float(total_menu_revenue)) * 100
                    if total_menu_revenue > 0 else 0
                )
            }
        }

    async def create_cost_budget(
        self,
        organization_id: UUID,
        budget_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a new cost budget."""

        budget_record = {
            "budget_id": str(UUID()),
            "organization_id": str(organization_id),
            "name": budget_data["name"],
            "category": budget_data["category"],
            "budget_amount": float(budget_data["budget_amount"]),
            "period": budget_data["period"],
            "start_date": budget_data["start_date"],
            "end_date": budget_data["end_date"],
            "actual_spent": 0.0,
            "variance": float(budget_data["budget_amount"]),
            "variance_percentage": 0.0,
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        # Note: In real implementation, this would use a cost_budgets table
        # For now, we'll store in organization settings
        org_response = self.supabase.table("organizations").select("settings").eq(
            "organization_id", str(organization_id)
        ).execute()

        if org_response.data:
            settings = org_response.data[0].get("settings", {})
            if "cost_budgets" not in settings:
                settings["cost_budgets"] = []
            settings["cost_budgets"].append(budget_record)

            self.supabase.table("organizations").update(
                {"settings": settings}
            ).eq("organization_id", str(organization_id)).execute()

        return budget_record

    async def generate_cost_forecast(
        self,
        organization_id: UUID,
        period: str = "next_month"
    ) -> CostForecast:
        """Generate cost forecast based on historical data."""

        # Get historical cost data (simplified prediction)
        costs_analysis = await self.calculate_comprehensive_costs(
            organization_id,
            datetime.now() - timedelta(days=30),
            datetime.now()
        )

        # Simple linear trend prediction (in real implementation, use ML models)
        current_monthly_cost = (
            costs_analysis["ingredient_analysis"]["total_cost"] +
            costs_analysis["recipe_analysis"]["total_cost"]
        )

        # Apply growth factors based on period
        growth_factors = {
            "next_week": 0.02,
            "next_month": 0.10,
            "next_quarter": 0.30
        }

        growth_factor = growth_factors.get(period, 0.10)
        predicted_cost = Decimal(str(current_monthly_cost * (1 + growth_factor)))

        # Generate recommendations
        recommendations = []
        if costs_analysis["cost_efficiency"]["food_cost_percentage"] > 35:
            recommendations.append("Food cost percentage is high - consider ingredient substitutions")
        if costs_analysis["ingredient_analysis"]["average_cost_per_ingredient"] > 15:
            recommendations.append("Average ingredient cost is above optimal - negotiate with suppliers")
        if costs_analysis["menu_analysis"]["average_margin"] < 100:
            recommendations.append("Menu margins are low - consider price adjustments")

        return CostForecast(
            period=period,
            predicted_total_cost=predicted_cost,
            confidence_level=75.0,  # Static for now, would be calculated from model accuracy
            factors=[
                "Historical spending trends",
                "Seasonal variations",
                "Current inventory levels"
            ],
            recommendations=recommendations
        )

    async def check_cost_alerts(self, organization_id: UUID) -> list[dict[str, Any]]:
        """Check for triggered cost alerts."""

        # Development mode: return mock alerts for development organization
        if str(organization_id) == "87654321-4321-4321-4321-210987654321":
            return [
                {
                    "alert_id": "alert-12345678-1234-1234-1234-123456789012",
                    "type": "margin_warning",
                    "severity": "medium",
                    "message": "Food cost percentage is 30.0% - within acceptable range",
                    "recommendation": "Continue monitoring food costs and pricing",
                    "triggered_at": datetime.now().isoformat()
                }
            ]

        alerts = []

        # Get current cost analysis
        costs_analysis = await self.calculate_comprehensive_costs(
            organization_id,
            datetime.now() - timedelta(days=30),
            datetime.now()
        )

        # Check food cost percentage alert
        food_cost_pct = costs_analysis["cost_efficiency"]["food_cost_percentage"]
        if food_cost_pct > 35:
            from uuid import uuid4
            alerts.append({
                "alert_id": str(uuid4()),
                "type": "margin_warning",
                "severity": "high" if food_cost_pct > 40 else "medium",
                "message": f"Food cost percentage is {food_cost_pct:.1f}% - exceeds recommended 35%",
                "recommendation": "Review ingredient costs and menu pricing",
                "triggered_at": datetime.now().isoformat()
            })

        # Check ingredient cost spike
        avg_ingredient_cost = costs_analysis["ingredient_analysis"]["average_cost_per_ingredient"]
        if avg_ingredient_cost > 20:
            from uuid import uuid4
            alerts.append({
                "alert_id": str(uuid4()),
                "type": "cost_spike",
                "severity": "medium",
                "message": f"Average ingredient cost is ${avg_ingredient_cost:.2f} - above optimal range",
                "recommendation": "Consider bulk purchasing or supplier negotiations",
                "triggered_at": datetime.now().isoformat()
            })

        return alerts

    async def generate_cost_report(
        self,
        organization_id: UUID,
        report_type: str = "summary",
        start_date: datetime | None = None,
        end_date: datetime | None = None
    ) -> CostReport:
        """Generate comprehensive cost report."""

        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()

        costs_analysis = await self.calculate_comprehensive_costs(
            organization_id, start_date, end_date
        )

        # Get top cost drivers
        ingredients_response = self.supabase.table("ingredients").select(
            "name, cost_per_unit, category"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).order(
            "cost_per_unit", desc=True
        ).limit(5).execute()

        top_cost_drivers = [
            {
                "name": item["name"],
                "cost": float(item["cost_per_unit"]),
                "category": item["category"] or "Unknown"
            }
            for item in (ingredients_response.data or [])
        ]

        # Generate recommendations
        recommendations = []
        if costs_analysis["cost_efficiency"]["food_cost_percentage"] > 35:
            recommendations.append("Reduce food cost percentage by optimizing recipes or adjusting prices")
        if len(top_cost_drivers) > 0 and top_cost_drivers[0]["cost"] > 25:
            recommendations.append(f"High-cost ingredient '{top_cost_drivers[0]['name']}' needs attention")
        if costs_analysis["menu_analysis"]["total_menu_items"] < 5:
            recommendations.append("Expand menu offerings to improve revenue potential")

        from uuid import uuid4
        return CostReport(
            report_id=uuid4(),
            organization_id=organization_id,
            report_type=report_type,
            period_start=start_date,
            period_end=end_date,
            total_costs={
                "ingredients": Decimal(str(costs_analysis["ingredient_analysis"]["total_cost"])),
                "recipes": Decimal(str(costs_analysis["recipe_analysis"]["total_cost"])),
                "food_costs": Decimal(str(costs_analysis["menu_analysis"]["total_food_cost"]))
            },
            budget_performance={},  # Would be populated from budget tracking
            top_cost_drivers=top_cost_drivers,
            recommendations=recommendations,
            generated_at=datetime.now()
        )

    async def optimize_costs(self, organization_id: UUID) -> dict[str, Any]:
        """Provide cost optimization suggestions."""

        # Development mode: return mock optimization suggestions
        if str(organization_id) == "87654321-4321-4321-4321-210987654321":
            return {
                "total_potential_savings": 45.0,
                "optimizations": [
                    {
                        "type": "ingredient_substitution",
                        "target": "Premium Olive Oil",
                        "suggestion": "Consider substituting high-cost ingredient ($25.00/unit)",
                        "potential_saving": 5.0
                    },
                    {
                        "type": "price_optimization",
                        "target": "Margherita Pizza",
                        "suggestion": "Consider increasing price by $2.50",
                        "current_food_cost_pct": 32.0,
                        "potential_saving": 2.5
                    }
                ],
                "priority_actions": [
                    {
                        "type": "price_optimization",
                        "target": "Margherita Pizza",
                        "suggestion": "Consider increasing price by $2.50",
                        "potential_saving": 2.5
                    }
                ],
                "analysis_date": datetime.now().isoformat()
            }

        costs_analysis = await self.calculate_comprehensive_costs(
            organization_id,
            datetime.now() - timedelta(days=30),
            datetime.now()
        )

        optimizations = []
        potential_savings = 0.0

        # Check for overpriced ingredients
        ingredients_response = self.supabase.table("ingredients").select(
            "ingredient_id, name, cost_per_unit, category"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        for ingredient in (ingredients_response.data or []):
            cost = float(ingredient["cost_per_unit"])
            if cost > 20:  # High-cost ingredient
                optimizations.append({
                    "type": "ingredient_substitution",
                    "target": ingredient["name"],
                    "suggestion": f"Consider substituting high-cost ingredient (${cost:.2f}/unit)",
                    "potential_saving": cost * 0.2  # 20% potential saving
                })
                potential_savings += cost * 0.2

        # Check menu pricing opportunities
        menu_items_response = self.supabase.table("menu_items").select(
            "menu_item_id, name, selling_price, food_cost, food_cost_percentage"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        for item in (menu_items_response.data or []):
            food_cost_pct = float(item.get("food_cost_percentage", 0))
            if food_cost_pct > 35:  # High food cost percentage
                potential_price_increase = float(item["selling_price"]) * 0.1  # 10% increase
                optimizations.append({
                    "type": "price_optimization",
                    "target": item["name"],
                    "suggestion": f"Consider increasing price by ${potential_price_increase:.2f}",
                    "current_food_cost_pct": food_cost_pct,
                    "potential_saving": potential_price_increase
                })
                potential_savings += potential_price_increase

        return {
            "total_potential_savings": potential_savings,
            "optimizations": optimizations,
            "priority_actions": [
                opt for opt in optimizations
                if opt.get("potential_saving", 0) > 5  # High-impact optimizations
            ],
            "analysis_date": datetime.now().isoformat()
        }


async def get_cost_control_service(supabase: Client) -> CostControlService:
    """Get cost control service instance."""
    return CostControlService(supabase)
