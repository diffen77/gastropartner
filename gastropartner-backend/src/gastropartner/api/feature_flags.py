"""Feature flags API endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from gastropartner.core.auth import get_current_user, get_user_organization
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import FeatureFlagsBase, User
from gastropartner.core.repository import FeatureFlagsRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feature-flags", tags=["feature-flags"])


@router.get("/", response_model=FeatureFlagsBase)
async def get_feature_flags():
    """
    Get default feature flags for public access.
    Returns safe default configuration for unauthenticated users.
    """
    try:
        # Return default feature flags for public access
        return FeatureFlagsBase(
            show_recipe_prep_time=False,
            show_recipe_cook_time=False,
            show_recipe_instructions=False,
            show_recipe_notes=False,
            enable_notifications_section=True,
            enable_advanced_settings_section=False,
            enable_account_management_section=False,
        )

    except Exception as e:
        logger.error(f"Error getting default feature flags: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get feature flags"
        ) from e


@router.get("/organization", response_model=FeatureFlagsBase)
async def get_organization_feature_flags(
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_user_organization)
):
    """
    Get feature flags for the authenticated user's organization.
    Returns organization-specific feature flag configuration.
    """
    try:
        supabase = get_supabase_client()
        feature_flags_repo = FeatureFlagsRepository(supabase)
        
        # Get or create feature flags for the organization
        flags = await feature_flags_repo.get_or_create_for_agency(str(organization_id), str(current_user.id))
        
        # Helper function to safely get flag values
        def get_flag_value(key: str, default: bool):
            if hasattr(flags, key):
                return getattr(flags, key, default)
            elif isinstance(flags, dict):
                return flags.get(key, default)
            else:
                # Try to access as dict first, fallback to getattr
                try:
                    return flags[key] if key in flags else default
                except (KeyError, TypeError):
                    return getattr(flags, key, default)
        
        return FeatureFlagsBase(
            show_recipe_prep_time=get_flag_value("show_recipe_prep_time", False),
            show_recipe_cook_time=get_flag_value("show_recipe_cook_time", False),
            show_recipe_instructions=get_flag_value("show_recipe_instructions", False),
            show_recipe_notes=get_flag_value("show_recipe_notes", False),
            enable_notifications_section=get_flag_value("enable_notifications_section", True),
            enable_advanced_settings_section=get_flag_value("enable_advanced_settings_section", False),
            enable_account_management_section=get_flag_value("enable_account_management_section", False),
            show_user_testing=get_flag_value("show_user_testing", False),
            show_sales=get_flag_value("show_sales", False),
        )

    except Exception as e:
        logger.error(f"Error getting organization feature flags: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get organization feature flags"
        ) from e
