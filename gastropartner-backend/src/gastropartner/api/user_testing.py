"""API endpoints för user testing functionality."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from supabase import Client

from gastropartner.core.auth import get_current_user, get_user_organization
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import (
    User,
    UserAnalyticsEventCreate,
    UserFeedback,
    UserFeedbackCreate,
    UserTestingMetrics,
)

router = APIRouter(prefix="/user-testing", tags=["user-testing"])


# ===== USER FEEDBACK ENDPOINTS =====

@router.post("/feedback", response_model=UserFeedback)
async def create_feedback(
    feedback_data: UserFeedbackCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> UserFeedback:
    """Create new user feedback."""
    try:
        # Auto-capture user agent and current page
        user_agent = request.headers.get("user-agent", "")

        # Create feedback record
        feedback_dict = feedback_data.model_dump()
        feedback_dict.update({
            "user_id": str(current_user.id),
            "organization_id": str(organization_id),
            "user_agent": user_agent,
            "status": "open",
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        })

        result = supabase.table("user_feedback").insert(feedback_dict).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Kunde inte skapa feedback"
            )

        return UserFeedback(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ett fel uppstod: {e!s}"
        )


@router.get("/feedback", response_model=list[UserFeedback])
async def list_feedback(
    status_filter: str | None = Query(None, pattern="^(open|in_progress|resolved|closed)$"),
    feedback_type: str | None = Query(None, pattern="^(bug|feature_request|general|usability|satisfaction)$"),
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> list[UserFeedback]:
    """List user feedback with optional filtering."""
    try:
        query = supabase.table("user_feedback").select("*")

        # Filter by organization
        query = query.eq("organization_id", str(organization_id))

        # Apply filters
        if status_filter:
            query = query.eq("status", status_filter)
        if feedback_type:
            query = query.eq("feedback_type", feedback_type)

        # Order by creation date (newest first)
        query = query.order("created_at", desc=True)

        result = query.execute()
        return [UserFeedback(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ett fel uppstod: {e!s}"
        )


# ===== ANALYTICS ENDPOINTS =====

@router.post("/analytics/event")
async def track_event(
    event_data: UserAnalyticsEventCreate,
    request: Request,
    current_user: User | None = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict[str, str]:
    """Track user analytics event."""
    try:
        # Auto-capture user agent
        user_agent = request.headers.get("user-agent", "")

        event_dict = event_data.model_dump()
        event_dict.update({
            "user_id": str(current_user.id) if current_user else None,
            "organization_id": None,  # We'll handle this later
            "user_agent": user_agent,
            "created_at": datetime.now(UTC).isoformat(),
        })

        result = supabase.table("user_analytics_events").insert(event_dict).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Kunde inte spara analytics event"
            )

        return {"status": "success"}

    except Exception as e:
        # Don't fail requests due to analytics errors
        print(f"Analytics error: {e}")
        return {"status": "error"}


@router.get("/analytics/metrics", response_model=UserTestingMetrics)
async def get_user_testing_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> UserTestingMetrics:
    """Get user testing metrics for the specified period."""
    try:
        # Return mock data for MVP
        return UserTestingMetrics(
            total_users=5,
            active_users_today=2,
            active_users_week=4,
            active_users_month=5,
            avg_session_duration_minutes=15.0,
            total_feedback_items=3,
            unresolved_feedback=1,
            onboarding_completion_rate=80.0,
            avg_onboarding_time_minutes=25.0,
            most_used_features=[
                {"feature": "ingredients", "count": 15},
                {"feature": "recipes", "count": 8},
                {"feature": "menu_items", "count": 5},
            ],
            conversion_rate=60.0,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ett fel uppstod: {e!s}"
        )
