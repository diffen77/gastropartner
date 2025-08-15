"""API endpoints för advanced cost control features."""

from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from gastropartner.core.auth import get_current_user
from gastropartner.core.cost_control import (
    CostForecast,
    CostReport,
    get_cost_control_service,
)
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import User
from gastropartner.core.multitenant import get_organization_context

router = APIRouter(prefix="/cost-control", tags=["cost-control"])


@router.get(
    "/analysis",
    response_model=dict[str, Any],
    summary="Get comprehensive cost analysis",
    description="Get detailed cost analysis for the organization including ingredients, recipes, and menu items"
)
async def get_cost_analysis(
    start_date: datetime | None = Query(None, description="Analysis start date"),
    end_date: datetime | None = Query(None, description="Analysis end date"),
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> dict[str, Any]:
    """Get comprehensive cost analysis for organization."""

    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    cost_service = await get_cost_control_service(supabase)
    return await cost_service.calculate_comprehensive_costs(
        organization_id, start_date, end_date
    )


@router.post(
    "/budget",
    response_model=dict[str, Any],
    summary="Create cost budget",
    description="Create a new cost budget for tracking expenses"
)
async def create_budget(
    budget_data: dict[str, Any],
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> dict[str, Any]:
    """Create a new cost budget."""

    # Validate required fields
    required_fields = ["name", "category", "budget_amount", "period", "start_date", "end_date"]
    for field in required_fields:
        if field not in budget_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )

    cost_service = await get_cost_control_service(supabase)
    return await cost_service.create_cost_budget(organization_id, budget_data)


@router.get(
    "/forecast",
    response_model=CostForecast,
    summary="Get cost forecast",
    description="Get predicted cost trends and recommendations"
)
async def get_cost_forecast(
    period: str = Query("next_month", description="Forecast period: next_week, next_month, next_quarter"),
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> CostForecast:
    """Get cost forecast for specified period."""

    if period not in ["next_week", "next_month", "next_quarter"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid period. Must be: next_week, next_month, or next_quarter"
        )

    cost_service = await get_cost_control_service(supabase)
    return await cost_service.generate_cost_forecast(organization_id, period)


@router.get(
    "/alerts",
    response_model=list[dict[str, Any]],
    summary="Get cost alerts",
    description="Get active cost alerts and warnings"
)
async def get_cost_alerts(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> list[dict[str, Any]]:
    """Get cost alerts for organization."""

    cost_service = await get_cost_control_service(supabase)
    return await cost_service.check_cost_alerts(organization_id)


@router.get(
    "/report",
    response_model=CostReport,
    summary="Generate cost report",
    description="Generate comprehensive cost report for specified period"
)
async def generate_cost_report(
    report_type: str = Query("summary", description="Report type: summary, detailed, budget_variance, trend_analysis"),
    start_date: datetime | None = Query(None, description="Report start date"),
    end_date: datetime | None = Query(None, description="Report end date"),
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> CostReport:
    """Generate comprehensive cost report."""

    if report_type not in ["summary", "detailed", "budget_variance", "trend_analysis"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type"
        )

    cost_service = await get_cost_control_service(supabase)
    return await cost_service.generate_cost_report(
        organization_id, report_type, start_date, end_date
    )


@router.get(
    "/optimization",
    response_model=dict[str, Any],
    summary="Get cost optimization suggestions",
    description="Get AI-powered cost optimization recommendations"
)
async def get_cost_optimization(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> dict[str, Any]:
    """Get cost optimization suggestions."""

    cost_service = await get_cost_control_service(supabase)
    return await cost_service.optimize_costs(organization_id)


@router.get(
    "/dashboard",
    response_model=dict[str, Any],
    summary="Get cost control dashboard data",
    description="Get all cost control data for dashboard display"
)
async def get_cost_dashboard(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> dict[str, Any]:
    """Get comprehensive cost control dashboard data."""

    cost_service = await get_cost_control_service(supabase)

    # Get all cost control data in parallel for dashboard
    current_date = datetime.now()
    start_date = current_date - timedelta(days=30)

    try:
        # Gather all dashboard data
        cost_analysis = await cost_service.calculate_comprehensive_costs(
            organization_id, start_date, current_date
        )

        cost_forecast = await cost_service.generate_cost_forecast(
            organization_id, "next_month"
        )

        cost_alerts = await cost_service.check_cost_alerts(organization_id)

        optimization_suggestions = await cost_service.optimize_costs(organization_id)

        # Combine into dashboard format
        dashboard_data = {
            "summary": {
                "total_ingredients": cost_analysis["ingredient_analysis"]["total_ingredients"],
                "total_recipes": cost_analysis["recipe_analysis"]["total_recipes"],
                "total_menu_items": cost_analysis["menu_analysis"]["total_menu_items"],
                "food_cost_percentage": cost_analysis["cost_efficiency"]["food_cost_percentage"],
                "margin_percentage": cost_analysis["cost_efficiency"]["margin_percentage"],
            },
            "costs": {
                "ingredient_cost": cost_analysis["ingredient_analysis"]["total_cost"],
                "recipe_cost": cost_analysis["recipe_analysis"]["total_cost"],
                "food_cost": cost_analysis["menu_analysis"]["total_food_cost"],
                "potential_revenue": cost_analysis["menu_analysis"]["total_potential_revenue"],
            },
            "forecast": {
                "next_month_prediction": float(cost_forecast.predicted_total_cost),
                "confidence": cost_forecast.confidence_level,
                "factors": cost_forecast.factors,
            },
            "alerts": {
                "active_alerts": len(cost_alerts),
                "high_priority_alerts": len([a for a in cost_alerts if a.get("severity") == "high"]),
                "recent_alerts": cost_alerts[:3],  # Last 3 alerts
            },
            "optimization": {
                "total_potential_savings": optimization_suggestions["total_potential_savings"],
                "optimization_count": len(optimization_suggestions["optimizations"]),
                "priority_actions": optimization_suggestions["priority_actions"][:3],  # Top 3
            },
            "trends": {
                "period": f"{start_date.strftime('%Y-%m-%d')} to {current_date.strftime('%Y-%m-%d')}",
                "avg_ingredient_cost": cost_analysis["ingredient_analysis"]["average_cost_per_ingredient"],
                "avg_recipe_cost": cost_analysis["recipe_analysis"]["average_cost_per_recipe"],
                "avg_margin": cost_analysis["menu_analysis"]["average_margin"],
            },
            "recommendations": cost_forecast.recommendations,
            "last_updated": current_date.isoformat(),
        }

        return dashboard_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating cost control dashboard: {e!s}"
        )


@router.get(
    "/metrics",
    response_model=dict[str, Any],
    summary="Get cost control metrics",
    description="Get key performance indicators for cost control"
)
async def get_cost_metrics(
    period_days: int = Query(30, description="Number of days for metrics calculation"),
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    organization_id: UUID = Depends(get_organization_context),
) -> dict[str, Any]:
    """Get cost control KPIs and metrics."""

    current_date = datetime.now()
    start_date = current_date - timedelta(days=period_days)
    previous_start = start_date - timedelta(days=period_days)

    cost_service = await get_cost_control_service(supabase)

    # Get current and previous period data for trends
    current_analysis = await cost_service.calculate_comprehensive_costs(
        organization_id, start_date, current_date
    )

    previous_analysis = await cost_service.calculate_comprehensive_costs(
        organization_id, previous_start, start_date
    )

    # Calculate trends
    def calculate_trend(current: float, previous: float) -> dict[str, Any]:
        if previous == 0:
            return {"change": 0, "percentage": 0, "direction": "stable"}

        change = current - previous
        percentage = (change / previous) * 100
        direction = "up" if change > 0 else "down" if change < 0 else "stable"

        return {
            "change": round(change, 2),
            "percentage": round(percentage, 2),
            "direction": direction
        }

    # Key metrics with trends
    metrics = {
        "food_cost_percentage": {
            "current": round(current_analysis["cost_efficiency"]["food_cost_percentage"], 2),
            "target": 30.0,  # Industry standard
            "status": "good" if current_analysis["cost_efficiency"]["food_cost_percentage"] <= 30 else "warning",
            "trend": calculate_trend(
                current_analysis["cost_efficiency"]["food_cost_percentage"],
                previous_analysis["cost_efficiency"]["food_cost_percentage"]
            )
        },
        "margin_percentage": {
            "current": round(current_analysis["cost_efficiency"]["margin_percentage"], 2),
            "target": 70.0,  # Industry standard
            "status": "good" if current_analysis["cost_efficiency"]["margin_percentage"] >= 70 else "warning",
            "trend": calculate_trend(
                current_analysis["cost_efficiency"]["margin_percentage"],
                previous_analysis["cost_efficiency"]["margin_percentage"]
            )
        },
        "avg_ingredient_cost": {
            "current": round(current_analysis["ingredient_analysis"]["average_cost_per_ingredient"], 2),
            "target": 15.0,  # Reasonable target
            "status": "good" if current_analysis["ingredient_analysis"]["average_cost_per_ingredient"] <= 15 else "warning",
            "trend": calculate_trend(
                current_analysis["ingredient_analysis"]["average_cost_per_ingredient"],
                previous_analysis["ingredient_analysis"]["average_cost_per_ingredient"]
            )
        },
        "total_food_cost": {
            "current": round(current_analysis["menu_analysis"]["total_food_cost"], 2),
            "trend": calculate_trend(
                current_analysis["menu_analysis"]["total_food_cost"],
                previous_analysis["menu_analysis"]["total_food_cost"]
            )
        },
        "potential_revenue": {
            "current": round(current_analysis["menu_analysis"]["total_potential_revenue"], 2),
            "trend": calculate_trend(
                current_analysis["menu_analysis"]["total_potential_revenue"],
                previous_analysis["menu_analysis"]["total_potential_revenue"]
            )
        }
    }

    return {
        "period_days": period_days,
        "metrics": metrics,
        "overall_health": (
            "excellent" if all(m.get("status") == "good" for m in metrics.values() if "status" in m)
            else "good" if sum(1 for m in metrics.values() if m.get("status") == "good") >= 2
            else "needs_attention"
        ),
        "last_updated": current_date.isoformat()
    }
