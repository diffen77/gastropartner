"""Database module för Supabase integration."""

from functools import lru_cache
from typing import Any

import httpx
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from gastropartner.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase_client() -> Client:
    """
    Get cached Supabase client instance with proper HTTP client configuration.

    Returns:
        Configured Supabase client
    """
    # Configure HTTP client with proper timeout and SSL verification
    http_client = httpx.Client(
        timeout=httpx.Timeout(30.0),  # 30 second timeout
        verify=True,  # Enable SSL verification
        follow_redirects=True,
        limits=httpx.Limits(max_keepalive_connections=10, max_connections=100),
    )

    # Use new SyncClientOptions to avoid deprecation warnings
    options = SyncClientOptions(
        httpx_client=http_client,
        postgrest_client_timeout=30,  # 30 second timeout for PostgREST
        storage_client_timeout=20,  # 20 second timeout for Storage
        function_client_timeout=10,  # 10 second timeout for Functions
    )

    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_anon_key,
        options=options,
    )


def get_supabase_client_with_auth(user_id: str | None = None) -> Client:
    """
    Get Supabase client with user authentication context.

    Args:
        user_id: User ID to set context for (for development)

    Returns:
        Configured Supabase client with user context
    """
    # For ALL development users, use admin client to bypass RLS
    # Define development user IDs that should get admin access
    development_user_ids = {
        "12345678-1234-1234-1234-123456789012",  # dev@example.com
        "817df0a1-f7ee-4bb2-bffa-582d4c59115f",  # diffen@me.com
        "9fae3cfb-43f9-453a-8414-c56f85ac56ff",  # lediff@gmail.com
        "730c164b-cfbc-4851-ab2f-f8908a844f1f",  # lediff+11@gmail.com
    }

    if user_id in development_user_ids:
        admin_client = get_supabase_admin_client()
        if admin_client:
            return admin_client

    # Legacy: development users (UUID starts with 'd') - keeping for backwards compatibility
    if user_id and user_id.startswith("d"):
        admin_client = get_supabase_admin_client()
        if admin_client:
            return admin_client

    return get_supabase_client()


@lru_cache
def get_supabase_admin_client() -> Client | None:
    """
    Get cached Supabase admin client instance with proper HTTP client configuration.

    Returns:
        Configured Supabase admin client or None if service key not configured
    """
    if not settings.supabase_service_key:
        return None

    # Configure HTTP client with proper timeout and SSL verification for admin client
    http_client = httpx.Client(
        timeout=httpx.Timeout(60.0),  # Longer timeout for admin operations
        verify=True,  # Enable SSL verification
        follow_redirects=True,
        limits=httpx.Limits(max_keepalive_connections=5, max_connections=50),
    )

    # Use new SyncClientOptions to avoid deprecation warnings
    options = SyncClientOptions(
        httpx_client=http_client,
        postgrest_client_timeout=60,  # Longer timeout for admin operations
        storage_client_timeout=30,  # Longer timeout for admin storage operations
        function_client_timeout=20,  # Longer timeout for admin functions
    )

    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_service_key,
        options=options,
    )


async def test_connection() -> dict[str, Any]:
    """
    Test Supabase connection.

    Returns:
        Connection status and info
    """
    try:
        client = get_supabase_client()
        # Simple query to test connection
        client.table("auth.users").select("*").limit(1).execute()
        return {
            "status": "connected",
            "url": settings.supabase_url,
            "has_admin": settings.supabase_service_key is not None,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "url": settings.supabase_url,
        }
