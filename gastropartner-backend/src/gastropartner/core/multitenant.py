"""Multitenant utilities för organization management."""

from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import User


class MultitenantService:
    """Service för managing multitenant operations."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def get_user_organizations(self, user_id: UUID) -> list[dict[str, Any]]:
        """Get all organizations a user belongs to."""
        try:
            response = self.supabase.table("organization_users").select("""
                role,
                joined_at,
                organizations (
                    organization_id,
                    name,
                    slug,
                    plan,
                    description,
                    created_at
                )
            """).eq("user_id", str(user_id)).execute()

            return [
                {
                    "role": item["role"],
                    "joined_at": item["joined_at"],
                    "organization": item["organizations"]
                }
                for item in response.data
            ]

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user organizations: {e!s}"
            ) from e

    async def get_user_primary_organization(self, user_id: UUID) -> UUID:
        """Get user's primary organization (for MVP, the only one)."""
        try:
            # Development mode: return hardcoded organization for development user
            if str(user_id) == "12345678-1234-1234-1234-123456789012":
                return UUID("87654321-4321-4321-4321-210987654321")

            response = self.supabase.table("organization_users").select(
                "organization_id"
            ).eq("user_id", str(user_id)).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User is not a member of any organization"
                )

            # For MVP: assume user belongs to exactly one organization
            if len(response.data) > 1:
                # Future: implement organization selection logic
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User belongs to multiple organizations. Organization selection not yet implemented."
                )

            return UUID(response.data[0]["organization_id"])

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get primary organization: {e!s}"
            ) from e

    async def check_user_organization_access(
        self,
        user_id: UUID,
        organization_id: UUID,
        required_role: str | None = None,
    ) -> dict[str, Any]:
        """Check if user has access to organization and optionally specific role."""
        try:
            # Development mode: allow access for development user to development org
            if (str(user_id) == "12345678-1234-1234-1234-123456789012" and 
                str(organization_id) == "87654321-4321-4321-4321-210987654321"):
                return {
                    "role": "owner",  # Grant full access in development
                    "joined_at": "2024-01-01T00:00:00Z"
                }

            query = self.supabase.table("organization_users").select(
                "role, joined_at"
            ).eq("user_id", str(user_id)).eq(
                "organization_id", str(organization_id)
            )

            if required_role:
                query = query.eq("role", required_role)

            response = query.execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to organization{f' (role {required_role} required)' if required_role else ''}"
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to check organization access: {e!s}"
            ) from e

    async def invite_user_to_organization(
        self,
        inviter_user_id: UUID,
        organization_id: UUID,
        invitee_user_id: UUID,
        role: str = "member",
    ) -> dict[str, Any]:
        """Invite user to organization (requires admin/owner permissions)."""
        # Check if inviter has permission (admin or owner)
        await self.check_user_organization_access(
            inviter_user_id, organization_id, required_role=None
        )

        inviter_response = self.supabase.table("organization_users").select(
            "role"
        ).eq("user_id", str(inviter_user_id)).eq(
            "organization_id", str(organization_id)
        ).execute()

        if not inviter_response.data or inviter_response.data[0]["role"] not in ["admin", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and owners can invite users"
            )

        # Check if user is already a member
        existing_response = self.supabase.table("organization_users").select(
            "organization_user_id"
        ).eq("user_id", str(invitee_user_id)).eq(
            "organization_id", str(organization_id)
        ).execute()

        if existing_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this organization"
            )

        try:
            # Add user to organization
            response = self.supabase.table("organization_users").insert({
                "organization_id": str(organization_id),
                "user_id": str(invitee_user_id),
                "role": role,
            }).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to add user to organization"
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to invite user: {e!s}"
            ) from e

    async def remove_user_from_organization(
        self,
        remover_user_id: UUID,
        organization_id: UUID,
        target_user_id: UUID,
    ) -> bool:
        """Remove user from organization (self-removal or admin/owner action)."""
        # Check if user is removing themselves
        if remover_user_id == target_user_id:
            # Users can always remove themselves
            pass
        else:
            # Check if remover has permission (admin or owner)
            remover_response = self.supabase.table("organization_users").select(
                "role"
            ).eq("user_id", str(remover_user_id)).eq(
                "organization_id", str(organization_id)
            ).execute()

            if not remover_response.data or remover_response.data[0]["role"] not in ["admin", "owner"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins and owners can remove other users"
                )

        try:
            response = self.supabase.table("organization_users").delete().eq(
                "user_id", str(target_user_id)
            ).eq("organization_id", str(organization_id)).execute()

            return response.data is not None

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove user from organization: {e!s}"
            ) from e

    async def update_user_role(
        self,
        updater_user_id: UUID,
        organization_id: UUID,
        target_user_id: UUID,
        new_role: str,
    ) -> dict[str, Any]:
        """Update user role in organization (requires owner permissions)."""
        # Check if updater has permission (owner only)
        updater_response = self.supabase.table("organization_users").select(
            "role"
        ).eq("user_id", str(updater_user_id)).eq(
            "organization_id", str(organization_id)
        ).execute()

        if not updater_response.data or updater_response.data[0]["role"] != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners can update user roles"
            )

        # Prevent owners from demoting themselves if they're the only owner
        if updater_user_id == target_user_id and new_role != "owner":
            owners_count = self.supabase.table("organization_users").select(
                "organization_user_id", count="exact"
            ).eq("organization_id", str(organization_id)).eq(
                "role", "owner"
            ).execute()

            if (owners_count.count or 0) <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove the last owner from organization"
                )

        try:
            response = self.supabase.table("organization_users").update({
                "role": new_role
            }).eq("user_id", str(target_user_id)).eq(
                "organization_id", str(organization_id)
            ).execute()

            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found in organization"
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user role: {e!s}"
            ) from e


# Dependency functions
async def get_multitenant_service(
    supabase: Client = Depends(get_supabase_client),
) -> MultitenantService:
    """Get multitenant service dependency."""
    return MultitenantService(supabase)


async def get_organization_context(
    organization_id: UUID | None = None,
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
) -> UUID:
    """
    Get organization context for the current request.
    
    If organization_id is provided, verifies user has access.
    If not provided, returns user's primary organization.
    """
    if organization_id:
        # Verify user has access to specified organization
        await multitenant_service.check_user_organization_access(
            current_user.id, organization_id
        )
        return organization_id
    else:
        # Return user's primary organization
        return await multitenant_service.get_user_primary_organization(current_user.id)


# Backward compatibility - alias to existing function
async def get_user_organization(
    current_user: User = Depends(get_current_active_user),
    multitenant_service: MultitenantService = Depends(get_multitenant_service),
) -> UUID:
    """Get the primary organization for the current user (backward compatibility)."""
    return await multitenant_service.get_user_primary_organization(current_user.id)
