"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from supabase import Client

from gastropartner.core.auth import AuthService, get_current_active_user, get_current_user
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import (
    AuthResponse,
    MessageResponse,
    User,
    UserCreate,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    """Login request model."""

    email: EmailStr
    password: str = Field(..., min_length=8)


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
    response_model=dict,
    summary="Refresh access token",
    description="Refresh expired access token using refresh token",
)
async def refresh_token(
    refresh_data: RefreshRequest,
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Refresh access token.
    
    - **refresh_token**: Valid refresh token
    """
    auth_service = AuthService(supabase)
    return await auth_service.refresh_token(refresh_data.refresh_token)


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
