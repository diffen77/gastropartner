"""Feature flags API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import FeatureFlags, FeatureFlagsBase

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
        )
        
    except Exception as e:
        logger.error(f"Error getting default feature flags: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get feature flags"
        ) from e