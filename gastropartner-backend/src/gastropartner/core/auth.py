"""Authentication utilities för Supabase integration."""

from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Using general exception handling for Supabase errors
from supabase import Client

from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP authorization credentials (JWT token)
        supabase: Supabase client
        
    Returns:
        Current user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    try:
        # Verify JWT token with Supabase
        response = supabase.auth.get_user(credentials.credentials)
        user_data = response.user

        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        # Convert to our User model
        user = User(
            id=user_data.id,
            email=user_data.email,
            full_name=user_data.user_metadata.get("full_name", ""),
            created_at=user_data.created_at,
            updated_at=user_data.updated_at,
            email_confirmed_at=user_data.email_confirmed_at,
            last_sign_in_at=user_data.last_sign_in_at,
        )

        return user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {e!s}",
        ) from e


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user (email confirmed).
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current active user
        
    Raises:
        HTTPException: If user email is not confirmed
    """
    if not current_user.email_confirmed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not confirmed. Please check your email for confirmation link.",
        )

    return current_user


class AuthService:
    """Authentication service för Supabase operations."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def register_user(self, email: str, password: str, full_name: str) -> dict[str, Any]:
        """
        Register new user with Supabase Auth.
        
        Args:
            email: User email
            password: User password
            full_name: User full name
            
        Returns:
            Registration response
            
        Raises:
            HTTPException: If registration fails
        """
        try:
            response = self.supabase.auth.sign_up(
                {
                    "email": email,
                    "password": password,
                    "options": {
                        "data": {
                            "full_name": full_name,
                        }
                    },
                }
            )

            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User registration failed",
                )

            return {
                "user": response.user,
                "session": response.session,
                "message": "User registered successfully. Please check your email for confirmation.",
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration error: {e!s}",
            ) from e

    async def login_user(self, email: str, password: str) -> dict[str, Any]:
        """
        Login user with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Login response with tokens
            
        Raises:
            HTTPException: If login fails
        """
        try:
            response = self.supabase.auth.sign_in_with_password(
                {"email": email, "password": password}
            )

            if not response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password",
                )

            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in,
                "user": response.user,
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login error: {e!s}",
            ) from e

    async def refresh_token(self, refresh_token: str) -> dict[str, Any]:
        """
        Refresh access token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New tokens
            
        Raises:
            HTTPException: If refresh fails
        """
        try:
            response = self.supabase.auth.refresh_session(refresh_token)

            if not response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token",
                )

            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in,
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token refresh error: {e!s}",
            ) from e

    async def logout_user(self) -> dict[str, str]:
        """
        Logout current user.
        
        Returns:
            Logout confirmation
        """
        try:
            self.supabase.auth.sign_out()
            return {"message": "Logged out successfully"}
        except Exception as e:
            # Don't raise exception on logout - just log it
            return {"message": "Logged out (with warnings)", "warning": str(e)}


async def get_user_organization(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> UUID:
    """
    Get the primary organization for the current user.
    
    For MVP, we assume each user belongs to exactly one organization.
    In the future, this could be extended to support multi-organization users.
    
    Args:
        current_user: Current authenticated user
        supabase: Supabase client
        
    Returns:
        Organization UUID
        
    Raises:
        HTTPException: If user has no organization or multiple organizations
    """
    try:
        # Get user's organization memberships
        response = supabase.table("organization_users").select(
            "organization_id"
        ).eq("user_id", str(current_user.id)).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not a member of any organization. Please create or join an organization first."
            )

        # For MVP: assume user belongs to exactly one organization
        if len(response.data) > 1:
            # In future versions, this could be handled with organization selection
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User belongs to multiple organizations. Please specify organization_id in the request."
            )

        organization_id = response.data[0]["organization_id"]
        return UUID(organization_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user organization: {e!s}"
        ) from e
