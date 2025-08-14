"""Organization API endpoints för multitenant support."""

import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from supabase import Client

from gastropartner.core.auth import get_current_active_user
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import (
    MessageResponse,
    Organization,
    OrganizationCreate,
    OrganizationUpdate,
    User,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])

security = HTTPBearer()

def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from organization name."""
    # Convert to lowercase and replace spaces/special chars with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower().strip())
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Limit length
    return slug[:50] if slug else "organization"

@router.post(
    "/",
    response_model=Organization,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization",
    description="Create a new organization (user becomes owner)",
)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> Organization:
    """
    Create new organization.
    
    - **name**: Organization name
    - **description**: Optional description
    
    The current user becomes the organization owner.
    
    **Restriction**: Each user can only have one organization.
    Returns 400 Bad Request if user already has an organization.
    """
    try:
        # Check if user already has an organization
        existing_orgs = supabase.table("organization_users").select(
            "organization_id"
        ).eq("user_id", str(current_user.id)).execute()

        if existing_orgs.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an organization. Only one organization per user is allowed.",
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

        # Create organization in database (RLS temporarily disabled)
        org_response = supabase.table("organizations").insert({
            "name": org_data.name,
            "slug": slug,
            "description": org_data.description,
            "owner_id": str(current_user.id),
            "max_ingredients": 50,  # Freemium defaults
            "max_recipes": 5,
            "max_menu_items": 2,
            "current_ingredients": 0,
            "current_recipes": 0,
            "current_menu_items": 0,
        }).execute()

        if not org_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create organization",
            )

        org_data_result = org_response.data[0]

        # Add user as owner to organization_users
        supabase.table("organization_users").insert({
            "user_id": str(current_user.id),
            "organization_id": org_data_result["organization_id"],
            "role": "owner",
        }).execute()

        # Convert database result to match model expectations
        org_model_data = {**org_data_result}
        # The model expects 'id' as alias for organization_id
        if "organization_id" in org_model_data:
            org_model_data["id"] = org_model_data["organization_id"]

        return Organization(**org_model_data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Organization creation failed (possibly tables don't exist): {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database tables not set up yet. Please run database migrations.",
        ) from e


@router.get(
    "/",
    response_model=list[Organization],
    summary="List user organizations",
    description="Get all organizations where user is a member",
)
async def list_user_organizations(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> list[Organization]:
    """
    List organizations where current user is a member.
    
    Returns all organizations with their current usage statistics.
    """
    try:
        # First get organization IDs where user is a member
        roles_response = supabase.table("organization_users").select(
            "organization_id"
        ).eq("user_id", str(current_user.id)).execute()

        if not roles_response.data:
            return []

        # Extract organization IDs
        org_ids = [role["organization_id"] for role in roles_response.data]

        # Get organizations by IDs
        response = supabase.table("organizations").select("*").in_(
            "organization_id", org_ids
        ).execute()

        if not response.data:
            return []

        return [Organization(**org) for org in response.data]

    except Exception as e:
        # If tables don't exist yet, return empty list instead of error
        # This allows the frontend to work during development setup
        print(f"Organizations query failed (possibly tables don't exist): {e!s}")
        return []


@router.get(
    "/{organization_id}",
    response_model=Organization,
    summary="Get organization",
    description="Get organization details (must be member)",
)
async def get_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> Organization:
    """
    Get organization details.
    
    User must be a member of the organization.
    """
    # Check if user is member of organization
    membership = supabase.table("organization_users").select(
        "role"
    ).eq("user_id", str(current_user.id)).eq(
        "organization_id", str(organization_id)
    ).execute()

    if not membership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Not a member of this organization",
        )

    # Get organization
    response = supabase.table("organizations").select(
        "*"
    ).eq("organization_id", str(organization_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return Organization(**response.data[0])


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
    supabase: Client = Depends(get_supabase_client),
) -> Organization:
    """
    Update organization details.
    
    Only owners and admins can update organization details.
    """
    # Check if user has admin or owner role
    membership = supabase.table("organization_users").select(
        "role"
    ).eq("user_id", str(current_user.id)).eq(
        "organization_id", str(organization_id)
    ).execute()

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
    response = supabase.table("organizations").update(
        update_data
    ).eq("organization_id", str(organization_id)).execute()

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
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """
    Delete organization.
    
    Only organization owner can delete. This will also delete all
    related data (recipes, ingredients, etc.).
    """
    # Check if user is owner
    membership = supabase.table("organization_users").select(
        "role"
    ).eq("user_id", str(current_user.id)).eq(
        "organization_id", str(organization_id)
    ).execute()

    if not membership.data or membership.data[0]["role"] != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Owner role required",
        )

    # Delete organization (cascade will handle related data)
    response = supabase.table("organizations").delete().eq(
        "organization_id", str(organization_id)
    ).execute()

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
    supabase: Client = Depends(get_supabase_client),
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
                "percentage": (org.current_ingredients / org.max_ingredients * 100) if org.max_ingredients > 0 else 0,
            },
            "recipes": {
                "current": org.current_recipes,
                "limit": org.max_recipes,
                "percentage": (org.current_recipes / org.max_recipes * 100) if org.max_recipes > 0 else 0,
            },
            "menu_items": {
                "current": org.current_menu_items,
                "limit": org.max_menu_items,
                "percentage": (org.current_menu_items / org.max_menu_items * 100) if org.max_menu_items > 0 else 0,
            },
        },
        "upgrade_needed": any([
            org.current_ingredients >= org.max_ingredients,
            org.current_recipes >= org.max_recipes,
            org.current_menu_items >= org.max_menu_items,
        ]),
    }
