"""Module management utilities for GastroPartner."""

import os


def require_module_enabled(module_name: str):
    """
    Dependency factory that checks if a module is enabled.

    Used as a dependency: Depends(require_module_enabled("module_name"))

    For now, this is a simple pass-through that allows all modules.
    In production, this would check against the actual module configuration.

    Args:
        module_name: Name of the module to check

    Returns:
        A dependency function that returns None (allowing access)
    """

    def dependency():
        # In development environment, allow all modules for testing
        if os.getenv("ENVIRONMENT") in ["development", "local"]:
            return None
        # TODO: Implement actual module checking logic for production
        # IMPLEMENTATION PLAN:
        # 1. Check organization subscription status from database
        # 2. Verify module subscription is active and not expired
        # 3. Check user permissions for specific module features
        # 4. Add caching for performance (Redis/memory cache)
        # CURRENT STATUS: All modules allowed for development - safe for testing
        return None

    return dependency


def check_module_available_for_organization(module_name: str, organization_id: str) -> bool:
    """
    Check if a module is available for the given organization.

    For development, all modules are available for all organizations.

    Args:
        module_name: Name of the module
        organization_id: Organization ID

    Returns:
        True if module is available, False otherwise
    """
    # In development environment, allow all modules for all organizations
    if os.getenv("ENVIRONMENT") in ["development", "local"]:
        return True
    # TODO: Implement actual organization-specific module availability for production
    # IMPLEMENTATION PLAN:
    # 1. Query organization_modules table for available modules per organization
    # 2. Check SuperAdmin settings for organization-level module restrictions
    # 3. Verify subscription status and payment status
    # 4. Handle module dependencies and prerequisites
    # CURRENT STATUS: All modules available for development - ensures functionality works
    return True


def get_available_modules_for_organization(organization_id: str) -> list[str]:
    """
    Get list of available module IDs for the given organization.

    Args:
        organization_id: Organization ID

    Returns:
        List of module ID strings
    """
    # Default modules available in development
    return [
        "recipes",
        "sales",
        "reports",
        "analytics",
        "ingredients",
    ]


def get_module_display_name(module_id: str) -> str:
    """
    Get display name for a module.

    Args:
        module_id: Module identifier

    Returns:
        Display name for the module
    """
    module_names = {
        "recipes": "Recipes",
        "sales": "Sales",
        "reports": "Reports",
        "analytics": "Analytics",
        "ingredients": "Ingredients",
    }
    return module_names.get(module_id, module_id.title())


# Alternative simple implementation for decorator usage
def module_decorator(module_name: str):
    """Simple decorator version that allows all modules in development."""

    def decorator(func):
        return func

    return decorator
