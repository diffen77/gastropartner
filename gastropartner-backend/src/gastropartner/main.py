"""Main application module för GastroPartner API."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gastropartner.api import (
    auth,
    cost_control,
    feature_flags,
    freemium,
    ingredients,
    menu_items,
    modules,
    monitoring,
    multitenant,
    organizations,
    recipes,
    superadmin,
    testing,
    user_testing,
)
from gastropartner.config import get_settings
from gastropartner.middleware.analytics import AnalyticsMiddleware

settings = get_settings()


def _add_dual_slash_routes(app: FastAPI) -> None:
    """
    Add dual slash routes to prevent 307 redirects.
    
    For routes that end with trailing slash (like /ingredients/), 
    this adds the non-trailing-slash version (/ingredients).
    """
    # Get all existing routes
    existing_routes = list(app.routes)

    for route in existing_routes:
        # Only process API routes that have paths and endpoints
        if not hasattr(route, 'path') or not hasattr(route, 'endpoint'):
            continue

        path = route.path

        # Skip non-API routes and routes with path parameters
        if not path.startswith('/api/') or '{' in path:
            continue

        # Skip routes that already have dual patterns or are specific endpoints
        if path.count('/') <= 3:  # /api/v1/resource-type level only
            continue

        # Handle collection routes ending with trailing slash
        if path.endswith('/') and path.count('/') == 4:  # /api/v1/resource/
            # Add non-trailing slash version
            non_slash_path = path.rstrip('/')

            # Check if non-slash version already exists
            path_exists = any(
                hasattr(r, 'path') and r.path == non_slash_path
                for r in existing_routes
            )

            if not path_exists:
                # Add the route without trailing slash
                app.add_api_route(
                    non_slash_path,
                    route.endpoint,
                    methods=list(route.methods),
                    name=f"{route.name}_no_slash" if hasattr(route, 'name') else None,
                    **getattr(route, 'route_class_kwargs', {})
                )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager för startup och shutdown."""
    # Startup
    print(f"🚀 Starting {settings.app_name} API in {settings.environment} mode")
    yield
    # Shutdown
    print(f"👋 Shutting down {settings.app_name} API")


app = FastAPI(
    title=f"{settings.app_name} API",
    version="0.1.0",
    description="API för GastroPartner - SaaS för restauranger och livsmedelsproducenter",
    lifespan=lifespan,
    redirect_slashes=False,  # Prevent 307 redirects for trailing slashes
)

# Analytics middleware (before CORS to track all requests)
app.add_middleware(
    AnalyticsMiddleware,
    track_all_requests=settings.environment == "development"  # Track all requests in dev
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url] if settings.environment == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(multitenant.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(freemium.router, prefix="/api/v1")
app.include_router(cost_control.router, prefix="/api/v1")
app.include_router(feature_flags.router, prefix="/api/v1")
app.include_router(ingredients.router, prefix="/api/v1")
app.include_router(recipes.router, prefix="/api/v1")
app.include_router(menu_items.router, prefix="/api/v1")
app.include_router(modules.router, prefix="/api/v1")
app.include_router(monitoring.router)  # Health checks and monitoring
# app.include_router(analytics.router)  # Temporarily disabled - has Supabase client field type issues
app.include_router(user_testing.router, prefix="/api/v1")
app.include_router(testing.router)
app.include_router(superadmin.router)

# Fix trailing slash handling by adding dual patterns
# This prevents 307 redirects by explicitly handling both URL patterns
_add_dual_slash_routes(app)


@app.get("/")
async def read_root() -> dict[str, Any]:
    """Root endpoint - Hello World."""
    return {
        "message": f"Hello World från {settings.app_name}!",
        "environment": settings.environment,
        "version": "0.1.0",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint för monitoring."""
    return {
        "status": "healthy",
        "service": "gastropartner-api",
        "environment": settings.environment,
    }
