"""Main application module för GastroPartner API."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gastropartner.api import (
    auth,
    freemium,
    ingredients,
    menu_items,
    multitenant,
    organizations,
    recipes,
    superadmin,
)
from gastropartner.config import get_settings

settings = get_settings()


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
app.include_router(ingredients.router, prefix="/api/v1")
app.include_router(recipes.router, prefix="/api/v1")
app.include_router(menu_items.router, prefix="/api/v1")
app.include_router(superadmin.router)


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
