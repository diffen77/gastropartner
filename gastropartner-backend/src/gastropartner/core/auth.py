"""Authentication utilities för Supabase integration."""

import hashlib
import jwt
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Using general exception handling for Supabase errors
from supabase import Client

from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import User

security = HTTPBearer()


def _decode_development_jwt_token(token: str) -> dict:
    """
    Decode development JWT token to extract claims.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid
    """
    try:
        # Use same secret as in create_development_jwt_token
        secret = "development-secret-key"
        
        # Decode JWT token with minimal verification for development
        payload = jwt.decode(
            token, 
            secret, 
            algorithms=["HS256"],
            options={
                "verify_aud": False,  # Skip audience verification for dev
                "verify_iss": False,  # Skip issuer verification for dev
            }
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Development token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid development token: {e}"
        )


def _generate_deterministic_dev_user_id(email: str) -> str:
    """
    Generate a deterministic but unique user ID for development users.
    
    🛡️ SECURITY: Each development email gets a unique user ID to ensure
    complete data isolation between development users.
    
    Args:
        email: Development user email
        
    Returns:
        Unique UUID (deterministic based on email)
    """
    # Create deterministic hash of email for consistency
    email_hash = hashlib.sha256(f"dev_user_{email}".encode()).hexdigest()
    # Format as proper UUID - use 'd' instead of standard version bits for dev identification
    return f"d{email_hash[1:8]}-{email_hash[8:12]}-{email_hash[12:16]}-{email_hash[16:20]}-{email_hash[20:32]}"


def _generate_deterministic_dev_org_id(email: str) -> str:
    """
    Generate a deterministic but unique organization ID for development users.
    
    🛡️ SECURITY: Each development email gets a unique organization to ensure
    complete data isolation between development users.
    
    Args:
        email: Development user email
        
    Returns:
        Unique organization UUID for the development user
    """
    # Create deterministic hash of email for consistency
    email_hash = hashlib.sha256(f"dev_org_{email}".encode()).hexdigest()
    # Format as proper UUID string
    return f"{email_hash[:8]}-{email_hash[8:12]}-{email_hash[12:16]}-{email_hash[16:20]}-{email_hash[20:32]}"


async def _ensure_development_organization_exists(
    current_user: User, 
    org_id: str, 
    supabase: Client
) -> None:
    """
    Ensure development organization and organization_users entry exist in database.
    
    🛡️ SECURITY: This creates isolated development organizations to enable RLS policies
    while maintaining complete data isolation between development users.
    
    Args:
        current_user: Development user
        org_id: Development organization UUID
        supabase: Supabase client
    """
    try:
        # Use admin client for development organization operations to bypass RLS
        from gastropartner.core.database import get_supabase_client_with_auth
        admin_supabase = get_supabase_client_with_auth(str(current_user.id))
        
        # Check if organization already exists
        org_response = admin_supabase.table("organizations").select("organization_id").eq(
            "organization_id", org_id
        ).execute()
        
        if not org_response.data:
            # Generate slug for development organization
            email_safe = current_user.email.replace("@", "-at-").replace(".", "-")
            slug = f"dev-org-{email_safe}"[:50]
            
            # Create development organization (owner_id can be null for dev orgs)
            org_insert = admin_supabase.table("organizations").insert({
                "organization_id": org_id,
                "name": f"Dev Organization ({current_user.email})",
                "slug": slug,
                "description": f"Development organization for {current_user.email}",
                # Don't set owner_id for development users since they don't exist in auth.users
                # owner_id will be NULL, which should be allowed for development
                "max_ingredients": 1000,  # Give dev users high limits for testing
                "max_recipes": 1000, 
                "max_menu_items": 1000,
                "current_ingredients": 0,
                "current_recipes": 0,
                "current_menu_items": 0
            }).execute()
            
            if not org_insert.data:
                # Organization creation failed, but don't block - log and continue
                print(f"Warning: Failed to create dev organization for {current_user.email}")
        
        # Check if organization_users entry exists
        org_user_response = admin_supabase.table("organization_users").select("user_id").eq(
            "user_id", str(current_user.id)
        ).eq("organization_id", org_id).execute()
        
        if not org_user_response.data:
            # Create organization_users entry
            org_user_insert = admin_supabase.table("organization_users").insert({
                "user_id": str(current_user.id),
                "organization_id": org_id,
                "role": "owner"
            }).execute()
            
            if not org_user_insert.data:
                # Organization user creation failed, but don't block - log and continue
                print(f"Warning: Failed to create org_user entry for {current_user.email}")
                
    except Exception as e:
        # Don't block authentication on database errors, just log
        print(f"Warning: Failed to ensure dev organization exists for {current_user.email}: {e}")
        # Continue without raising exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> User:
    """
    Get current authenticated user from JWT token or development token.
    
    Args:
        credentials: HTTP authorization credentials (JWT token or dev token)
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

    token = credentials.credentials

    # Development mode: handle both old dev tokens and new JWT tokens
    if token.startswith("dev_token_"):
        # Handle old simple dev tokens (legacy support)
        email_part = token.replace("dev_token_", "").replace("_", "@", 1).replace("_", ".")

        # 🛡️ SECURITY FIX: Look up ACTUAL user ID from auth.users table
        try:
            response = supabase.rpc('get_auth_user_by_email', {'user_email': email_part}).execute()
            
            if response.data and len(response.data) > 0:
                user_data = response.data[0]
                return User(
                    id=user_data["id"],
                    email=user_data["email"], 
                    full_name=user_data.get("raw_user_meta_data", {}).get("full_name", f"Dev User ({email_part})") if user_data.get("raw_user_meta_data") else f"Dev User ({email_part})",
                    created_at=user_data.get("created_at", "2024-01-01T00:00:00Z"),
                    updated_at=user_data.get("updated_at", "2024-01-01T00:00:00Z"),
                    email_confirmed_at=user_data.get("email_confirmed_at", "2024-01-01T00:00:00Z"),
                    last_sign_in_at=user_data.get("last_sign_in_at", "2024-01-01T00:00:00Z"),
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Development user {email_part} not found in auth.users table",
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Development authentication failed: {e}",
            ) from e
    
    # Check if this is a development JWT token (contains development claims)
    try:
        # Try to decode as JWT - if it works and has development claims, handle accordingly
        payload = _decode_development_jwt_token(token)
        if payload.get("app_metadata", {}).get("provider") == "development":
            # This is a development JWT token - return user from JWT claims
            return User(
                id=payload["sub"],
                email=payload["email"],
                full_name=payload.get("user_metadata", {}).get("full_name", f"Dev User ({payload['email']})"),
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z", 
                email_confirmed_at="2024-01-01T00:00:00Z",
                last_sign_in_at="2024-01-01T00:00:00Z",
            )
    except:
        # If JWT decode fails, continue to try Supabase verification
        pass

    try:
        # Production mode: Verify JWT token with Supabase
        response = supabase.auth.get_user(token)
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
    # TODO: Re-enable email confirmation in production
    # For development, skip email confirmation requirement
    # if not current_user.email_confirmed_at:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Email not confirmed. Please check your email for confirmation link.",
    #     )

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


def extract_organization_id_from_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str | None:
    """
    Extract organization_id from JWT token for use in RLS policies.
    
    This function is used by Supabase RLS policies to get the organization_id
    from the JWT token without requiring database lookups.
    
    Args:
        credentials: HTTP authorization credentials (JWT token)
        
    Returns:
        Organization ID from JWT claims, or None if not found
    """
    if not credentials:
        return None
        
    token = credentials.credentials
    
    try:
        # Try to decode development JWT tokens
        payload = _decode_development_jwt_token(token)
        if payload.get("app_metadata", {}).get("provider") == "development":
            return payload.get("organization_id")
    except:
        # If development JWT decode fails, try production Supabase JWT
        pass
    
    # For production Supabase JWTs, organization_id should be in custom claims
    # This would be set during user creation/organization assignment
    try:
        # Note: For production, you'd need the proper Supabase JWT secret
        # For now, return None and rely on database lookup
        return None
    except:
        return None


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
        # Get authenticated client for development users to bypass RLS
        from gastropartner.core.database import get_supabase_client_with_auth
        auth_supabase = get_supabase_client_with_auth(str(current_user.id))
        
        # Get user's organization memberships (works for both dev and production users)
        response = auth_supabase.table("organization_users").select(
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
