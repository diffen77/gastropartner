"""Feature flags API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import FeatureFlags, User
from gastropartner.core.repository import FeatureFlagsRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feature-flags", tags=["feature-flags"])


@router.get("/", response_model=FeatureFlags)
async def get_feature_flags(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Get feature flags for the current user's agency.
    Returns default flags if none exist.
    """
    try:
        # Get user's organization
        organization = await get_user_organization(current_user.user_id, supabase)
        agency_id = organization["organization_id"]
        
        # Get or create feature flags for the agency
        feature_flags_repo = FeatureFlagsRepository(supabase)
        flags = await feature_flags_repo.get_or_create_for_agency(agency_id)
        
        return flags
        
    except Exception as e:
        logger.error(f"Error getting feature flags for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get feature flags"
        ) from e