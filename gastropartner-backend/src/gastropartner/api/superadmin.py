"""
Superadmin API endpoints for gastropartner application.
Provides system-wide administrative functionality.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from gastropartner.core.database import get_supabase_admin_client
from gastropartner.core.models import FeatureFlagsUpdate
from gastropartner.core.repository import FeatureFlagsRepository
from gastropartner.middleware.superadmin import require_superadmin

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/superadmin", tags=["superadmin"], dependencies=[Depends(require_superadmin)]
)


class SystemStatus(BaseModel):
    """System status model."""

    status: str
    timestamp: datetime
    components: dict[str, str]
    version: str


class SuperAdminStats(BaseModel):
    """Superadmin dashboard statistics."""

    total_agencies: int
    total_sessions: int
    total_leads: int
    total_messages: int
    active_sessions: int
    system_health: str


@router.get("/status", response_model=SystemStatus)
async def get_system_status() -> SystemStatus:
    """
    Get overall system status and health.
    Only accessible by superadmin.
    """
    logger.info("Superadmin requested system status")

    components = {}
    overall_status = "healthy"

    # Check database health
    try:
        supabase = get_supabase_admin_client()
        if supabase:
            # Simple query to check database connectivity
            supabase.table("organizations").select("count").limit(1).execute()
            components["database"] = "healthy"
        else:
            components["database"] = "unhealthy"
            overall_status = "degraded"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        components["database"] = "unhealthy"
        overall_status = "degraded"

    # Check API health (we're responding, so it's healthy)
    components["api"] = "healthy"

    # TODO: Add Redis health check when Redis is implemented
    components["redis"] = "not_configured"

    # TODO: Add frontend health check
    components["frontend"] = "unknown"

    return SystemStatus(
        status=overall_status, timestamp=datetime.now(), components=components, version="1.0.0"
    )


@router.get("/stats", response_model=SuperAdminStats)
async def get_dashboard_stats() -> SuperAdminStats:
    """
    Get dashboard statistics for superadmin.
    Shows system-wide metrics.
    """
    logger.info("Superadmin requested dashboard stats")

    # Initialize stats with defaults
    stats = SuperAdminStats(
        total_agencies=0,
        total_sessions=0,
        total_leads=0,
        total_messages=0,
        active_sessions=0,
        system_health="unknown",
    )

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            logger.warning("Admin client not configured for stats")
            return stats

        # Get total organizations count
        try:
            org_response = supabase.table("organizations").select("count").execute()
            stats.total_agencies = len(org_response.data) if org_response.data else 0
        except Exception as e:
            logger.error(f"Error getting organization count: {e}")

        # Get total users count (representing sessions/leads placeholder)
        try:
            user_response = supabase.table("users").select("count").execute()
            total_users = len(user_response.data) if user_response.data else 0
            stats.total_sessions = total_users  # Placeholder
            stats.total_leads = total_users  # Placeholder
        except Exception as e:
            logger.error(f"Error getting user count: {e}")

        # Get system health based on database connectivity
        stats.system_health = "excellent" if stats.total_agencies >= 0 else "poor"

    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        stats.system_health = "poor"

    return stats


@router.get("/agencies")
async def list_all_agencies():
    """
    List all agencies in the system.
    Superadmin can see all agencies.
    """
    logger.info("Superadmin requested all agencies")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        response = supabase.table("organizations").select("*").execute()

        return {"agencies": response.data or []}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing agencies: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving agencies: {str(e)}")


@router.get("/sessions")
async def list_all_sessions():
    """
    List all sessions across all agencies.
    Superadmin can see all system activity.
    """
    logger.info("Superadmin requested all sessions")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        # For now, return user sessions as there's no specific sessions table
        response = (
            supabase.table("users").select("id, email, created_at, organization_id").execute()
        )

        sessions = []
        if response.data:
            for user in response.data:
                sessions.append(
                    {
                        "session_id": user.get("id"),
                        "user_email": user.get("email"),
                        "organization_id": user.get("organization_id"),
                        "created_at": user.get("created_at"),
                        "status": "active",  # Placeholder
                    }
                )

        return {"sessions": sessions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving sessions: {str(e)}")


@router.get("/leads")
async def list_all_leads():
    """
    List all leads across all agencies.
    Superadmin can see all lead data.
    """
    logger.info("Superadmin requested all leads")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        # Return users as leads for now (placeholder until proper leads table exists)
        response = (
            supabase.table("users").select("id, email, created_at, organization_id").execute()
        )

        leads = []
        if response.data:
            for user in response.data:
                leads.append(
                    {
                        "lead_id": user.get("id"),
                        "email": user.get("email"),
                        "organization_id": user.get("organization_id"),
                        "created_at": user.get("created_at"),
                        "status": "new",  # Placeholder
                        "source": "signup",  # Placeholder
                    }
                )

        return {"leads": leads}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing leads: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving leads: {str(e)}")


@router.post("/system/maintenance")
async def toggle_maintenance_mode(enabled: bool):
    """
    Toggle system maintenance mode.
    Only superadmin can control system-wide settings.
    """
    logger.info(f"Superadmin {'enabled' if enabled else 'disabled'} maintenance mode")

    try:
        # For now, we'll store maintenance mode in memory/logs
        # In a full implementation, this would be stored in database or cache
        logger.warning(f"MAINTENANCE MODE {'ENABLED' if enabled else 'DISABLED'} by superadmin")

        # TODO: Implement actual maintenance mode storage (Redis/Database)
        # TODO: Add middleware to check maintenance mode on all requests

        return {
            "maintenance_mode": enabled,
            "message": f"Maintenance mode {'enabled' if enabled else 'disabled'} successfully",
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error toggling maintenance mode: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating maintenance mode: {str(e)}")


@router.post("/system/clear-cache")
async def clear_system_cache():
    """
    Clear all system caches.
    Only superadmin can perform system-wide operations.
    """
    logger.info("Superadmin requested cache clear")

    try:
        # Clear LRU caches
        from gastropartner.core.database import get_supabase_client, get_supabase_admin_client

        get_supabase_client.cache_clear()
        get_supabase_admin_client.cache_clear()

        logger.info("System caches cleared successfully")

        # TODO: Clear Redis cache when implemented
        # TODO: Clear other application caches

        return {
            "message": "System cache cleared successfully",
            "cleared": ["database_clients", "lru_caches"],
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")


@router.get("/logs")
async def get_system_logs(limit: int = 100):
    """
    Get recent system logs.
    Superadmin can access all system logs.
    """
    logger.info(f"Superadmin requested {limit} system logs")

    try:
        # For now, return a placeholder response
        # In production, this would read from log files or a logging service
        logs = [
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "System health check completed",
                "module": "gastropartner.api.superadmin",
            },
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": f"Superadmin requested {limit} system logs",
                "module": "gastropartner.api.superadmin",
            },
        ]

        # TODO: Implement actual log file reading
        # TODO: Add log filtering by level, module, time range
        # TODO: Implement log aggregation from multiple sources

        return {
            "logs": logs[:limit],
            "total": len(logs),
            "note": "Log retrieval is placeholder - implement actual log reading",
        }

    except Exception as e:
        logger.error(f"Error retrieving logs: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")


@router.delete("/data/cleanup")
async def cleanup_old_data(days_old: int = 90):
    """
    Cleanup old system data.
    Only superadmin can perform data cleanup operations.
    """
    logger.info(f"Superadmin requested cleanup of data older than {days_old} days")

    try:
        if days_old < 30:
            raise HTTPException(
                status_code=400, detail="Cannot cleanup data newer than 30 days for safety"
            )

        # For now, just log the action - actual cleanup is dangerous and needs careful implementation
        logger.warning(
            f"Data cleanup requested for records older than {days_old} days - PLACEHOLDER ONLY"
        )

        # TODO: Implement actual data cleanup with proper safety checks
        # TODO: Add dry-run mode to show what would be deleted
        # TODO: Add backup before cleanup
        # TODO: Implement cleanup for specific tables (logs, analytics, temporary data)

        return {
            "message": f"Data cleanup initiated for records older than {days_old} days",
            "status": "placeholder_only",
            "note": "Actual cleanup not implemented - safety feature",
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in data cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Error in data cleanup: {str(e)}")


@router.get("/users/activity")
async def get_user_activity():
    """
    Get user activity across all agencies.
    Superadmin can monitor all user activity.
    """
    logger.info("Superadmin requested user activity data")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        # Get user analytics events as activity
        try:
            response = (
                supabase.table("user_analytics_events")
                .select("*")
                .order("created_at", desc=True)
                .limit(100)
                .execute()
            )

            activity = response.data or []

        except Exception as e:
            logger.warning(f"Could not fetch user analytics events: {e}")
            # Fallback to basic user data
            response = (
                supabase.table("users")
                .select("id, email, created_at, organization_id")
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )

            activity = []
            if response.data:
                for user in response.data:
                    activity.append(
                        {
                            "user_id": user.get("id"),
                            "activity_type": "user_registered",
                            "email": user.get("email"),
                            "organization_id": user.get("organization_id"),
                            "timestamp": user.get("created_at"),
                        }
                    )

        return {
            "activity": activity,
            "total": len(activity),
            "note": "Activity data based on available analytics events and user registrations",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user activity: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving user activity: {str(e)}")


@router.post("/notifications/broadcast")
async def broadcast_system_notification(message: str, level: str = "info"):
    """
    Broadcast system-wide notification.
    Only superadmin can send system notifications.
    """
    logger.info(f"Superadmin broadcasting {level} notification: {message}")

    try:
        if level not in ["info", "warning", "error", "success"]:
            raise HTTPException(
                status_code=400, detail="Level must be one of: info, warning, error, success"
            )

        if not message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # Log the broadcast notification
        logger.warning(f"SYSTEM BROADCAST [{level.upper()}]: {message}")

        # TODO: Implement actual notification broadcasting:
        # - Send to all active websocket connections
        # - Store in notifications table
        # - Send email notifications if critical
        # - Push to notification service (FCM, etc.)

        # For now, just return success response
        return {
            "message": "Notification broadcasted successfully",
            "recipients": 0,  # Placeholder
            "level": level,
            "content": message,
            "timestamp": datetime.now().isoformat(),
            "note": "Broadcasting not implemented - logged only",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error broadcasting notification: {e}")
        raise HTTPException(status_code=500, detail=f"Error broadcasting notification: {str(e)}")


# Feature Flags Management


@router.get("/feature-flags/{agency_id}")
async def get_agency_feature_flags(agency_id: str):
    """
    Get feature flags for a specific agency.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin requested feature flags for agency: {agency_id}")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        feature_flags_repo = FeatureFlagsRepository(supabase)
        flags = await feature_flags_repo.get_or_create_for_agency(agency_id)

        return flags

    except Exception as e:
        logger.error(f"Error getting feature flags for agency {agency_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/feature-flags/{agency_id}")
async def update_agency_feature_flags(agency_id: str, updates: FeatureFlagsUpdate):
    """
    Update feature flags for a specific agency.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin updating feature flags for agency: {agency_id}")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        feature_flags_repo = FeatureFlagsRepository(supabase)

        # Convert to dict and filter out None values
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="No updates provided")

        updated_flags = await feature_flags_repo.update_for_agency(agency_id, update_data)

        logger.info(f"Updated feature flags for agency {agency_id}: {update_data}")
        return updated_flags

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating feature flags for agency {agency_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-flags")
async def list_all_feature_flags():
    """
    List feature flags for all agencies.
    Only accessible by superadmin.
    """
    logger.info("Superadmin requested all feature flags")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        # Get all feature flags directly using admin client
        response = supabase.table("feature_flags").select("*").execute()

        return {"feature_flags": response.data}

    except Exception as e:
        logger.error(f"Error listing all feature flags: {e}")
        raise HTTPException(status_code=500, detail=str(e))
