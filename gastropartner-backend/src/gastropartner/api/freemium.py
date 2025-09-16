"""Freemium API endpoints för usage tracking och upgrade prompts."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from supabase import Client

from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.database import get_supabase_client, get_supabase_client_with_auth
from gastropartner.core.freemium import get_freemium_service
from gastropartner.core.models import UsageLimitsCheck, User

router = APIRouter(prefix="/freemium", tags=["freemium"])


def get_authenticated_supabase_client(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> Client:
    """Get Supabase client with proper authentication context."""
    # For development user, use admin client to bypass RLS
    auth_client = get_supabase_client_with_auth(str(current_user.id))
    return auth_client


@router.get(
    "/usage",
    response_model=dict[str, Any],
    summary="Get usage summary",
    description="Get complete usage summary with upgrade prompts for freemium features",
)
async def get_usage_summary(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> dict[str, Any]:
    """
    Get comprehensive usage summary for the organization.

    Returns current usage vs limits for all freemium features with
    context-specific upgrade prompts and recommendations.
    """
    freemium_service = await get_freemium_service(supabase)
    return await freemium_service.get_usage_summary(organization_id)


@router.get(
    "/limits",
    response_model=UsageLimitsCheck,
    summary="Check all limits",
    description="Check current usage against all freemium limits",
)
async def check_all_limits(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> UsageLimitsCheck:
    """Check current usage against all freemium limits."""
    freemium_service = await get_freemium_service(supabase)
    return await freemium_service.check_all_limits(organization_id)


@router.get(
    "/upgrade-prompts",
    response_model=dict[str, str],
    summary="Get upgrade prompts",
    description="Get context-specific upgrade prompts for features at or near limits",
)
async def get_upgrade_prompts(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> dict[str, str]:
    """Get upgrade prompts for features that are at or near limits."""
    freemium_service = await get_freemium_service(supabase)
    limits_check = await freemium_service.check_all_limits(organization_id)
    return freemium_service._generate_upgrade_prompts(limits_check)


@router.get(
    "/plan-comparison",
    response_model=dict[str, Any],
    summary="Get plan comparison",
    description="Get comparison between free and premium plans (public endpoint)",
)
async def get_plan_comparison() -> dict[str, Any]:
    """
    Get plan comparison data for upgrade decision.

    Shows what users get with free vs premium plans for recipe module.
    """
    return {
        "current_plan": "free",
        "plans": {
            "free": {
                "price": 0,
                "currency": "SEK",
                "billing_period": "month",
                "features": {
                    "ingredients": {"limit": 50, "description": "Track up to 50 ingredients"},
                    "recipes": {"limit": 5, "description": "Create up to 5 recipes"},
                    "menu_items": {"limit": 2, "description": "Manage up to 2 menu items"},
                    "cost_tracking": {"enabled": True, "description": "Basic cost calculations"},
                    "support": {"enabled": False, "description": "Community support only"},
                    "exports": {"enabled": False, "description": "No data exports"},
                },
            },
            "premium": {
                "price": 99,
                "currency": "SEK",
                "billing_period": "month",
                "features": {
                    "ingredients": {"limit": None, "description": "Unlimited ingredients"},
                    "recipes": {"limit": None, "description": "Unlimited recipes"},
                    "menu_items": {"limit": None, "description": "Unlimited menu items"},
                    "cost_tracking": {
                        "enabled": True,
                        "description": "Advanced cost analytics and forecasting",
                    },
                    "batch_operations": {
                        "enabled": True,
                        "description": "Bulk import/export and batch calculations",
                    },
                    "supplier_management": {
                        "enabled": True,
                        "description": "Advanced supplier tracking and price comparisons",
                    },
                    "profit_optimization": {
                        "enabled": True,
                        "description": "AI-powered profit optimization recommendations",
                    },
                    "nutritional_analysis": {
                        "enabled": True,
                        "description": "Nutritional information and compliance",
                    },
                    "support": {"enabled": True, "description": "Priority email support"},
                    "exports": {"enabled": True, "description": "CSV, Excel, and PDF exports"},
                },
                "upgrade_benefits": [
                    "Remove all limits on ingredients, recipes, and menu items",
                    "Advanced cost forecasting and trend analysis",
                    "Supplier price comparison and optimization",
                    "AI-powered profit margin recommendations",
                    "Priority customer support",
                    "Data exports in multiple formats",
                ],
            },
        },
        "upgrade_url": "/upgrade",  # Frontend route for upgrade flow
        "trial_available": False,  # Future: 30-day trial
    }
