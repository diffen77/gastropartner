"""Authentication API endpoints."""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client

from gastropartner.core.auth import AuthService, get_current_active_user, get_current_user
from gastropartner.core.database import get_supabase_admin_client, get_supabase_client
from gastropartner.core.models import (
    AuthResponse,
    MessageResponse,
    User,
    UserCreate,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength according to security requirements.

    Requirements:
    - At least 8 characters
    - Contains uppercase letter
    - Contains lowercase letter
    - Contains number
    - Contains special character

    Returns:
        tuple: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)'

    # Check for common weak patterns
    if password.lower() in ["password", "12345678", "qwerty123", "admin123"]:
        return False, "Password is too common and easily guessed"

    return True, "Password strength is acceptable"


class LoginRequest(BaseModel):
    """Login request model."""

    email: str
    password: str = Field(..., min_length=1, description="User password")


class RefreshRequest(BaseModel):
    """Token refresh request model."""

    refresh_token: str


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Register a new user account with email verification",
)
async def register(
    user_data: UserCreate,
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """
    Register new user.

    - **email**: Valid email address (will be verified)
    - **password**: Password (minimum 8 characters)
    - **full_name**: User's full name
    """
    try:
        auth_service = AuthService(supabase)
        result = await auth_service.register_user(
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
        )

        return MessageResponse(
            message=result["message"],
            success=True,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error",
        ) from e


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login user",
    description="Login with email and password to get access token",
)
async def login(
    login_data: LoginRequest,
    supabase: Client = Depends(get_supabase_client),
) -> AuthResponse:
    """
    Login user and return tokens.

    - **email**: Registered email address
    - **password**: User password
    """
    try:
        auth_service = AuthService(supabase)
        result = await auth_service.login_user(
            email=login_data.email,
            password=login_data.password,
        )

        # Convert user data to our User model
        user = User(
            id=result["user"].id,
            email=result["user"].email,
            full_name=result["user"].user_metadata.get("full_name", ""),
            created_at=result["user"].created_at,
            updated_at=result["user"].updated_at,
            email_confirmed_at=result["user"].email_confirmed_at,
            last_sign_in_at=result["user"].last_sign_in_at,
        )

        return AuthResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=user,
            expires_in=result["expires_in"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error",
        ) from e


@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Refresh access token",
    description="Refresh expired access token using refresh token",
)
async def refresh_token(
    refresh_data: RefreshRequest,
    supabase: Client = Depends(get_supabase_client),
) -> AuthResponse:
    """
    Refresh access token.

    - **refresh_token**: Valid refresh token
    """
    try:
        # Use Supabase token refresh
        auth_service = AuthService(supabase)
        result = await auth_service.refresh_token(refresh_data.refresh_token)

        # Convert to our AuthResponse format
        return AuthResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=result.get("user"),  # May not have user in refresh response
            expires_in=result["expires_in"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token refresh failed: {e}"
        ) from e


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout user",
    description="Logout current user and invalidate tokens",
)
async def logout(
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """
    Logout current user.

    Invalidates the current session.
    """
    auth_service = AuthService(supabase)
    result = await auth_service.logout_user()
    return MessageResponse(
        message=result["message"],
        success=True,
    )


@router.get(
    "/me",
    response_model=User,
    summary="Get current user",
    description="Get current authenticated user information",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current user information.

    Returns the currently authenticated user's profile.
    """
    return current_user


@router.put(
    "/me",
    response_model=User,
    summary="Update current user",
    description="Update current user's profile information",
)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> User:
    """
    Update current user's profile.

    - **full_name**: Updated full name (optional)
    """
    try:
        # Update user metadata in Supabase
        update_data = {}
        if user_update.full_name is not None:
            update_data["full_name"] = user_update.full_name

        if update_data:
            response = supabase.auth.update_user({"data": update_data})
            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to update user profile",
                )

            # Return updated user
            return User(
                id=response.user.id,
                email=response.user.email,
                full_name=response.user.user_metadata.get("full_name", ""),
                created_at=response.user.created_at,
                updated_at=response.user.updated_at,
                email_confirmed_at=response.user.email_confirmed_at,
                last_sign_in_at=response.user.last_sign_in_at,
            )

        # No changes requested, return current user
        return current_user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile",
        ) from e


@router.get(
    "/status",
    response_model=dict,
    summary="Authentication status",
    description="Check authentication system status and configuration",
)
async def auth_status(
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Get authentication system status.

    Returns information about the authentication configuration.
    """
    from gastropartner.core.database import test_connection

    db_status = await test_connection()

    return {
        "auth_system": "Supabase",
        "database_status": db_status["status"],
        "features": [
            "email_registration",
            "email_confirmation",
            "password_login",
            "token_refresh",
            "profile_update",
        ],
        "multitenant": True,
    }


@router.post(
    "/dev-login",
    response_model=AuthResponse,
    summary="Development login (bypasses email confirmation)",
    description="Development-only login that bypasses email confirmation requirement",
)
async def dev_login(
    login_data: LoginRequest,
    supabase: Client = Depends(get_supabase_client),
) -> AuthResponse:
    """
    Development login that bypasses email confirmation.

    ⚠️ FOR DEVELOPMENT ONLY - bypasses email confirmation requirement

    - **email**: Registered email address
    - **password**: User password
    """
    # 🛡️ SECURITY: Only allow in development environment
    from gastropartner.utils.logger import is_development

    if not is_development():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development endpoint not available in production environment",
        )

    try:
        auth_service = AuthService(supabase)

        # First try normal login to see if already confirmed
        try:
            result = await auth_service.login_user(
                email=login_data.email,
                password=login_data.password,
            )

            # Convert user data to our User model
            user = User(
                id=result["user"].id,
                email=result["user"].email,
                full_name=result["user"].user_metadata.get("full_name", ""),
                created_at=result["user"].created_at,
                updated_at=result["user"].updated_at,
                email_confirmed_at=result["user"].email_confirmed_at,
                last_sign_in_at=result["user"].last_sign_in_at,
            )

            return AuthResponse(
                access_token=result["access_token"],
                refresh_token=result["refresh_token"],
                user=user,
                expires_in=result["expires_in"],
            )

        except HTTPException as e:
            # If login fails due to unconfirmed email, force confirm it
            if "not confirmed" in str(e.detail).lower():
                # Get admin client to confirm email
                admin_client = get_supabase_admin_client()

                # Find user by email using SQL query to avoid schema confusion
                users_response = admin_client.rpc(
                    "get_auth_user_by_email", {"email_param": login_data.email}
                ).execute()

                # Fallback if RPC doesn't exist - use PostgREST with proper schema specification
                if not users_response.data:
                    users_response = (
                        admin_client.table("users")  # Try public.users instead
                        .select("*")
                        .eq("email", login_data.email)
                        .execute()
                    )

                if users_response.data:
                    user_id = users_response.data[0]["id"]

                    # Confirm email using database function
                    confirm_response = admin_client.rpc(
                        "confirm_auth_user_email", {"user_id_param": user_id}
                    ).execute()

                    # Check if email confirmation was successful
                    if not confirm_response.data:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to confirm email address",
                        ) from None

                    # Now try login again
                    result = await auth_service.login_user(
                        email=login_data.email,
                        password=login_data.password,
                    )

                    # Convert user data to our User model
                    user = User(
                        id=result["user"].id,
                        email=result["user"].email,
                        full_name=result["user"].user_metadata.get("full_name", ""),
                        created_at=result["user"].created_at,
                        updated_at=result["user"].updated_at,
                        email_confirmed_at=result["user"].email_confirmed_at,
                        last_sign_in_at=result["user"].last_sign_in_at,
                    )

                    return AuthResponse(
                        access_token=result["access_token"],
                        refresh_token=result["refresh_token"],
                        user=user,
                        expires_in=result["expires_in"],
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found",
                    ) from None
            else:
                # Re-raise other login errors
                raise

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Development login failed: {e}",
        ) from e
