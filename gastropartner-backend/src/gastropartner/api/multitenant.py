"""Multitenant API endpoints för organization management."""

from datetime import UTC
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user
from gastropartner.core.database import get_supabase_client, get_supabase_client_with_auth
from gastropartner.core.models import MessageResponse, User
from gastropartner.core.multitenant import MultitenantService, get_multitenant_service
from gastropartner.utils.logger import dev_logger

router = APIRouter(prefix="/organizations", tags=["organizations"])


def get_authenticated_supabase_client(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> Client:
    """Get Supabase client with proper authentication context."""
    # For development user, use admin client to bypass RLS
    auth_client = get_supabase_client_with_auth(str(current_user.id))
    return auth_client


@router.get(
    "/",
    summary="List user organizations",
    description="Get all organizations the current user belongs to",
)
async def list_user_organizations(
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
    supabase: Client = Depends(get_authenticated_supabase_client),
):
    """List all organizations the current user belongs to."""
    # For development users, return their respective development organizations with usage counts
    # Using actual user IDs from database instead of placeholder
    if str(current_user.id) == "817df0a1-f7ee-4bb2-bffa-582d4c59115f":  # diffen@me.com
        from datetime import datetime

        # Calculate current usage for development organization
        # Using actual organization ID for diffen@me.com user
        dev_org_id = "d8feea69-f863-446c-981f-01dfc6bbd106"

        try:
            # Count current ingredients
            ingredients_count = (
                supabase.table("ingredients")
                .select("ingredient_id", count="exact")
                .eq("organization_id", dev_org_id)
                .eq("is_active", True)
                .execute()
            )
            current_ingredients = ingredients_count.count or 0

            # Count current recipes
            recipes_count = (
                supabase.table("recipes")
                .select("recipe_id", count="exact")
                .eq("organization_id", dev_org_id)
                .eq("is_active", True)
                .execute()
            )
            current_recipes = recipes_count.count or 0

            # Count current menu items
            menu_items_count = (
                supabase.table("menu_items")
                .select("menu_item_id", count="exact")
                .eq("organization_id", dev_org_id)
                .eq("is_active", True)
                .execute()
            )
            current_menu_items = menu_items_count.count or 0

        except Exception as e:
            dev_logger.error_print(f"Failed to get usage counts for dev org: {e}")
            # Fallback to 0 if database queries fail
            current_ingredients = 0
            current_recipes = 0
            current_menu_items = 0

        # Try to get restaurant name from organization_settings
        organization_name = "Development Restaurant"  # Default fallback
        try:
            settings_response = (
                supabase.table("organization_settings")
                .select("restaurant_profile")
                .eq("organization_id", dev_org_id)
                .execute()
            )

            if settings_response.data and settings_response.data[0].get("restaurant_profile"):
                restaurant_profile = settings_response.data[0]["restaurant_profile"]
                if isinstance(restaurant_profile, dict) and restaurant_profile.get("name"):
                    organization_name = restaurant_profile["name"]
                    dev_logger.org_print(
                        f"Using restaurant name from settings: {organization_name}"
                    )
                else:
                    dev_logger.org_print(
                        f"No restaurant name in settings, using fallback: {organization_name}"
                    )
            else:
                dev_logger.org_print(
                    f"No organization_settings found, using fallback: {organization_name}"
                )
        except Exception as e:
            dev_logger.warn_print(
                f"Failed to get restaurant name from settings: {e}, using fallback: {organization_name}"
            )

        return [
            {
                "role": "owner",
                "joined_at": datetime.now(UTC).isoformat(),
                "organization": {
                    "organization_id": "d8feea69-f863-446c-981f-01dfc6bbd106",
                    "name": organization_name,  # Use restaurant name from settings or fallback
                    "slug": organization_name.lower().replace(" ", "-"),  # Create slug from name
                    "plan": "free",
                    "description": "Development restaurant organization",
                    "created_at": datetime.now(UTC).isoformat(),
                    "max_ingredients": 1000,
                    "max_recipes": 500,
                    "max_menu_items": 200,
                    "current_ingredients": current_ingredients,
                    "current_recipes": current_recipes,
                    "current_menu_items": current_menu_items,
                },
            }
        ]

    # Handle lediff@gmail.com development user
    elif str(current_user.id) == "9fae3cfb-43f9-453a-8414-c56f85ac56ff":  # lediff@gmail.com
        from datetime import datetime

        # Calculate current usage for lediff@gmail.com development organization
        # Using actual organization ID for lediff@gmail.com user
        dev_org_id = "87fc8b59-8f81-48ee-849c-dd1dc9a8ac6c"

        try:
            # Count current ingredients
            ingredients_count = (
                supabase.table("ingredients")
                .select("ingredient_id", count="exact")
                .eq("organization_id", dev_org_id)
                .eq("is_active", True)
                .execute()
            )
            current_ingredients = ingredients_count.count or 0

            # Count current recipes
            recipes_count = (
                supabase.table("recipes")
                .select("recipe_id", count="exact")
                .eq("organization_id", dev_org_id)
                .eq("is_active", True)
                .execute()
            )
            current_recipes = recipes_count.count or 0

            # Count current menu items
            menu_items_count = (
                supabase.table("menu_items")
                .select("menu_item_id", count="exact")
                .eq("organization_id", dev_org_id)
                .eq("is_active", True)
                .execute()
            )
            current_menu_items = menu_items_count.count or 0

        except Exception as e:
            dev_logger.error_print(f"Failed to get usage counts for lediff dev org: {e}")
            # Fallback to 0 if database queries fail
            current_ingredients = 0
            current_recipes = 0
            current_menu_items = 0

        return [
            {
                "role": "owner",
                "joined_at": datetime.now(UTC).isoformat(),
                "organization": {
                    "organization_id": "87fc8b59-8f81-48ee-849c-dd1dc9a8ac6c",
                    "name": "lediff@gmail.com Organization",
                    "slug": "lediff-gmail-organization",
                    "plan": "free",
                    "description": "User Organization",
                    "created_at": datetime.now(UTC).isoformat(),
                    "max_ingredients": 1000,
                    "max_recipes": 500,
                    "max_menu_items": 200,
                    "current_ingredients": current_ingredients,
                    "current_recipes": current_recipes,
                    "current_menu_items": current_menu_items,
                },
            }
        ]

    return await multitenant_service.get_user_organizations(current_user.id)


@router.get(
    "/primary",
    summary="Get primary organization",
    description="Get the user's primary organization (for MVP, the only one)",
)
async def get_primary_organization(
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
):
    """Get the user's primary organization."""
    organization_id = await multitenant_service.get_user_primary_organization(current_user.id)
    return {"organization_id": organization_id}


@router.post(
    "/{organization_id}/users/{user_id}/invite",
    response_model=MessageResponse,
    summary="Invite user to organization",
    description="Invite a user to the organization (requires admin/owner permissions)",
)
async def invite_user_to_organization(
    organization_id: UUID,
    user_id: UUID,
    role: str = "member",
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
) -> MessageResponse:
    """Invite a user to the organization."""
    if role not in ["member", "admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'member', 'admin', or 'owner'",
        )

    await multitenant_service.invite_user_to_organization(
        inviter_user_id=current_user.id,
        organization_id=organization_id,
        invitee_user_id=user_id,
        role=role,
    )

    return MessageResponse(message=f"User invited to organization with role '{role}'", success=True)


@router.delete(
    "/{organization_id}/users/{user_id}",
    response_model=MessageResponse,
    summary="Remove user from organization",
    description="Remove a user from the organization (self-removal or admin/owner action)",
)
async def remove_user_from_organization(
    organization_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
) -> MessageResponse:
    """Remove a user from the organization."""
    success = await multitenant_service.remove_user_from_organization(
        remover_user_id=current_user.id,
        organization_id=organization_id,
        target_user_id=user_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove user from organization",
        )

    action = "left" if current_user.id == user_id else "removed from"
    return MessageResponse(message=f"User {action} organization successfully", success=True)


@router.put(
    "/{organization_id}/users/{user_id}/role",
    response_model=MessageResponse,
    summary="Update user role",
    description="Update a user's role in the organization (requires owner permissions)",
)
async def update_user_role(
    organization_id: UUID,
    user_id: UUID,
    new_role: str,
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
) -> MessageResponse:
    """Update a user's role in the organization."""
    if new_role not in ["member", "admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'member', 'admin', or 'owner'",
        )

    await multitenant_service.update_user_role(
        updater_user_id=current_user.id,
        organization_id=organization_id,
        target_user_id=user_id,
        new_role=new_role,
    )

    return MessageResponse(message=f"User role updated to '{new_role}' successfully", success=True)


@router.get(
    "/{organization_id}/access-check",
    summary="Check organization access",
    description="Check if current user has access to organization",
)
async def check_organization_access(
    organization_id: UUID,
    required_role: str | None = None,
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
):
    """Check if current user has access to organization."""
    if required_role and required_role not in ["member", "admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'member', 'admin', or 'owner'",
        )

    access_info = await multitenant_service.check_user_organization_access(
        user_id=current_user.id,
        organization_id=organization_id,
        required_role=required_role,
    )

    return {
        "has_access": True,
        "role": access_info["role"],
        "joined_at": access_info["joined_at"],
    }
