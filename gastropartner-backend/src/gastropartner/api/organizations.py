"""Organization API endpoints för multitenant support."""

import os
import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from supabase import Client

from gastropartner.core.auth import get_current_active_user
from gastropartner.core.database import get_supabase_client, get_supabase_client_with_auth
from gastropartner.core.models import (
    MessageResponse,
    Organization,
    OrganizationCreate,
    OrganizationSettings,
    OrganizationSettingsCreate,
    OrganizationSettingsUpdate,
    OrganizationUpdate,
    User,
)
from gastropartner.utils.logger import dev_logger

router = APIRouter(prefix="/organizations", tags=["organizations"])

security = HTTPBearer()


def get_authenticated_supabase_client(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> Client:
    """Get Supabase client with proper authentication context."""
    # Get authenticated client to ensure RLS policies are applied
    auth_client = get_supabase_client_with_auth(str(current_user.id))
    return auth_client


@router.get("/debug")
async def debug_organizations(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Debug endpoint to check authentication.

    🚨 DEVELOPMENT ONLY: This endpoint is only available in development/testing environments.
    Environment guard prevents exposure in production.
    """
    from gastropartner.config import get_settings

    settings = get_settings()

    # Environment guard - only allow in development/testing environments
    if settings.environment not in ["development", "testing", "local"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debug endpoint not available in production environment",
        )

    return {
        "message": "Organizations debug endpoint reached",
        "user_id": current_user.id,
        "user_email": current_user.email,
        "is_dev_user": str(current_user.id) == "12345678-1234-1234-1234-123456789012",
        "environment": settings.environment,
    }


@router.get("/debug-list")
async def debug_list_organizations(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> dict:
    """
    Debug endpoint to test list function.

    🚨 DEVELOPMENT ONLY: This endpoint is only available in development/testing environments.
    Environment guard prevents exposure in production.
    """
    from gastropartner.config import get_settings

    settings = get_settings()

    # Environment guard - only allow in development/testing environments
    if settings.environment not in ["development", "testing", "local"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debug endpoint not available in production environment",
        )

    try:
        result = await list_user_organizations(current_user, supabase)
        return {
            "user_id": current_user.id,
            "organizations_count": len(result),
            "organizations": [{"id": org.organization_id, "name": org.name} for org in result],
            "is_dev_user": str(current_user.id) == "12345678-1234-1234-1234-123456789012",
            "environment": settings.environment,
        }
    except Exception as e:
        return {
            "error": str(e),
            "user_id": current_user.id,
            "is_dev_user": str(current_user.id) == "12345678-1234-1234-1234-123456789012",
            "environment": settings.environment,
        }


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from organization name."""
    # Convert to lowercase and replace spaces/special chars with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    # Remove leading/trailing hyphens
    slug = slug.strip("-")
    # Limit length
    return slug[:50] if slug else "organization"


@router.post(
    "/",
    response_model=Organization,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization",
    description="Create a new organization (user becomes owner) - MULTI-TENANT SECURE",
)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> Organization:
    """
    Create new organization with MULTI-TENANT SECURITY.

    - **name**: Organization name
    - **description**: Optional description

    🛡️ SECURITY: The current user becomes the organization owner.
    Each user can only have ONE organization for MVP.

    🚨 CRITICAL: Never add real users to dev-org (87654321-4321-4321-4321-210987654321).
    Dev-org is ONLY for development users.

    Returns 400 Bad Request if user already has an organization.
    """
    try:
        # 🛡️ SECURITY CHECK: Ensure user exists in users table
        user_check = (
            supabase.table("users").select("user_id").eq("user_id", str(current_user.id)).execute()
        )
        if not user_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found in users table. Please ensure user registration is complete.",
            )

        # 🛡️ MULTI-TENANT SECURITY: Check if user already has an organization
        existing_orgs = (
            supabase.table("organization_users")
            .select("organization_id")
            .eq("user_id", str(current_user.id))
            .execute()
        )

        if existing_orgs.data:
            # In development environment, allow returning existing organization for testing
            if os.getenv("ENVIRONMENT") in ["development", "local"]:
                # Get the existing organization
                org_id = existing_orgs.data[0]["organization_id"]
                org_response = (
                    supabase.table("organizations")
                    .select("*")
                    .eq("organization_id", org_id)
                    .execute()
                )
                if org_response.data:
                    org_data = org_response.data[0]
                    if "organization_id" in org_data:
                        org_data["id"] = org_data["organization_id"]
                    return Organization(**org_data)

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an organization. Only one organization per user is allowed for MVP.",
            )

        # Generate slug from organization name
        base_slug = generate_slug(org_data.name)
        slug = base_slug

        # Check for slug conflicts and add suffix if needed
        counter = 1
        while True:
            existing = supabase.table("organizations").select("slug").eq("slug", slug).execute()
            if not existing.data:
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        # 🛡️ SECURITY: Create organization with proper owner_id (foreign key to users table)
        org_response = (
            supabase.table("organizations")
            .insert(
                {
                    "name": org_data.name,
                    "slug": slug,
                    "description": org_data.description,
                    "owner_id": str(current_user.id),  # Must exist in users table
                    "max_ingredients": 50,  # Freemium defaults
                    "max_recipes": 5,
                    "max_menu_items": 2,
                    "current_ingredients": 0,
                    "current_recipes": 0,
                    "current_menu_items": 0,
                }
            )
            .execute()
        )

        if not org_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create organization",
            )

        org_data_result = org_response.data[0]

        # 🛡️ MULTI-TENANT SECURITY: Add user as owner to organization_users table
        org_user_response = (
            supabase.table("organization_users")
            .insert(
                {
                    "user_id": str(current_user.id),  # Must exist in users table
                    "organization_id": org_data_result["organization_id"],
                    "role": "owner",
                }
            )
            .execute()
        )

        if not org_user_response.data:
            # Rollback organization creation if organization_users insert fails
            supabase.table("organizations").delete().eq(
                "organization_id", org_data_result["organization_id"]
            ).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign user to organization",
            )

        # 🛡️ SECURITY: Update users table with primary organization_id
        supabase.table("users").update({"organization_id": org_data_result["organization_id"]}).eq(
            "user_id", str(current_user.id)
        ).execute()

        # Convert database result to match model expectations
        org_model_data = {**org_data_result}
        # The model expects 'id' as alias for organization_id
        if "organization_id" in org_model_data:
            org_model_data["id"] = org_model_data["organization_id"]

        return Organization(**org_model_data)

    except HTTPException:
        raise
    except Exception as e:
        dev_logger.error_print(f"Organization creation failed: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Organization creation failed. Please check database configuration and user authentication.",
        ) from e


@router.get(
    "/",
    response_model=list[Organization],
    summary="List user organizations",
    description="Get all organizations where user is a member - MULTI-TENANT SECURE",
)
async def list_user_organizations(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> list[Organization]:
    """
    List organizations where current user is a member.

    Returns all organizations with their current usage statistics.
    Uses restaurant name from organization_settings as the display name.
    """
    dev_logger.org_print(f"list_user_organizations called for user: {current_user.id}")
    dev_logger.org_print(f"user email: {current_user.email}")

    try:
        # 🛡️ SECURITY: Get user's organization memberships with proper RLS
        org_memberships = (
            supabase.table("organization_users")
            .select("organization_id")
            .eq("user_id", str(current_user.id))
            .execute()
        )

        if not org_memberships.data:
            dev_logger.warn_print(f"User {current_user.email} has no organization memberships")
            return []

        organizations = []
        for membership in org_memberships.data:
            org_id = membership["organization_id"]

            # Get organization details
            org_response = (
                supabase.table("organizations").select("*").eq("organization_id", org_id).execute()
            )

            if not org_response.data:
                dev_logger.warn_print(f"Organization {org_id} not found")
                continue

            org_data = org_response.data[0]

            # Try to get restaurant name from organization_settings for display name
            display_name = org_data.get("name", "Restaurant")  # Default fallback
            try:
                settings_response = (
                    supabase.table("organization_settings")
                    .select("restaurant_profile")
                    .eq("organization_id", org_id)
                    .execute()
                )

                if settings_response.data and settings_response.data[0].get("restaurant_profile"):
                    restaurant_profile = settings_response.data[0]["restaurant_profile"]
                    if isinstance(restaurant_profile, dict) and restaurant_profile.get("name"):
                        display_name = restaurant_profile["name"]
                        dev_logger.org_print(f"Using restaurant name from settings: {display_name}")
                    else:
                        dev_logger.org_print(
                            f"No restaurant name in settings, using org name: {display_name}"
                        )
                else:
                    dev_logger.org_print(
                        f"No organization_settings found, using org name: {display_name}"
                    )
            except Exception as e:
                dev_logger.warn_print(
                    f"Failed to get restaurant name from settings for org {org_id}: {e}"
                )

            # Calculate current usage for this organization
            try:
                # Count current ingredients
                ingredients_count = (
                    supabase.table("ingredients")
                    .select("ingredient_id", count="exact")
                    .eq("organization_id", org_id)
                    .eq("is_active", True)
                    .execute()
                )
                current_ingredients = ingredients_count.count or 0

                # Count current recipes
                recipes_count = (
                    supabase.table("recipes")
                    .select("recipe_id", count="exact")
                    .eq("organization_id", org_id)
                    .eq("is_active", True)
                    .execute()
                )
                current_recipes = recipes_count.count or 0

                # Count current menu items
                menu_items_count = (
                    supabase.table("menu_items")
                    .select("menu_item_id", count="exact")
                    .eq("organization_id", org_id)
                    .eq("is_active", True)
                    .execute()
                )
                current_menu_items = menu_items_count.count or 0

                # Update organization data with current counts
                org_data["current_ingredients"] = current_ingredients
                org_data["current_recipes"] = current_recipes
                org_data["current_menu_items"] = current_menu_items

            except Exception as e:
                dev_logger.error_print(f"Failed to get usage counts for org {org_id}: {e}")
                # Fallback to existing values or 0 if not set
                org_data["current_ingredients"] = org_data.get("current_ingredients", 0)
                org_data["current_recipes"] = org_data.get("current_recipes", 0)
                org_data["current_menu_items"] = org_data.get("current_menu_items", 0)

            # Use display name instead of database name
            org_data["name"] = display_name

            # Convert database result to match model expectations
            # Ensure both id and organization_id are present for frontend compatibility
            if "organization_id" in org_data:
                org_data["id"] = org_data["organization_id"]
            elif "id" in org_data:
                org_data["organization_id"] = org_data["id"]

            # Create Organization object
            org_obj = Organization(**org_data)

            # Explicitly ensure both fields are present in the final response
            # since frontend expects organization_id field
            org_dict = org_obj.model_dump()
            if "id" in org_dict and "organization_id" not in org_dict:
                org_dict["organization_id"] = org_dict["id"]
            elif "organization_id" in org_dict and "id" not in org_dict:
                org_dict["id"] = org_dict["organization_id"]

            organizations.append(Organization.model_validate(org_dict))

        return organizations

    except Exception as e:
        dev_logger.error_print(f"Failed to list organizations for user {current_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user organizations",
        ) from e


@router.get(
    "/{organization_id}",
    response_model=Organization,
    summary="Get organization",
    description="Get organization details (must be member)",
)
async def get_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> Organization:
    """
    Get organization details.

    User must be a member of the organization.
    """
    # Check if user is member of organization
    membership = (
        supabase.table("organization_users")
        .select("role")
        .eq("user_id", str(current_user.id))
        .eq("organization_id", str(organization_id))
        .execute()
    )

    if not membership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Not a member of this organization",
        )

    # Get organization
    response = (
        supabase.table("organizations")
        .select("*")
        .eq("organization_id", str(organization_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    org_data = response.data[0]

    try:
        # Calculate current usage for this organization
        org_id = str(organization_id)

        # Count current ingredients
        ingredients_count = (
            supabase.table("ingredients")
            .select("ingredient_id", count="exact")
            .eq("organization_id", org_id)
            .eq("is_active", True)
            .execute()
        )
        current_ingredients = ingredients_count.count or 0

        # Count current recipes
        recipes_count = (
            supabase.table("recipes")
            .select("recipe_id", count="exact")
            .eq("organization_id", org_id)
            .eq("is_active", True)
            .execute()
        )
        current_recipes = recipes_count.count or 0

        # Count current menu items
        menu_items_count = (
            supabase.table("menu_items")
            .select("menu_item_id", count="exact")
            .eq("organization_id", org_id)
            .eq("is_active", True)
            .execute()
        )
        current_menu_items = menu_items_count.count or 0

        # Update organization data with current counts
        org_data["current_ingredients"] = current_ingredients
        org_data["current_recipes"] = current_recipes
        org_data["current_menu_items"] = current_menu_items

    except Exception as e:
        dev_logger.error_print(f"Failed to get usage counts for org {organization_id}: {e}")
        # Fallback to existing values or 0 if not set
        org_data["current_ingredients"] = org_data.get("current_ingredients", 0)
        org_data["current_recipes"] = org_data.get("current_recipes", 0)
        org_data["current_menu_items"] = org_data.get("current_menu_items", 0)

    return Organization(**org_data)


@router.put(
    "/{organization_id}",
    response_model=Organization,
    summary="Update organization",
    description="Update organization details (owner/admin only)",
)
async def update_organization(
    organization_id: UUID,
    org_update: OrganizationUpdate,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> Organization:
    """
    Update organization details.

    Only owners and admins can update organization details.
    """
    # Check if user has admin or owner role
    membership = (
        supabase.table("organization_users")
        .select("role")
        .eq("user_id", str(current_user.id))
        .eq("organization_id", str(organization_id))
        .execute()
    )

    if not membership.data or membership.data[0]["role"] not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin or owner role required",
        )

    # Build update data
    update_data = {}
    if org_update.name is not None:
        update_data["name"] = org_update.name
    if org_update.description is not None:
        update_data["description"] = org_update.description

    if not update_data:
        # No changes, return current organization
        return await get_organization(organization_id, current_user, supabase)

    # Update organization
    response = (
        supabase.table("organizations")
        .update(update_data)
        .eq("organization_id", str(organization_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found or update failed",
        )

    return Organization(**response.data[0])


@router.delete(
    "/{organization_id}",
    response_model=MessageResponse,
    summary="Delete organization",
    description="Delete organization (owner only)",
)
async def delete_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> MessageResponse:
    """
    Delete organization.

    Only organization owner can delete. This will also delete all
    related data (recipes, ingredients, etc.).
    """
    # Check if user is owner
    membership = (
        supabase.table("organization_users")
        .select("role")
        .eq("user_id", str(current_user.id))
        .eq("organization_id", str(organization_id))
        .execute()
    )

    if not membership.data or membership.data[0]["role"] != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Owner role required",
        )

    # Delete organization (cascade will handle related data)
    response = (
        supabase.table("organizations")
        .delete()
        .eq("organization_id", str(organization_id))
        .execute()
    )

    # Check if deletion was successful
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete organization",
        )

    return MessageResponse(
        message="Organization deleted successfully",
        success=True,
    )


@router.get(
    "/{organization_id}/usage",
    response_model=dict,
    summary="Get organization usage",
    description="Get current usage vs limits for organization",
)
async def get_organization_usage(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> dict:
    """
    Get organization usage statistics.

    Returns current usage vs freemium limits.
    """
    org = await get_organization(organization_id, current_user, supabase)

    return {
        "organization_id": str(org.organization_id),
        "usage": {
            "ingredients": {
                "current": org.current_ingredients,
                "limit": org.max_ingredients,
                "percentage": (org.current_ingredients / org.max_ingredients * 100)
                if org.max_ingredients > 0
                else 0,
            },
            "recipes": {
                "current": org.current_recipes,
                "limit": org.max_recipes,
                "percentage": (org.current_recipes / org.max_recipes * 100)
                if org.max_recipes > 0
                else 0,
            },
            "menu_items": {
                "current": org.current_menu_items,
                "limit": org.max_menu_items,
                "percentage": (org.current_menu_items / org.max_menu_items * 100)
                if org.max_menu_items > 0
                else 0,
            },
        },
        "upgrade_needed": any(
            [
                org.current_ingredients >= org.max_ingredients,
                org.current_recipes >= org.max_recipes,
                org.current_menu_items >= org.max_menu_items,
            ]
        ),
    }


# ===== ORGANIZATION SETTINGS ENDPOINTS =====


@router.get(
    "/{organization_id}/settings",
    response_model=OrganizationSettings,
    summary="Get organization settings",
    description="Get organization settings - MULTI-TENANT SECURE",
)
async def get_organization_settings(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> OrganizationSettings:
    """
    Get organization settings with MULTI-TENANT SECURITY.

    🛡️ SECURITY: User must belong to the organization to access settings.
    Settings are completely isolated between organizations.

    Returns organization settings and all configuration.
    """
    try:
        # 🛡️ SECURITY: Verify user belongs to this organization
        membership = (
            supabase.table("organization_users")
            .select("role")
            .eq("user_id", str(current_user.id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not membership.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Not a member of this organization",
            )

        # 🛡️ SECURITY: Query settings with organization_id filter (RLS will also enforce this)
        response = (
            supabase.table("organization_settings")
            .select("*")
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not response.data:
            # No settings exist yet - create default settings
            default_settings = OrganizationSettingsCreate(
                restaurant_profile={
                    "name": "Restaurant Name",
                    "phone": None,
                    "timezone": "UTC",
                    "currency": "SEK",
                    "address": None,
                    "website": None,
                },
                business_settings={
                    "margin_target": 30.0,
                    "service_charge": 0.0,
                    "default_prep_time": 30,
                    "operating_hours": {},
                },
                notification_preferences={
                    "email_notifications": True,
                    "sms_notifications": False,
                    "inventory_alerts": True,
                    "cost_alerts": True,
                    "daily_reports": False,
                    "weekly_reports": True,
                },
            )

            # 🛡️ SECURITY: Create settings with organization_id and creator_id
            create_response = (
                supabase.table("organization_settings")
                .insert(
                    {
                        "organization_id": str(organization_id),
                        "creator_id": str(current_user.id),
                        "restaurant_profile": default_settings.restaurant_profile.model_dump(
                            mode="json"
                        ),
                        "business_settings": default_settings.business_settings.model_dump(
                            mode="json"
                        ),
                        "notification_preferences": default_settings.notification_preferences.model_dump(
                            mode="json"
                        ),
                    }
                )
                .execute()
            )

            if not create_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create default organization settings",
                )

            settings_data = create_response.data[0]
        else:
            settings_data = response.data[0]

        return OrganizationSettings.model_validate(settings_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get organization settings: {e!s}",
        ) from e


@router.put(
    "/{organization_id}/settings",
    response_model=OrganizationSettings,
    summary="Update organization settings",
    description="Update organization settings - MULTI-TENANT SECURE",
)
async def update_organization_settings(
    organization_id: UUID,
    settings_update: OrganizationSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> OrganizationSettings:
    """
    Update organization settings with MULTI-TENANT SECURITY.

    🛡️ SECURITY: User must belong to the organization to update settings.
    Updates are completely isolated between organizations.
    """
    try:
        # 🛡️ SECURITY: Verify user belongs to this organization
        membership = (
            supabase.table("organization_users")
            .select("role")
            .eq("user_id", str(current_user.id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not membership.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Not a member of this organization",
            )

        # Build update data - only include provided fields
        update_data = {"updated_at": "now()"}

        dev_logger.debug_print(f"Received settings_update = {settings_update}")

        if settings_update.restaurant_profile is not None:
            restaurant_dump = settings_update.restaurant_profile.model_dump()
            update_data["restaurant_profile"] = restaurant_dump
            dev_logger.debug_print(f"restaurant_profile dump = {restaurant_dump}")

        if settings_update.business_settings is not None:
            business_dump = settings_update.business_settings.model_dump(mode="json")
            update_data["business_settings"] = business_dump
            dev_logger.debug_print(f"business_settings dump = {business_dump}")

        if settings_update.notification_preferences is not None:
            update_data["notification_preferences"] = (
                settings_update.notification_preferences.model_dump()
            )

        # 🛡️ SECURITY: Update settings with organization_id filter (RLS will also enforce this)
        response = (
            supabase.table("organization_settings")
            .update(update_data)
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization settings not found or update failed",
            )

        # Convert the response data with proper JSON serialization handling
        settings_data = response.data[0]
        dev_logger.debug_print(f"settings_data = {settings_data}")
        result = OrganizationSettings.model_validate(settings_data)
        dev_logger.debug_print("Created OrganizationSettings successfully")
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update organization settings: {e!s}",
        ) from e
