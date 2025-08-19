"""Analytics API endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from gastropartner.core.analytics import AnalyticsService, get_analytics_service
from gastropartner.core.auth import get_current_user
from gastropartner.core.models import User


class AnalyticsEventRequest(BaseModel):
    """Request model for tracking analytics events."""

    event_type: str = Field(..., max_length=100)
    event_name: str = Field(..., max_length=100)
    properties: dict[str, Any] = Field(default_factory=dict)


class FeatureUsageRequest(BaseModel):
    """Request model for tracking feature usage."""

    feature: str = Field(..., description="Feature name (e.g., 'ingredients', 'recipes')")
    action: str = Field(..., description="Action taken (e.g., 'created', 'updated', 'deleted')")
    properties: dict[str, Any] | None = None


class LimitHitRequest(BaseModel):
    """Request model for tracking limit hits."""

    feature: str = Field(..., description="Feature that hit the limit")
    current_count: int = Field(..., description="Current usage count")
    limit: int = Field(..., description="The limit that was hit")
    properties: dict[str, Any] | None = None


class UpgradePromptRequest(BaseModel):
    """Request model for tracking upgrade prompts."""

    feature: str = Field(..., description="Feature associated with upgrade prompt")
    prompt_type: str = Field(..., description="Type of prompt shown")
    properties: dict[str, Any] | None = None


class AnalyticsResponse(BaseModel):
    """Response model for analytics data."""

    success: bool = True
    message: str = "Analytics data retrieved successfully"
    data: dict[str, Any] = Field(default_factory=dict)


router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.post("/track", response_model=AnalyticsResponse)
async def track_event(
    event_request: AnalyticsEventRequest,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Track a user analytics event.
    
    This endpoint allows tracking of user interactions, feature usage,
    and conversion events for analytics purposes.
    """
    try:
        # For now, we'll use a default organization_id
        # In production, this should come from the user's context
        organization_id = UUID("87654321-4321-4321-4321-210987654321")

        success = await analytics_service.track_event(
            organization_id=organization_id,
            user_id=current_user.id,
            event_type=event_request.event_type,
            event_name=event_request.event_name,
            properties=event_request.properties,
            page_url=event_request.page_url,
            session_id=event_request.session_id,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to track event"
            )

        return AnalyticsResponse(
            message="Event tracked successfully",
            data={"tracked": True}
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track event: {e!s}"
        )


@router.post("/track/feature-usage", response_model=AnalyticsResponse)
async def track_feature_usage(
    request: FeatureUsageRequest,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Track feature usage events.
    
    This is a convenience endpoint for tracking specific feature usage.
    """
    organization_id = UUID("87654321-4321-4321-4321-210987654321")

    success = await analytics_service.track_feature_usage(
        organization_id=organization_id,
        user_id=current_user.id,
        feature=request.feature,
        action=request.action,
        properties=request.properties,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track feature usage"
        )

    return AnalyticsResponse(
        message="Feature usage tracked successfully",
        data={"feature": request.feature, "action": request.action, "tracked": True}
    )


@router.post("/track/limit-hit", response_model=AnalyticsResponse)
async def track_limit_hit(
    request: LimitHitRequest,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Track when a user hits a freemium limit.
    
    This helps measure conversion opportunities and optimize limits.
    """
    organization_id = UUID("87654321-4321-4321-4321-210987654321")

    success = await analytics_service.track_limit_hit(
        organization_id=organization_id,
        user_id=current_user.id,
        feature=request.feature,
        current_count=request.current_count,
        limit=request.limit,
        properties=request.properties,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track limit hit"
        )

    return AnalyticsResponse(
        message="Limit hit tracked successfully",
        data={"feature": request.feature, "limit_hit": True, "tracked": True}
    )


@router.post("/track/upgrade-prompt", response_model=AnalyticsResponse)
async def track_upgrade_prompt(
    request: UpgradePromptRequest,
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Track when upgrade prompts are shown to users.
    
    This helps measure prompt effectiveness and conversion funnels.
    """
    organization_id = UUID("87654321-4321-4321-4321-210987654321")

    success = await analytics_service.track_upgrade_prompt(
        organization_id=organization_id,
        user_id=current_user.id,
        feature=request.feature,
        prompt_type=request.prompt_type,
        properties=request.properties,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track upgrade prompt"
        )

    return AnalyticsResponse(
        message="Upgrade prompt tracked successfully",
        data={"feature": request.feature, "prompt_type": request.prompt_type, "tracked": True}
    )


@router.get("/usage-stats", response_model=AnalyticsResponse)
async def get_usage_stats(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Get feature usage statistics.
    
    Returns aggregated usage data for the specified time period.
    """
    try:
        # For now, get stats for the default organization
        organization_id = UUID("87654321-4321-4321-4321-210987654321")

        stats = await analytics_service.get_feature_usage_stats(
            organization_id=organization_id,
            days=days
        )

        return AnalyticsResponse(
            message=f"Usage statistics for {days} days retrieved successfully",
            data=stats
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get usage stats: {e!s}"
        )


@router.get("/conversion-metrics", response_model=AnalyticsResponse)
async def get_conversion_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Get conversion rate metrics.
    
    Returns conversion rates from freemium to premium and related metrics.
    """
    try:
        organization_id = UUID("87654321-4321-4321-4321-210987654321")

        metrics = await analytics_service.get_conversion_metrics(
            organization_id=organization_id,
            days=days
        )

        return AnalyticsResponse(
            message=f"Conversion metrics for {days} days retrieved successfully",
            data=metrics
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversion metrics: {e!s}"
        )


@router.get("/optimization-data", response_model=AnalyticsResponse)
async def get_optimization_data(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Get data for optimizing freemium limits.
    
    Returns suggestions for adjusting limits based on usage patterns.
    """
    try:
        organization_id = UUID("87654321-4321-4321-4321-210987654321")

        data = await analytics_service.get_limit_optimization_data(
            organization_id=organization_id,
            days=days
        )

        return AnalyticsResponse(
            message=f"Optimization data for {days} days retrieved successfully",
            data=data
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get optimization data: {e!s}"
        )


@router.get("/dashboard", response_model=AnalyticsResponse)
async def get_analytics_dashboard(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Get comprehensive analytics dashboard data.
    
    Returns all analytics data needed for dashboard display including
    usage stats, conversion metrics, and optimization recommendations.
    """
    try:
        organization_id = UUID("87654321-4321-4321-4321-210987654321")

        dashboard_data = await analytics_service.get_analytics_dashboard_data(
            organization_id=organization_id,
            days=days
        )

        return AnalyticsResponse(
            message=f"Dashboard data for {days} days retrieved successfully",
            data=dashboard_data
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard data: {e!s}"
        )


# Admin-only endpoints for system-wide analytics
@router.get("/admin/system-wide-stats", response_model=AnalyticsResponse)
async def get_system_wide_stats(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Get system-wide analytics (admin only).
    
    Returns analytics across all organizations for admin users.
    Note: In production, this should have proper admin authorization.
    """
    try:
        # Get system-wide stats (no organization filter)
        stats = await analytics_service.get_feature_usage_stats(
            organization_id=None,
            days=days
        )

        return AnalyticsResponse(
            message=f"System-wide statistics for {days} days retrieved successfully",
            data=stats
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system-wide stats: {e!s}"
        )


@router.get("/admin/system-conversion-metrics", response_model=AnalyticsResponse)
async def get_system_conversion_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    """
    Get system-wide conversion metrics (admin only).
    
    Returns conversion metrics across all organizations.
    """
    try:
        metrics = await analytics_service.get_conversion_metrics(
            organization_id=None,
            days=days
        )

        return AnalyticsResponse(
            message=f"System-wide conversion metrics for {days} days retrieved successfully",
            data=metrics
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system conversion metrics: {e!s}"
        )
