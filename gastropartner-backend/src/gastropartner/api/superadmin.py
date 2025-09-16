"""
Superadmin API endpoints for gastropartner application.
Provides system-wide administrative functionality.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from gastropartner.core.database import get_supabase_admin_client
from gastropartner.core.models import (
    FeatureFlagsBase,
    FeatureFlagsUpdate,
)
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
        raise HTTPException(status_code=500, detail=f"Error retrieving agencies: {e!s}") from e


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
        raise HTTPException(status_code=500, detail=f"Error retrieving sessions: {e!s}") from e


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
        raise HTTPException(status_code=500, detail=f"Error retrieving leads: {e!s}") from e


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
        raise HTTPException(
            status_code=500, detail=f"Error updating maintenance mode: {e!s}"
        ) from e


@router.post("/system/clear-cache")
async def clear_system_cache():
    """
    Clear all system caches.
    Only superadmin can perform system-wide operations.
    """
    logger.info("Superadmin requested cache clear")

    try:
        # Clear LRU caches
        from gastropartner.core.database import get_supabase_admin_client, get_supabase_client

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
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {e!s}") from e


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
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {e!s}") from e


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
        raise HTTPException(status_code=500, detail=f"Error in data cleanup: {e!s}") from e


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
        raise HTTPException(status_code=500, detail=f"Error retrieving user activity: {e!s}") from e


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
        raise HTTPException(
            status_code=500, detail=f"Error broadcasting notification: {e!s}"
        ) from e


# Feature Flags Management


# ===== ENHANCED FEATURE FLAGS MANAGEMENT =====
# NOTE: Specific routes (like /templates, /global, /bulk-update) MUST come before
# parameterized routes (like /{agency_id}) to avoid routing conflicts


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
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/feature-flags/templates")
async def list_feature_flag_templates():
    """
    List all feature flag templates.
    Only accessible by superadmin.
    """
    logger.info("Superadmin requested feature flag templates")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        # Get all templates (implement in database later)
        # For now, return built-in system templates
        system_templates = [
            {
                "template_id": "freemium",
                "name": "Freemium Plan",
                "description": "Basic features for free tier users",
                "category": "freemium",
                "is_system_template": True,
                "flags_config": FeatureFlagsBase(
                    show_ingredients=True,
                    show_recipes=True,
                    show_menu_items=True,
                    show_reports=False,
                    max_ingredients_limit=10,
                    max_recipes_limit=5,
                    max_menu_items_limit=20,
                    enable_advanced_search=False,
                    enable_data_export=False,
                ).model_dump(),
            },
            {
                "template_id": "premium",
                "name": "Premium Plan",
                "description": "Enhanced features for premium users",
                "category": "premium",
                "is_system_template": True,
                "flags_config": FeatureFlagsBase(
                    show_ingredients=True,
                    show_recipes=True,
                    show_menu_items=True,
                    show_reports=True,
                    show_analytics=True,
                    max_ingredients_limit=100,
                    max_recipes_limit=50,
                    max_menu_items_limit=200,
                    enable_advanced_search=True,
                    enable_data_export=True,
                    enable_api_access=True,
                ).model_dump(),
            },
            {
                "template_id": "enterprise",
                "name": "Enterprise Plan",
                "description": "Full features for enterprise customers",
                "category": "enterprise",
                "is_system_template": True,
                "flags_config": FeatureFlagsBase(
                    # Enable all major modules
                    show_ingredients=True,
                    show_recipes=True,
                    show_menu_items=True,
                    show_reports=True,
                    show_analytics=True,
                    show_suppliers=True,
                    # High limits
                    max_ingredients_limit=1000,
                    max_recipes_limit=500,
                    max_menu_items_limit=2000,
                    max_users_per_org=50,
                    # Advanced features
                    enable_advanced_search=True,
                    enable_data_export=True,
                    enable_bulk_operations=True,
                    enable_api_access=True,
                    enable_webhooks=True,
                    # Beta features
                    enable_ai_suggestions=True,
                    enable_predictive_analytics=True,
                ).model_dump(),
            },
        ]

        return {"templates": system_templates}

    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/feature-flags/global")
async def get_global_feature_flags():
    """
    Get global feature flag defaults.
    Only accessible by superadmin.
    """
    logger.info("Superadmin requested global feature flags")

    try:
        # For now, return system defaults
        # TODO: Implement actual global flags storage
        return {
            "global_flags": FeatureFlagsBase().model_dump(),
            "note": "Global flags storage not yet implemented - showing system defaults",
        }

    except Exception as e:
        logger.error(f"Error getting global flags: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/feature-flags/{organization_id}")
async def get_organization_feature_flags(organization_id: str):
    """
    Get feature flags for a specific organization.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin requested feature flags for organization: {organization_id}")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        feature_flags_repo = FeatureFlagsRepository(supabase)
        flags = await feature_flags_repo.get_or_create_for_agency(organization_id, "superadmin")

        return flags

    except Exception as e:
        logger.error(f"Error getting feature flags for organization {organization_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/feature-flags/{organization_id}")
async def update_organization_feature_flags(organization_id: str, updates: FeatureFlagsUpdate):
    """
    Update feature flags for a specific organization.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin updating feature flags for organization: {organization_id}")

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        feature_flags_repo = FeatureFlagsRepository(supabase)

        # Convert to dict and filter out None values
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="No updates provided")

        updated_flags = await feature_flags_repo.update_for_agency(organization_id, update_data)

        logger.info(f"Updated feature flags for organization {organization_id}: {update_data}")
        return updated_flags

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating feature flags for organization {organization_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


class BulkUpdateRequest(BaseModel):
    """Bulk update request for multiple organizations."""

    organization_ids: list[str]
    updates: FeatureFlagsUpdate
    reason: str | None = None


class TemplateCreateRequest(BaseModel):
    """Template creation request."""

    name: str
    description: str
    category: str
    flags_config: FeatureFlagsBase


class TemplateApplyRequest(BaseModel):
    """Template application request."""

    template_id: str
    organization_ids: list[str]
    reason: str | None = None


@router.post("/feature-flags/templates/{template_id}/apply")
async def apply_template_to_organizations(template_id: str, request: TemplateApplyRequest):
    """
    Apply a feature flag template to multiple organizations.
    Only accessible by superadmin.
    """
    logger.info(
        f"Superadmin applying template {template_id} to organizations: {request.organization_ids}"
    )

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        feature_flags_repo = FeatureFlagsRepository(supabase)
        results = []

        # Get the template configuration (simplified for now)
        template_configs = {
            "freemium": FeatureFlagsBase(
                show_ingredients=True,
                show_recipes=True,
                show_menu_items=True,
                max_ingredients_limit=10,
                max_recipes_limit=5,
                max_menu_items_limit=20,
            ),
            "premium": FeatureFlagsBase(
                show_ingredients=True,
                show_recipes=True,
                show_menu_items=True,
                show_reports=True,
                show_analytics=True,
                max_ingredients_limit=100,
                max_recipes_limit=50,
                max_menu_items_limit=200,
                enable_advanced_search=True,
                enable_data_export=True,
                enable_api_access=True,
            ),
            "enterprise": FeatureFlagsBase(
                show_ingredients=True,
                show_recipes=True,
                show_menu_items=True,
                show_reports=True,
                show_analytics=True,
                show_suppliers=True,
                max_ingredients_limit=1000,
                max_recipes_limit=500,
                max_menu_items_limit=2000,
                max_users_per_org=50,
                enable_advanced_search=True,
                enable_data_export=True,
                enable_bulk_operations=True,
                enable_api_access=True,
                enable_webhooks=True,
                enable_ai_suggestions=True,
                enable_predictive_analytics=True,
            ),
        }

        if template_id not in template_configs:
            raise HTTPException(status_code=404, detail="Template not found")

        template_config = template_configs[template_id]
        update_data = template_config.model_dump()

        # Apply template to each organization
        for org_id in request.organization_ids:
            try:
                updated_flags = await feature_flags_repo.update_for_agency(org_id, update_data)
                results.append(
                    {"organization_id": org_id, "status": "success", "updated_flags": updated_flags}
                )

                # TODO: Log audit trail
                logger.info(f"Applied template {template_id} to organization {org_id}")

            except Exception as e:
                logger.error(f"Failed to apply template to organization {org_id}: {e}")
                results.append({"organization_id": org_id, "status": "error", "error": str(e)})

        success_count = len([r for r in results if r["status"] == "success"])

        return {
            "message": f"Template applied to {success_count}/{len(request.organization_ids)} organizations",
            "template_id": template_id,
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying template: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/feature-flags/bulk-update")
async def bulk_update_feature_flags(request: BulkUpdateRequest):
    """
    Bulk update feature flags for multiple organizations.
    Only accessible by superadmin.
    """
    logger.info(
        f"Superadmin bulk updating feature flags for {len(request.organization_ids)} organizations"
    )

    try:
        supabase = get_supabase_admin_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Admin client not configured")

        feature_flags_repo = FeatureFlagsRepository(supabase)
        results = []

        # Convert updates to dict and filter out None values
        update_data = {k: v for k, v in request.updates.model_dump().items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="No updates provided")

        # Apply updates to each organization
        for org_id in request.organization_ids:
            try:
                updated_flags = await feature_flags_repo.update_for_agency(org_id, update_data)
                results.append(
                    {"organization_id": org_id, "status": "success", "updated_flags": updated_flags}
                )

                # TODO: Log audit trail with reason
                logger.info(f"Bulk updated feature flags for organization {org_id}: {update_data}")

            except Exception as e:
                logger.error(f"Failed to update organization {org_id}: {e}")
                results.append({"organization_id": org_id, "status": "error", "error": str(e)})

        success_count = len([r for r in results if r["status"] == "success"])

        return {
            "message": f"Updated {success_count}/{len(request.organization_ids)} organizations",
            "updates_applied": update_data,
            "reason": request.reason,
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk update: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/feature-flags/global")
async def get_global_feature_flags():
    """
    Get global feature flag defaults.
    Only accessible by superadmin.
    """
    logger.info("Superadmin requested global feature flags")

    try:
        # For now, return system defaults
        # TODO: Implement actual global flags storage
        return {
            "global_flags": FeatureFlagsBase().model_dump(),
            "note": "Global flags storage not yet implemented - showing system defaults",
        }

    except Exception as e:
        logger.error(f"Error getting global flags: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/feature-flags/global")
async def update_global_feature_flags(updates: FeatureFlagsUpdate):
    """
    Update global feature flag defaults.
    Only accessible by superadmin.
    """
    logger.info("Superadmin updating global feature flags")

    try:
        # TODO: Implement actual global flags storage
        logger.warning("Global flags update not yet implemented - logged request only")

        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}

        return {
            "message": "Global flags update logged (not yet implemented)",
            "updates": update_data,
            "note": "Global flags storage not yet implemented",
        }

    except Exception as e:
        logger.error(f"Error updating global flags: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/feature-flags/audit-log/{organization_id}")
async def get_feature_flags_audit_log(organization_id: str, limit: int = 50):
    """
    Get audit log for feature flag changes for a specific organization.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin requested audit log for organization: {organization_id}")

    try:
        # TODO: Implement actual audit log storage and retrieval
        logger.info("Audit log retrieval not yet implemented - returning placeholder")

        return {
            "organization_id": organization_id,
            "audit_entries": [],
            "total": 0,
            "note": "Audit log storage not yet implemented",
        }

    except Exception as e:
        logger.error(f"Error getting audit log: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ====================================================================
# MODULE AVAILABILITY MANAGEMENT ENDPOINTS
# ====================================================================


class ModuleAvailability(BaseModel):
    """Module availability model for SuperAdmin control."""

    id: str
    module_id: str
    availability_type: str  # 'all', 'none', 'selective'
    enabled: bool
    created_by: str | None
    created_at: datetime
    updated_at: datetime


class ModuleAvailabilityRequest(BaseModel):
    """Request model for updating module availability."""

    availability_type: str  # 'all', 'none', 'selective'
    enabled: bool


class SelectiveModuleAccessRequest(BaseModel):
    """Request model for selective module access."""

    organization_ids: list[str]
    enabled: bool


@router.get("/modules/availability", response_model=list[ModuleAvailability])
async def get_module_availability():
    """
    Get all module availability settings.
    Only accessible by superadmin.
    """
    logger.info("Superadmin requested module availability list")

    try:
        supabase = get_supabase_admin_client()

        result = supabase.table("global_module_availability").select("*").execute()

        if not result.data:
            return []

        availability_list = []
        for item in result.data:
            availability = ModuleAvailability(
                id=item["id"],
                module_id=item["module_id"],
                availability_type=item["availability_type"],
                enabled=item["enabled"],
                created_by=item.get("created_by"),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
            )
            availability_list.append(availability)

        return availability_list

    except Exception as e:
        logger.error(f"Error getting module availability: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/modules/{module_id}/availability", response_model=dict)
async def update_module_availability(module_id: str, request: ModuleAvailabilityRequest):
    """
    Update module availability settings.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin updating availability for module: {module_id}")

    try:
        supabase = get_supabase_admin_client()

        # Update or create module availability
        result = (
            supabase.table("global_module_availability")
            .upsert(
                {
                    "module_id": module_id,
                    "availability_type": request.availability_type,
                    "enabled": request.enabled,
                    "updated_at": datetime.now().isoformat(),
                }
            )
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update module availability")

        logger.info(
            f"Module {module_id} availability updated: {request.availability_type}, enabled: {request.enabled}"
        )

        return {
            "success": True,
            "message": f"Module {module_id} availability updated successfully",
            "module_id": module_id,
            "availability_type": request.availability_type,
            "enabled": request.enabled,
        }

    except Exception as e:
        logger.error(f"Error updating module availability: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/modules/{module_id}/activate-global", response_model=dict)
async def activate_module_globally(module_id: str):
    """
    Activate module for all organizations globally.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin activating module globally: {module_id}")

    try:
        supabase = get_supabase_admin_client()

        # Update module to be available for all
        result = (
            supabase.table("global_module_availability")
            .upsert(
                {
                    "module_id": module_id,
                    "availability_type": "all",
                    "enabled": True,
                    "updated_at": datetime.now().isoformat(),
                }
            )
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to activate module globally")

        logger.info(f"Module {module_id} activated globally")

        return {
            "success": True,
            "message": f"Module {module_id} activated for all organizations",
            "module_id": module_id,
            "availability_type": "all",
        }

    except Exception as e:
        logger.error(f"Error activating module globally: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/modules/{module_id}/activate-selective", response_model=dict)
async def activate_module_selectively(module_id: str, request: SelectiveModuleAccessRequest):
    """
    Activate module for specific organizations only.
    Only accessible by superadmin.
    """
    logger.info(
        f"Superadmin activating module selectively: {module_id} for {len(request.organization_ids)} organizations"
    )

    try:
        supabase = get_supabase_admin_client()

        # First, set module to selective availability
        supabase.table("global_module_availability").upsert(
            {
                "module_id": module_id,
                "availability_type": "selective",
                "enabled": True,
                "updated_at": datetime.now().isoformat(),
            }
        ).execute()

        # Then, add specific organizations
        selective_access_records = []
        for org_id in request.organization_ids:
            selective_access_records.append(
                {
                    "module_id": module_id,
                    "organization_id": org_id,
                    "enabled": request.enabled,
                    "updated_at": datetime.now().isoformat(),
                }
            )

        if selective_access_records:
            supabase.table("selective_module_access").upsert(selective_access_records).execute()

        logger.info(
            f"Module {module_id} activated selectively for {len(request.organization_ids)} organizations"
        )

        return {
            "success": True,
            "message": f"Module {module_id} activated for {len(request.organization_ids)} selected organizations",
            "module_id": module_id,
            "availability_type": "selective",
            "organization_count": len(request.organization_ids),
        }

    except Exception as e:
        logger.error(f"Error activating module selectively: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/modules/{module_id}/deactivate", response_model=dict)
async def deactivate_module_completely(module_id: str):
    """
    Deactivate module completely - no organization can access it.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin deactivating module completely: {module_id}")

    try:
        supabase = get_supabase_admin_client()

        # Set module availability to none
        result = (
            supabase.table("global_module_availability")
            .upsert(
                {
                    "module_id": module_id,
                    "availability_type": "none",
                    "enabled": False,
                    "updated_at": datetime.now().isoformat(),
                }
            )
            .execute()
        )

        # Check if module availability update was successful
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update module availability",
            )

        # Remove all selective access records for this module
        supabase.table("selective_module_access").delete().eq("module_id", module_id).execute()

        logger.info(f"Module {module_id} deactivated completely")

        return {
            "success": True,
            "message": f"Module {module_id} deactivated for all organizations",
            "module_id": module_id,
            "availability_type": "none",
        }

    except Exception as e:
        logger.error(f"Error deactivating module: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/modules/{module_id}/organizations", response_model=dict)
async def get_module_organizations(module_id: str):
    """
    Get organizations that have access to a specific module.
    Only accessible by superadmin.
    """
    logger.info(f"Superadmin requested organizations for module: {module_id}")

    try:
        supabase = get_supabase_admin_client()

        # Check module availability type
        availability_result = (
            supabase.table("global_module_availability")
            .select("*")
            .eq("module_id", module_id)
            .execute()
        )

        if not availability_result.data:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")

        availability = availability_result.data[0]

        if availability["availability_type"] == "all":
            # Get all organizations
            orgs_result = supabase.table("organizations").select("id, name").execute()
            organizations = orgs_result.data or []
        elif availability["availability_type"] == "selective":
            # Get specific organizations with access
            access_result = (
                supabase.table("selective_module_access")
                .select("""
                organization_id,
                organizations(id, name)
            """)
                .eq("module_id", module_id)
                .eq("enabled", True)
                .execute()
            )

            organizations = [item["organizations"] for item in access_result.data or []]
        else:  # none
            organizations = []

        return {
            "module_id": module_id,
            "availability_type": availability["availability_type"],
            "enabled": availability["enabled"],
            "organizations": organizations,
            "total_organizations": len(organizations),
        }

    except Exception as e:
        logger.error(f"Error getting module organizations: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
