"""
Module subscriptions API endpoints.

🚨 CRITICAL SECURITY: MULTI-TENANT DATA ISOLATION
- ALL endpoints MUST filter by organization_id from get_user_organization() dependency
- NEVER allow cross-organization data access
- This implements secure module subscription management
"""

import uuid
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..core.auth import get_current_active_user, get_user_organization
from ..core.database import get_supabase_client
from ..core.models import User
from ..core.modules import (
    check_module_available_for_organization,
    get_available_modules_for_organization,
    get_module_display_name,
)

router = APIRouter(prefix="/modules", tags=["modules"])


# Module subscription models
class ModuleSubscription(BaseModel):
    id: str
    module_name: str
    tier: str
    organization_id: str
    user_id: str
    active: bool
    price: float
    currency: str
    activated_at: datetime
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ModuleActivationRequest(BaseModel):
    module_name: str
    tier: str


# Simple module enable/disable models
class ModuleSettings(BaseModel):
    id: str
    organization_id: str
    module_id: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


class ModuleUpdateRequest(BaseModel):
    enabled: bool


@router.get("/subscriptions", response_model=list[ModuleSubscription])
async def get_module_subscriptions(organization_id: UUID = Depends(get_user_organization)):
    """
    🔒 SECURE: Get active module subscriptions for the current organization.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("module_subscriptions")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("active", True)
            .execute()
        )

        if not result.data:
            return []

        subscriptions = []
        for item in result.data:
            # Convert string datetimes to datetime objects
            activated_at = datetime.fromisoformat(item["activated_at"].replace("Z", "+00:00"))
            expires_at = None
            if item.get("expires_at"):
                expires_at = datetime.fromisoformat(item["expires_at"].replace("Z", "+00:00"))
            created_at = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            updated_at = datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00"))

            subscription = ModuleSubscription(
                id=item["id"],
                module_name=item["module_name"],
                tier=item["tier"],
                organization_id=item["organization_id"],
                user_id=item["user_id"],
                active=item["active"],
                price=float(item["price"]),
                currency=item["currency"],
                activated_at=activated_at,
                expires_at=expires_at,
                created_at=created_at,
                updated_at=updated_at,
            )
            subscriptions.append(subscription)

        return subscriptions

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch module subscriptions: {e!s}"
        ) from e


@router.post("/subscriptions/activate", response_model=dict[str, Any])
async def activate_module(
    request: ModuleActivationRequest,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
):
    """
    🔒 SECURE: Activate a module subscription for the current organization.
    First checks if module is available, then creates subscription.
    Filters by organization_id for multi-tenant isolation.
    """
    supabase = get_supabase_client()

    # Price mapping for each tier
    prices = {
        "ingredients": {"free": 0, "pro": 299},
        "recipes": {"free": 0, "pro": 299},
        "menu": {"free": 0, "pro": 299},
        "analytics": {"free": 0, "pro": 299},
        "super_admin": {"free": 0, "pro": 399},
        "sales": {"free": 0, "pro": 499},
        "advanced_analytics": {"free": 0, "pro": 599},
        "mobile_app": {"free": 0, "pro": 199},
        "integrations": {"free": 0, "pro": 399},
    }

    try:
        # FIRST: Check if module is available for this organization
        is_available = await check_module_available_for_organization(
            request.module_name, organization_id
        )
        if not is_available:
            raise HTTPException(
                status_code=403,
                detail=f"Module {request.module_name} is not available for your organization. Contact support if you believe this is an error.",
            )

        # Get price for the module and tier
        price = prices.get(request.module_name, {}).get(request.tier, 0)

        # Check if module is already activated
        existing_result = (
            supabase.table("module_subscriptions")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("module_name", request.module_name)
            .eq("active", True)
            .execute()
        )

        # Deactivate existing subscription if upgrading/downgrading
        if existing_result.data:
            existing = existing_result.data[0]
            if existing["tier"] == request.tier:
                return {
                    "success": True,
                    "message": f"Module {request.module_name} already activated with tier {request.tier}",
                }

            # Deactivate old subscription
            supabase.table("module_subscriptions").update(
                {"active": False, "updated_at": datetime.now().isoformat()}
            ).eq("id", existing["id"]).execute()

        # Create new subscription
        expires_at = None
        if request.tier == "pro":
            expires_at = (datetime.now() + timedelta(days=30)).isoformat()

        new_subscription = {
            "id": str(uuid.uuid4()),
            "module_name": request.module_name,
            "tier": request.tier,
            "organization_id": organization_id,
            "user_id": str(current_user.id),  # Use current user as creator
            "active": True,
            "price": price,
            "currency": "SEK",
            "activated_at": datetime.now().isoformat(),
            "expires_at": expires_at,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        result = supabase.table("module_subscriptions").insert(new_subscription).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create module subscription")

        return {
            "success": True,
            "message": f"Successfully activated {request.module_name} with {request.tier} tier",
            "subscription": result.data[0],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate module: {e!s}") from e


@router.post("/subscriptions/{module_name}/deactivate", response_model=dict[str, Any])
async def deactivate_module(
    module_name: str, organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Deactivate a module subscription for the current organization.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()

    try:
        # Find and deactivate the active subscription
        supabase.table("module_subscriptions").update(
            {"active": False, "updated_at": datetime.now().isoformat()}
        ).eq("organization_id", organization_id).eq("module_name", module_name).eq(
            "active", True
        ).execute()

        return {"success": True, "message": f"Successfully deactivated {module_name}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deactivate module: {e!s}") from e


@router.get("/subscriptions/{module_name}/status", response_model=dict[str, Any])
async def get_module_status(
    module_name: str, organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Get status of a specific module for the current organization.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()

    try:
        result = (
            supabase.table("module_subscriptions")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("module_name", module_name)
            .eq("active", True)
            .execute()
        )

        if result.data:
            subscription = result.data[0]
            return {
                "tier": subscription["tier"],
                "active": subscription["active"],
                "expires_at": subscription.get("expires_at"),
                "price": float(subscription["price"]),
            }
        else:
            return {"tier": None, "active": False, "expires_at": None, "price": 0}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get module status: {e!s}") from e


# Simple module enable/disable endpoints
@router.get("/settings", response_model=list[ModuleSettings])
async def get_module_settings(organization_id: UUID = Depends(get_user_organization)):
    """
    🔒 SECURE: Get module enable/disable settings for the current organization.
    Only shows modules that are available according to SuperAdmin settings.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()

    try:
        # FIRST: Get modules available for this organization
        available_module_ids = get_available_modules_for_organization(organization_id)

        if not available_module_ids:
            # No modules available for this organization
            return []

        # Get existing settings for available modules only
        result = (
            supabase.table("organization_modules")
            .select("*")
            .eq("organization_id", organization_id)
            .execute()
        )

        # Create settings dict from existing data
        existing_settings = {}
        if result.data:
            for item in result.data:
                existing_settings[item["module_id"]] = item

        # Build response for available modules only
        settings = []
        for module_id in available_module_ids:
            if module_id in existing_settings:
                # Use existing setting
                item = existing_settings[module_id]
                created_at = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                updated_at = datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00"))

                setting = ModuleSettings(
                    id=item["id"],
                    organization_id=item["organization_id"],
                    module_id=item["module_id"],
                    enabled=item["enabled"],
                    created_at=created_at,
                    updated_at=updated_at,
                )
                settings.append(setting)
            else:
                # Create default setting for available module
                settings.append(
                    ModuleSettings(
                        id=str(uuid.uuid4()),
                        organization_id=str(organization_id),
                        module_id=module_id,
                        enabled=True,  # Default to enabled for available modules
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                    )
                )

        return settings

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch module settings: {e!s}"
        ) from e


@router.put("/settings/{module_id}", response_model=dict[str, Any])
async def update_module_setting(
    module_id: str,
    request: ModuleUpdateRequest,
    organization_id: UUID = Depends(get_user_organization),
):
    """
    🔒 SECURE: Update module enable/disable status for the current organization.
    Uses the simple organization_modules table for enable/disable functionality.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()

    try:
        # FIRST: Check if module is available for this organization
        is_available = await check_module_available_for_organization(module_id, organization_id)
        if not is_available:
            raise HTTPException(
                status_code=403,
                detail=f"Module {module_id} is not available for your organization. Contact support if you believe this is an error.",
            )

        # Check if setting already exists
        existing_result = (
            supabase.table("organization_modules")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("module_id", module_id)
            .execute()
        )

        if existing_result.data:
            # Update existing setting
            result = (
                supabase.table("organization_modules")
                .update({"enabled": request.enabled, "updated_at": datetime.now().isoformat()})
                .eq("organization_id", organization_id)
                .eq("module_id", module_id)
                .execute()
            )

            return {
                "success": True,
                "message": f"Successfully {'enabled' if request.enabled else 'disabled'} {module_id} module",
                "enabled": request.enabled,
            }
        else:
            # Create new setting
            new_setting = {
                "id": str(uuid.uuid4()),
                "organization_id": str(organization_id),
                "module_id": module_id,
                "enabled": request.enabled,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }

            result = supabase.table("organization_modules").insert(new_setting).execute()

            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to create module setting")

            return {
                "success": True,
                "message": f"Successfully {'enabled' if request.enabled else 'disabled'} {module_id} module",
                "enabled": request.enabled,
            }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update module setting: {e!s}"
        ) from e


@router.get("/settings/{module_id}/enabled", response_model=dict[str, bool])
async def get_module_enabled_status(
    module_id: str, organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Get the enabled status of a specific module for the current organization.
    Uses the simple organization_modules table for enable/disable functionality.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    supabase = get_supabase_client()

    try:
        # FIRST: Check if module is available for this organization
        is_available = await check_module_available_for_organization(module_id, organization_id)
        if not is_available:
            # Module not available - return disabled
            return {"enabled": False}

        result = (
            supabase.table("organization_modules")
            .select("enabled")
            .eq("organization_id", organization_id)
            .eq("module_id", module_id)
            .execute()
        )

        if result.data:
            return {"enabled": result.data[0]["enabled"]}
        else:
            # Default to enabled if no setting exists (but only if available)
            return {"enabled": True}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get module enabled status: {e!s}"
        ) from e


# ====================================================================
# MODULE AVAILABILITY ENDPOINTS FOR CUSTOMERS
# ====================================================================


@router.get("/availability", response_model=dict[str, Any])
async def get_available_modules(organization_id: UUID = Depends(get_user_organization)):
    """
    🔒 SECURE: Get modules available for the current organization.
    Only shows modules that SuperAdmin has made available.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    try:
        # Get list of available module IDs for this organization
        available_module_ids = get_available_modules_for_organization(organization_id)

        # Build detailed module information
        available_modules = []
        for module_id in available_module_ids:
            module_info = {
                "id": module_id,
                "name": get_module_display_name(module_id),
                "available": True,
            }
            available_modules.append(module_info)

        return {
            "organization_id": str(organization_id),
            "available_modules": available_modules,
            "total_available": len(available_modules),
            "message": f"{len(available_modules)} modules available for your organization",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get available modules: {e!s}"
        ) from e


@router.get("/availability/{module_id}", response_model=dict[str, Any])
async def check_module_availability(
    module_id: str, organization_id: UUID = Depends(get_user_organization)
):
    """
    🔒 SECURE: Check if a specific module is available for the current organization.
    Filters by organization_id to ensure multi-tenant data isolation.
    """
    try:
        # Check if module is available for this organization
        is_available = await check_module_available_for_organization(module_id, organization_id)

        return {
            "module_id": module_id,
            "module_name": get_module_display_name(module_id),
            "organization_id": str(organization_id),
            "available": is_available,
            "message": f"Module {module_id} is {'available' if is_available else 'not available'} for your organization",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check module availability: {e!s}"
        ) from e
