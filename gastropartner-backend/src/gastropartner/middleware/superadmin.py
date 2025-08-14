"""
Superadmin middleware for gastropartner application.
Provides access control for superadmin functionality.
"""

import logging

import jwt
from fastapi import HTTPException, status
from fastapi.requests import Request
from fastapi.security import HTTPBearer

logger = logging.getLogger(__name__)

# Superadmin email - only this user can access superadmin functionality
SUPERADMIN_EMAIL = "diffen@me.com"

security = HTTPBearer()


class SuperAdminMiddleware:
    """Middleware to verify superadmin access."""

    @staticmethod
    def verify_superadmin_access(token: str) -> bool:
        """
        Verify that the token belongs to the superadmin user.
        
        Args:
            token: JWT token to verify
            
        Returns:
            True if user is superadmin, False otherwise
        """
        try:
            # Decode the token (you'll need to adjust this based on your JWT implementation)
            # For now, this is a placeholder - you'll need to implement proper JWT verification
            payload = jwt.decode(token, options={"verify_signature": False})
            email = payload.get("email", "").lower()

            logger.info(f"Checking superadmin access for email: {email}")

            return email == SUPERADMIN_EMAIL.lower()

        except Exception as e:
            logger.warning(f"Failed to verify superadmin token: {e}")
            return False

    @staticmethod
    async def require_superadmin(request: Request) -> None:
        """
        Dependency to require superadmin access.
        
        Args:
            request: FastAPI request object
            
        Raises:
            HTTPException: If user is not superadmin
        """
        # Get authorization header
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required for superadmin access"
            )

        # Extract token
        try:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() != "bearer":
                raise ValueError("Invalid scheme")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format"
            )

        # Verify superadmin access
        if not SuperAdminMiddleware.verify_superadmin_access(token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superadmin access required"
            )

        logger.info("Superadmin access granted")


async def require_superadmin(request: Request) -> None:
    """Dependency function for superadmin access control."""
    await SuperAdminMiddleware.require_superadmin(request)
