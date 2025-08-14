"""Database module för Supabase integration."""

from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from gastropartner.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase_client() -> Client:
    """
    Get cached Supabase client instance.
    
    Returns:
        Configured Supabase client
    """
    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_anon_key,
    )


@lru_cache
def get_supabase_admin_client() -> Client | None:
    """
    Get cached Supabase admin client instance.
    
    Returns:
        Configured Supabase admin client or None if service key not configured
    """
    if not settings.supabase_service_key:
        return None

    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_service_key,
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
        response = client.table("auth.users").select("*").limit(1).execute()
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
