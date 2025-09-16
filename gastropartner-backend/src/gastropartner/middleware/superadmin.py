"""
Superadmin middleware for gastropartner application.
Provides access control for superadmin functionality.
"""

import logging
import os

import jwt
from fastapi import HTTPException, status
from fastapi.requests import Request
from fastapi.security import HTTPBearer

from gastropartner.core.database import get_supabase_client

logger = logging.getLogger(__name__)

security = HTTPBearer()


class SuperAdminMiddleware:
    """Middleware to verify superadmin access."""

    @staticmethod
    def verify_superadmin_access(token: str) -> bool:
        """
        Verify that the token belongs to a user with system_admin role.

        Args:
            token: JWT token to verify

        Returns:
            True if user has system_admin role, False otherwise
        """
        try:
            # Handle development tokens (only in development environment)
            if os.getenv("ENVIRONMENT") in ["development", "local"] and token.startswith(
                "dev_token_"
            ):
                email_part = token.replace("dev_token_", "").replace("_", "@", 1).replace("_", ".")
                superadmin_emails = os.getenv("SUPERADMIN_EMAILS", "").split(",")
                superadmin_emails = [
                    email.strip().lower() for email in superadmin_emails if email.strip()
                ]
                is_dev_admin = email_part.lower() in superadmin_emails
                logger.info(f"Development token for {email_part}: admin={is_dev_admin}")
                return is_dev_admin

            # Decode the token
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            user_email = payload.get("email")

            if not user_id:
                logger.warning("No user_id found in token")
                return False

            logger.info(f"Checking superadmin access for user_id: {user_id}, email: {user_email}")

            # Check against configured superadmin emails
            superadmin_emails = os.getenv("SUPERADMIN_EMAILS", "").split(",")
            superadmin_emails = [
                email.strip().lower() for email in superadmin_emails if email.strip()
            ]
            if user_email and user_email.lower() in superadmin_emails:
                logger.info(f"Configured superadmin {user_email} granted access")
                return True

            # Check user role in database
            supabase = get_supabase_client()
            if not supabase:
                logger.error("Failed to get Supabase client")
                return False

            try:
                # Check if user exists in users table first
                user_response = (
                    supabase.table("users")
                    .select("user_id, email")
                    .eq("user_id", user_id)
                    .execute()
                )

                if not user_response.data or len(user_response.data) == 0:
                    logger.warning(f"User {user_id} not found in users table")
                    return False

                # For now, since there's no role system in the database yet,
                # use email-based superadmin access
                # This is a temporary solution until proper role system is implemented
                logger.info(
                    f"User {user_id} found in database, checking configured superadmin emails"
                )

                if user_email and user_email.lower() in superadmin_emails:
                    logger.info(f"Configured superadmin {user_email} granted access")
                    return True
                else:
                    logger.info(f"User {user_email} not in configured superadmin list")
                    return False

            except Exception as db_error:
                logger.warning(
                    f"Database query failed: {db_error}, using configured email fallback"
                )
                # Fallback to email-based check if database fails
                if user_email and user_email.lower() in superadmin_emails:
                    logger.info(
                        f"Database fallback: granting access to configured superadmin {user_email}"
                    )
                    return True
                return False

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
                detail="Authorization header required for superadmin access",
            )

        # Extract token
        try:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() != "bearer":
                raise ValueError("Invalid scheme")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format",
            ) from None

        # Verify superadmin access
        if not SuperAdminMiddleware.verify_superadmin_access(token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required"
            )

        logger.info("Superadmin access granted")


async def require_superadmin(request: Request) -> None:
    """Dependency function for superadmin access control."""
    await SuperAdminMiddleware.require_superadmin(request)
