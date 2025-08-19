"""Analytics service for tracking usage and conversion metrics."""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from supabase import Client

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for tracking freemium usage and conversion analytics."""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self._table_missing_logged = False  # Track if we already logged table missing error

    async def track_event(
        self,
        organization_id: UUID,
        user_id: UUID | None,
        event_type: str,
        event_name: str,
        properties: dict[str, Any] | None = None,
        page_url: str | None = None,
        session_id: str | None = None,
        user_agent: str | None = None,
    ) -> bool:
        """
        Track a user analytics event.
        
        Args:
            organization_id: The organization ID
            user_id: User ID (can be None for anonymous events)
            event_type: Type of event (e.g., 'feature_usage', 'limit_hit', 'upgrade_prompt')
            event_name: Specific event name (e.g., 'ingredient_created', 'recipe_limit_reached')
            properties: Additional event properties
            page_url: URL where event occurred
            session_id: Session identifier
            user_agent: User agent string
        
        Returns:
            True if event was tracked successfully
        """
        try:
            event_data = {
                "organization_id": str(organization_id),
                "user_id": str(user_id) if user_id else None,
                "event_type": event_type,
                "event_name": event_name,
                "page_url": page_url,
                "session_id": session_id,
                "user_agent": user_agent,
                "properties": properties or {},
                "created_at": datetime.now(UTC).isoformat(),
            }

            response = self.supabase.table("user_analytics_events").insert(event_data).execute()
            return True

        except Exception as e:
            # Handle specific case of missing table to reduce log spam
            error_str = str(e)
            if "Could not find the table 'public.user_analytics_events'" in error_str:
                if not self._table_missing_logged:
                    logger.error(
                        "Analytics table 'user_analytics_events' is missing. "
                        "Please run database migration to create the table. "
                        "Further analytics errors will be suppressed until table is created.",
                        extra={"error_code": "ANALYTICS_TABLE_MISSING"}
                    )
                    self._table_missing_logged = True
                # Return False silently to avoid log spam
                return False
            else:
                # Log other types of errors normally
                logger.error(
                    "Failed to track analytics event",
                    extra={
                        "error": error_str,
                        "event_type": event_data.get("event_type"),
                        "event_name": event_data.get("event_name"),
                        "organization_id": event_data.get("organization_id")
                    }
                )
                return False

    async def track_feature_usage(
        self,
        organization_id: UUID,
        user_id: UUID,
        feature: str,
        action: str,
        properties: dict[str, Any] | None = None,
    ) -> bool:
        """Track usage of freemium features."""
        return await self.track_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type="feature_usage",
            event_name=f"{feature}_{action}",
            properties={
                "feature": feature,
                "action": action,
                **(properties or {}),
            },
        )

    async def track_limit_hit(
        self,
        organization_id: UUID,
        user_id: UUID,
        feature: str,
        current_count: int,
        limit: int,
        properties: dict[str, Any] | None = None,
    ) -> bool:
        """Track when a user hits a freemium limit."""
        return await self.track_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type="limit_hit",
            event_name=f"{feature}_limit_reached",
            properties={
                "feature": feature,
                "current_count": current_count,
                "limit": limit,
                "at_limit": current_count >= limit,
                **(properties or {}),
            },
        )

    async def track_upgrade_prompt(
        self,
        organization_id: UUID,
        user_id: UUID,
        feature: str,
        prompt_type: str,
        properties: dict[str, Any] | None = None,
    ) -> bool:
        """Track when upgrade prompts are shown to users."""
        return await self.track_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type="upgrade_prompt",
            event_name=f"upgrade_prompt_{prompt_type}",
            properties={
                "feature": feature,
                "prompt_type": prompt_type,
                **(properties or {}),
            },
        )

    async def track_conversion_event(
        self,
        organization_id: UUID,
        user_id: UUID,
        conversion_type: str,
        from_plan: str,
        to_plan: str,
        properties: dict[str, Any] | None = None,
    ) -> bool:
        """Track conversion events (e.g., free to premium)."""
        return await self.track_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type="conversion",
            event_name=f"plan_upgrade_{conversion_type}",
            properties={
                "conversion_type": conversion_type,
                "from_plan": from_plan,
                "to_plan": to_plan,
                **(properties or {}),
            },
        )

    async def get_feature_usage_stats(
        self,
        organization_id: UUID | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """
        Get feature usage statistics.
        
        Args:
            organization_id: Specific organization (None for all organizations)
            days: Number of days to look back
            
        Returns:
            Dictionary with usage statistics
        """
        try:
            start_date = (datetime.now(UTC) - timedelta(days=days)).isoformat()

            query = self.supabase.table("user_analytics_events").select(
                "event_name, properties, created_at, organization_id"
            ).eq("event_type", "feature_usage").gte("created_at", start_date)

            if organization_id:
                query = query.eq("organization_id", str(organization_id))

            response = query.execute()
            events = response.data

            # Aggregate usage by feature
            feature_stats = {}
            for event in events:
                event_name = event["event_name"]
                properties = event.get("properties", {})
                feature = properties.get("feature", event_name.split("_")[0])
                action = properties.get("action", event_name.split("_")[-1])

                if feature not in feature_stats:
                    feature_stats[feature] = {
                        "total_usage": 0,
                        "unique_organizations": set(),
                        "actions": {},
                    }

                feature_stats[feature]["total_usage"] += 1
                feature_stats[feature]["unique_organizations"].add(event["organization_id"])

                if action not in feature_stats[feature]["actions"]:
                    feature_stats[feature]["actions"][action] = 0
                feature_stats[feature]["actions"][action] += 1

            # Convert sets to counts for JSON serialization
            for feature in feature_stats:
                feature_stats[feature]["unique_organizations"] = len(
                    feature_stats[feature]["unique_organizations"]
                )

            return {
                "period_days": days,
                "features": feature_stats,
                "total_events": len(events),
                "start_date": start_date,
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get feature usage stats: {e!s}",
            )

    async def get_conversion_metrics(
        self,
        organization_id: UUID | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """
        Calculate conversion rates and metrics.
        
        Args:
            organization_id: Specific organization (None for all)
            days: Number of days to analyze
            
        Returns:
            Conversion metrics including rates and funnel data
        """
        try:
            start_date = (datetime.now(UTC) - timedelta(days=days)).isoformat()

            # Get all organizations that had limit hits (potential conversions)
            limit_hits_query = self.supabase.table("user_analytics_events").select(
                "organization_id, user_id, event_name, properties, created_at"
            ).eq("event_type", "limit_hit").gte("created_at", start_date)

            if organization_id:
                limit_hits_query = limit_hits_query.eq("organization_id", str(organization_id))

            limit_hits_response = limit_hits_query.execute()
            limit_hits = limit_hits_response.data

            # Get actual conversions
            conversions_query = self.supabase.table("user_analytics_events").select(
                "organization_id, user_id, event_name, properties, created_at"
            ).eq("event_type", "conversion").gte("created_at", start_date)

            if organization_id:
                conversions_query = conversions_query.eq("organization_id", str(organization_id))

            conversions_response = conversions_query.execute()
            conversions = conversions_response.data

            # Calculate metrics
            limit_hit_orgs = set(hit["organization_id"] for hit in limit_hits)
            converted_orgs = set(conv["organization_id"] for conv in conversions)

            conversion_rate = 0.0
            if len(limit_hit_orgs) > 0:
                conversion_rate = len(converted_orgs) / len(limit_hit_orgs) * 100

            # Feature-specific conversion rates
            feature_conversion = {}
            for hit in limit_hits:
                properties = hit.get("properties", {})
                feature = properties.get("feature", "unknown")
                org_id = hit["organization_id"]

                if feature not in feature_conversion:
                    feature_conversion[feature] = {
                        "limit_hits": set(),
                        "conversions": set(),
                    }

                feature_conversion[feature]["limit_hits"].add(org_id)

                # Check if this org converted after this limit hit
                if org_id in converted_orgs:
                    feature_conversion[feature]["conversions"].add(org_id)

            # Calculate rates for each feature
            feature_rates = {}
            for feature, data in feature_conversion.items():
                hits_count = len(data["limit_hits"])
                conv_count = len(data["conversions"])
                rate = (conv_count / hits_count * 100) if hits_count > 0 else 0.0

                feature_rates[feature] = {
                    "limit_hits": hits_count,
                    "conversions": conv_count,
                    "conversion_rate": rate,
                }

            return {
                "period_days": days,
                "overall_conversion_rate": conversion_rate,
                "total_limit_hits": len(limit_hits),
                "total_conversions": len(conversions),
                "organizations_with_limit_hits": len(limit_hit_orgs),
                "organizations_converted": len(converted_orgs),
                "feature_conversion_rates": feature_rates,
                "start_date": start_date,
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get conversion metrics: {e!s}",
            )

    async def get_limit_optimization_data(
        self,
        organization_id: UUID | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """
        Get data to optimize freemium limits based on usage patterns.
        
        Args:
            organization_id: Specific organization (None for all)
            days: Number of days to analyze
            
        Returns:
            Data for optimizing freemium limits
        """
        try:
            start_date = (datetime.now(UTC) - timedelta(days=days)).isoformat()

            # Get all limit hit events
            query = self.supabase.table("user_analytics_events").select(
                "organization_id, properties, created_at"
            ).eq("event_type", "limit_hit").gte("created_at", start_date)

            if organization_id:
                query = query.eq("organization_id", str(organization_id))

            response = query.execute()
            limit_events = response.data

            # Analyze limit hit patterns
            feature_limits = {}
            daily_hits = {}

            for event in limit_events:
                properties = event.get("properties", {})
                feature = properties.get("feature", "unknown")
                current_count = properties.get("current_count", 0)
                limit = properties.get("limit", 0)
                created_date = event["created_at"][:10]  # Extract date part

                if feature not in feature_limits:
                    feature_limits[feature] = {
                        "hit_counts": [],
                        "limits": [],
                        "organizations": set(),
                    }

                feature_limits[feature]["hit_counts"].append(current_count)
                feature_limits[feature]["limits"].append(limit)
                feature_limits[feature]["organizations"].add(event["organization_id"])

                # Daily aggregation
                if created_date not in daily_hits:
                    daily_hits[created_date] = {}
                if feature not in daily_hits[created_date]:
                    daily_hits[created_date][feature] = 0
                daily_hits[created_date][feature] += 1

            # Calculate optimization suggestions
            optimization_suggestions = {}
            for feature, data in feature_limits.items():
                hit_counts = data["hit_counts"]
                limits = data["limits"]
                orgs_affected = len(data["organizations"])

                avg_hit_count = sum(hit_counts) / len(hit_counts) if hit_counts else 0
                current_limit = limits[0] if limits else 0

                # Simple suggestion logic
                suggestion = "maintain"
                if avg_hit_count > current_limit * 0.9:  # 90% of limit frequently hit
                    suggestion = "increase"
                elif avg_hit_count < current_limit * 0.5:  # Less than 50% typically used
                    suggestion = "decrease"

                optimization_suggestions[feature] = {
                    "current_limit": current_limit,
                    "average_at_limit": avg_hit_count,
                    "organizations_affected": orgs_affected,
                    "total_hits": len(hit_counts),
                    "suggestion": suggestion,
                    "suggested_new_limit": (
                        int(avg_hit_count * 1.2) if suggestion == "increase"
                        else int(avg_hit_count * 0.8) if suggestion == "decrease"
                        else current_limit
                    ),
                }

            return {
                "period_days": days,
                "optimization_suggestions": optimization_suggestions,
                "daily_limit_hits": daily_hits,
                "start_date": start_date,
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get optimization data: {e!s}",
            )

    async def get_analytics_dashboard_data(
        self,
        organization_id: UUID | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """
        Get comprehensive analytics data for dashboard display.
        
        Args:
            organization_id: Specific organization (None for system-wide)
            days: Number of days to analyze
            
        Returns:
            Complete analytics dashboard data
        """
        try:
            # Get all analytics data
            feature_stats = await self.get_feature_usage_stats(organization_id, days)
            conversion_metrics = await self.get_conversion_metrics(organization_id, days)
            optimization_data = await self.get_limit_optimization_data(organization_id, days)

            return {
                "organization_id": str(organization_id) if organization_id else None,
                "period_days": days,
                "generated_at": datetime.now(UTC).isoformat(),
                "feature_usage": feature_stats,
                "conversion_metrics": conversion_metrics,
                "optimization_recommendations": optimization_data,
                "summary": {
                    "total_events": feature_stats["total_events"],
                    "conversion_rate": conversion_metrics["overall_conversion_rate"],
                    "top_features": sorted(
                        feature_stats["features"].items(),
                        key=lambda x: x[1]["total_usage"],
                        reverse=True,
                    )[:5],
                },
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get dashboard data: {e!s}",
            )


def get_analytics_service() -> AnalyticsService:
    """Get analytics service instance."""
    from gastropartner.core.database import get_supabase_client
    supabase = get_supabase_client()
    return AnalyticsService(supabase)
