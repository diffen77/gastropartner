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
        # Return safe defaults for public access
        return FeatureFlagsBase(
            # Basic modules enabled
            show_ingredients=True,
            show_recipes=True,
            show_menu_items=True,
            show_reports=True,
            # Recipe features disabled by default
            show_recipe_prep_time=False,
            show_recipe_cook_time=False,
            show_recipe_instructions=False,
            show_recipe_notes=False,
            # Basic UI components enabled
            enable_dark_mode=True,
            enable_quick_actions=True,
            enable_dashboard_widgets=True,
            # Essential settings sections
            enable_notifications_section=True,
            enable_company_profile_section=True,
            enable_business_settings_section=True,
            enable_settings_header=True,
            enable_settings_footer=True,
            # Basic system features
            enable_email_notifications=True,
            # Conservative limits for public
            max_ingredients_limit=10,
            max_recipes_limit=5,
            max_menu_items_limit=20,
            max_users_per_org=2,
            api_rate_limit=50,
            storage_quota_mb=50,
        )

    except Exception as e:
        logger.error(f"Error getting default feature flags: {e}")
        raise HTTPException(status_code=500, detail="Failed to get feature flags") from e


@router.get("/organization", response_model=FeatureFlagsBase)
async def get_organization_feature_flags(
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_user_organization),
):
    """
    Get feature flags for the authenticated user's organization.
    Returns organization-specific feature flag configuration.
    """
    try:
        supabase = get_supabase_client()
        feature_flags_repo = FeatureFlagsRepository(supabase)

        # Get or create feature flags for the organization
        flags = await feature_flags_repo.get_or_create_for_agency(
            str(organization_id), str(current_user.id)
        )

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

        # Create FeatureFlagsBase with all comprehensive flags
        return FeatureFlagsBase(
            # ===== MODULES & PAGES =====
            show_ingredients=get_flag_value("show_ingredients", True),
            show_recipes=get_flag_value("show_recipes", True),
            show_menu_items=get_flag_value("show_menu_items", True),
            show_sales=get_flag_value("show_sales", False),
            show_inventory=get_flag_value("show_inventory", False),
            show_reports=get_flag_value("show_reports", True),
            show_analytics=get_flag_value("show_analytics", False),
            show_suppliers=get_flag_value("show_suppliers", False),
            # Recipe-specific features
            show_recipe_prep_time=get_flag_value("show_recipe_prep_time", False),
            show_recipe_cook_time=get_flag_value("show_recipe_cook_time", False),
            show_recipe_instructions=get_flag_value("show_recipe_instructions", False),
            show_recipe_notes=get_flag_value("show_recipe_notes", False),
            # ===== UI COMPONENTS =====
            enable_dark_mode=get_flag_value("enable_dark_mode", True),
            enable_mobile_app_banner=get_flag_value("enable_mobile_app_banner", False),
            enable_quick_actions=get_flag_value("enable_quick_actions", True),
            enable_dashboard_widgets=get_flag_value("enable_dashboard_widgets", True),
            enable_advanced_search=get_flag_value("enable_advanced_search", False),
            enable_data_export=get_flag_value("enable_data_export", False),
            enable_bulk_operations=get_flag_value("enable_bulk_operations", False),
            # Settings page sections
            enable_notifications_section=get_flag_value("enable_notifications_section", True),
            enable_advanced_settings_section=get_flag_value(
                "enable_advanced_settings_section", False
            ),
            enable_account_management_section=get_flag_value(
                "enable_account_management_section", False
            ),
            enable_company_profile_section=get_flag_value("enable_company_profile_section", True),
            enable_business_settings_section=get_flag_value(
                "enable_business_settings_section", True
            ),
            enable_settings_header=get_flag_value("enable_settings_header", True),
            enable_settings_footer=get_flag_value("enable_settings_footer", True),
            # ===== SYSTEM FEATURES =====
            enable_api_access=get_flag_value("enable_api_access", False),
            enable_webhooks=get_flag_value("enable_webhooks", False),
            enable_email_notifications=get_flag_value("enable_email_notifications", True),
            enable_sms_notifications=get_flag_value("enable_sms_notifications", False),
            enable_push_notifications=get_flag_value("enable_push_notifications", False),
            enable_multi_language=get_flag_value("enable_multi_language", False),
            enable_offline_mode=get_flag_value("enable_offline_mode", False),
            # ===== LIMITS & QUOTAS =====
            max_ingredients_limit=get_flag_value("max_ingredients_limit", 50),
            max_recipes_limit=get_flag_value("max_recipes_limit", 25),
            max_menu_items_limit=get_flag_value("max_menu_items_limit", 100),
            max_users_per_org=get_flag_value("max_users_per_org", 5),
            api_rate_limit=get_flag_value("api_rate_limit", 100),
            storage_quota_mb=get_flag_value("storage_quota_mb", 100),
            # ===== BETA FEATURES =====
            enable_ai_suggestions=get_flag_value("enable_ai_suggestions", False),
            enable_predictive_analytics=get_flag_value("enable_predictive_analytics", False),
            enable_voice_commands=get_flag_value("enable_voice_commands", False),
            enable_automated_ordering=get_flag_value("enable_automated_ordering", False),
            enable_advanced_pricing=get_flag_value("enable_advanced_pricing", False),
            enable_customer_portal=get_flag_value("enable_customer_portal", False),
            # ===== INTEGRATIONS =====
            enable_pos_integration=get_flag_value("enable_pos_integration", False),
            enable_accounting_sync=get_flag_value("enable_accounting_sync", False),
            enable_delivery_platforms=get_flag_value("enable_delivery_platforms", False),
            enable_payment_processing=get_flag_value("enable_payment_processing", False),
            enable_loyalty_programs=get_flag_value("enable_loyalty_programs", False),
        )

    except Exception as e:
        logger.error(f"Error getting organization feature flags: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get organization feature flags"
        ) from e
