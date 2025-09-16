"""Analytics middleware for automatic tracking."""

import time
from collections.abc import Callable
from uuid import UUID

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from gastropartner.core.analytics import AnalyticsService
from gastropartner.core.database import get_supabase_client
from gastropartner.utils.logger import dev_logger


class AnalyticsMiddleware(BaseHTTPMiddleware):
    """Middleware for automatic analytics tracking."""

    def __init__(self, app, track_all_requests: bool = False):
        super().__init__(app)
        self.track_all_requests = track_all_requests
        self._analytics_service = None

    async def get_analytics_service(self):
        """Get analytics service instance."""
        if not self._analytics_service:
            supabase = get_supabase_client()
            self._analytics_service = AnalyticsService(supabase)
        return self._analytics_service

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and track analytics."""
        start_time = time.time()

        # Extract request metadata
        user_agent = request.headers.get("user-agent")
        path = request.url.path
        method = request.method

        # Process the request
        response = await call_next(request)

        # Calculate response time
        process_time = time.time() - start_time

        # Track analytics for specific events
        await self._track_request_analytics(
            request=request,
            response=response,
            process_time=process_time,
            path=path,
            method=method,
            user_agent=user_agent,
        )

        return response

    async def _track_request_analytics(
        self,
        request: Request,
        response: Response,
        process_time: float,
        path: str,
        method: str,
        user_agent: str,
    ):
        """Track analytics for specific request patterns."""
        try:
            analytics_service = await self.get_analytics_service()

            # Default organization ID for development
            organization_id = UUID("87654321-4321-4321-4321-210987654321")

            # Extract user ID from request state if available
            user_id = getattr(request.state, "user_id", None)
            if user_id:
                user_id = UUID(user_id) if isinstance(user_id, str) else user_id

            # Track API usage patterns
            if self._should_track_api_call(path, method, response.status_code):
                await analytics_service.track_event(
                    organization_id=organization_id,
                    user_id=user_id,
                    event_type="api_usage",
                    event_name=f"{method.lower()}_{self._extract_endpoint_name(path)}",
                    properties={
                        "method": method,
                        "path": path,
                        "status_code": response.status_code,
                        "response_time_ms": round(process_time * 1000, 2),
                        "success": 200 <= response.status_code < 400,
                    },
                    user_agent=user_agent,
                )

            # Track freemium limit hits (402 Payment Required responses)
            if response.status_code == 402:
                await self._track_freemium_limit_hit(
                    analytics_service=analytics_service,
                    organization_id=organization_id,
                    user_id=user_id,
                    path=path,
                    response=response,
                )

            # Track feature usage based on successful operations
            if 200 <= response.status_code < 300:
                await self._track_feature_usage_from_path(
                    analytics_service=analytics_service,
                    organization_id=organization_id,
                    user_id=user_id,
                    path=path,
                    method=method,
                )

        except Exception as e:
            # Don't let analytics tracking break the main request
            dev_logger.error_print(f"Analytics tracking error: {e}")

    def _should_track_api_call(self, path: str, method: str, status_code: int) -> bool:
        """Determine if API call should be tracked."""
        # Skip tracking for certain paths
        skip_paths = [
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/health",
            "/api/v1/analytics/track",  # Avoid infinite loops
        ]

        if any(path.startswith(skip) for skip in skip_paths):
            return False

        # Track all API calls if enabled, otherwise only track important operations
        if self.track_all_requests:
            return True

        # Track main feature operations
        feature_paths = [
            "/api/v1/ingredients",
            "/api/v1/recipes",
            "/api/v1/menu-items",
            "/api/v1/organizations",
            "/api/v1/auth",
        ]

        return any(path.startswith(feature_path) for feature_path in feature_paths)

    def _extract_endpoint_name(self, path: str) -> str:
        """Extract a clean endpoint name from path."""
        # Remove API version prefix
        if path.startswith("/api/v1/"):
            path = path[8:]

        # Extract main resource name
        parts = path.split("/")
        if parts:
            return parts[0].replace("-", "_")

        return "unknown"

    async def _track_freemium_limit_hit(
        self,
        analytics_service: AnalyticsService,
        organization_id: UUID,
        user_id: UUID | None,
        path: str,
        response: Response,
    ):
        """Track freemium limit hits from 402 responses."""
        try:
            # Extract feature from response headers
            feature = response.headers.get("X-Feature", "unknown")

            # Try to extract limit information from response if available
            # This would require the freemium service to add limit info to response
            properties = {
                "path": path,
                "feature": feature,
                "response_type": "limit_hit",
            }

            await analytics_service.track_limit_hit(
                organization_id=organization_id,
                user_id=user_id,
                feature=feature,
                current_count=0,  # This should come from the actual limit check
                limit=0,  # This should come from the actual limit check
                properties=properties,
            )

        except Exception as e:
            dev_logger.error_print(f"Error tracking limit hit: {e}")

    async def _track_feature_usage_from_path(
        self,
        analytics_service: AnalyticsService,
        organization_id: UUID,
        user_id: UUID | None,
        path: str,
        method: str,
    ):
        """Track feature usage based on successful API calls."""
        try:
            feature_mapping = {
                "/api/v1/ingredients": "ingredients",
                "/api/v1/recipes": "recipes",
                "/api/v1/menu-items": "menu_items",
                "/api/v1/organizations": "organizations",
            }

            action_mapping = {
                "POST": "created",
                "PUT": "updated",
                "PATCH": "updated",
                "DELETE": "deleted",
                "GET": "viewed",
            }

            # Find matching feature
            feature = None
            for path_prefix, feature_name in feature_mapping.items():
                if path.startswith(path_prefix):
                    feature = feature_name
                    break

            if feature and user_id:  # Only track for authenticated users
                action = action_mapping.get(method, "accessed")

                await analytics_service.track_feature_usage(
                    organization_id=organization_id,
                    user_id=user_id,
                    feature=feature,
                    action=action,
                    properties={
                        "path": path,
                        "method": method,
                        "source": "automatic",
                    },
                )

        except Exception as e:
            dev_logger.error_print(f"Error tracking feature usage: {e}")


# Enhanced freemium service integration
async def track_limit_hit_with_analytics(
    organization_id: UUID,
    user_id: UUID,
    feature: str,
    current_count: int,
    limit: int,
):
    """Helper function to track limit hits from freemium service."""
    try:
        supabase = get_supabase_client()
        analytics_service = AnalyticsService(supabase)

        await analytics_service.track_limit_hit(
            organization_id=organization_id,
            user_id=user_id,
            feature=feature,
            current_count=current_count,
            limit=limit,
            properties={
                "source": "freemium_service",
                "at_limit": current_count >= limit,
            },
        )

    except Exception as e:
        dev_logger.error_print(f"Failed to track limit hit: {e}")


async def track_upgrade_prompt_with_analytics(
    organization_id: UUID,
    user_id: UUID,
    feature: str,
    prompt_type: str = "limit_reached",
):
    """Helper function to track upgrade prompts."""
    try:
        supabase = get_supabase_client()
        analytics_service = AnalyticsService(supabase)

        await analytics_service.track_upgrade_prompt(
            organization_id=organization_id,
            user_id=user_id,
            feature=feature,
            prompt_type=prompt_type,
            properties={
                "source": "freemium_service",
                "timestamp": time.time(),
            },
        )

    except Exception as e:
        dev_logger.error_print(f"Failed to track upgrade prompt: {e}")


async def track_successful_feature_usage(
    organization_id: UUID,
    user_id: UUID,
    feature: str,
    action: str,
    properties: dict | None = None,
):
    """Helper function to track successful feature usage."""
    try:
        supabase = get_supabase_client()
        analytics_service = AnalyticsService(supabase)

        await analytics_service.track_feature_usage(
            organization_id=organization_id,
            user_id=user_id,
            feature=feature,
            action=action,
            properties={
                "source": "direct",
                **(properties or {}),
            },
        )

    except Exception as e:
        dev_logger.error_print(f"Failed to track feature usage: {e}")
