"""Multitenant API endpoints för organization management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import MessageResponse, User
from gastropartner.core.multitenant import get_multitenant_service, MultitenantService

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get(
    "/",
    summary="List user organizations",
    description="Get all organizations the current user belongs to"
)
async def list_user_organizations(
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
):
    """List all organizations the current user belongs to."""
    return await multitenant_service.get_user_organizations(current_user.id)


@router.get(
    "/primary",
    summary="Get primary organization",
    description="Get the user's primary organization (for MVP, the only one)"
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
    description="Invite a user to the organization (requires admin/owner permissions)"
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
            detail="Invalid role. Must be 'member', 'admin', or 'owner'"
        )
    
    await multitenant_service.invite_user_to_organization(
        inviter_user_id=current_user.id,
        organization_id=organization_id,
        invitee_user_id=user_id,
        role=role,
    )
    
    return MessageResponse(
        message=f"User invited to organization with role '{role}'",
        success=True
    )


@router.delete(
    "/{organization_id}/users/{user_id}",
    response_model=MessageResponse,
    summary="Remove user from organization",
    description="Remove a user from the organization (self-removal or admin/owner action)"
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
            detail="Failed to remove user from organization"
        )
    
    action = "left" if current_user.id == user_id else "removed from"
    return MessageResponse(
        message=f"User {action} organization successfully",
        success=True
    )


@router.put(
    "/{organization_id}/users/{user_id}/role",
    response_model=MessageResponse,
    summary="Update user role",
    description="Update a user's role in the organization (requires owner permissions)"
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
            detail="Invalid role. Must be 'member', 'admin', or 'owner'"
        )
    
    await multitenant_service.update_user_role(
        updater_user_id=current_user.id,
        organization_id=organization_id,
        target_user_id=user_id,
        new_role=new_role,
    )
    
    return MessageResponse(
        message=f"User role updated to '{new_role}' successfully",
        success=True
    )


@router.get(
    "/{organization_id}/access-check",
    summary="Check organization access",
    description="Check if current user has access to organization"
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
            detail="Invalid role. Must be 'member', 'admin', or 'owner'"
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