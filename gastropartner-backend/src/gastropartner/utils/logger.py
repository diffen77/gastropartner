"""
Environment-based logging utilities for GastroPartner Backend

Preserves all debug functionality for development while cleaning production output.
Based on JWT Migration Analysis findings.
"""

import os

# Environment detection
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_DEVELOPMENT = ENVIRONMENT in ("development", "dev", "local")
SHOULD_LOG = DEBUG_MODE or IS_DEVELOPMENT


class DevLogger:
    """
    Development-aware logger that preserves debugging functionality
    in development while maintaining clean production output.
    """

    @staticmethod
    def debug_print(*args, **kwargs) -> None:
        """
        Debug printing - for detailed flow debugging
        Used in: Auth flow, API calls, database operations
        """
        if SHOULD_LOG:
            print(*args, **kwargs)

    @staticmethod
    def error_print(*args, **kwargs) -> None:
        """
        Error printing - ALWAYS shown as errors are critical
        Used in: Authentication errors, database failures, validation errors
        """
        print("ERROR:", *args, **kwargs)

    @staticmethod
    def warn_print(*args, **kwargs) -> None:
        """
        Warning printing - ALWAYS shown as warnings are important
        Used in: Deprecation warnings, fallback usage, configuration issues
        """
        print("WARNING:", *args, **kwargs)

    @staticmethod
    def info_print(*args, **kwargs) -> None:
        """
        Info printing - development only
        Used in: Success confirmations, startup/shutdown, routine operations
        """
        if SHOULD_LOG:
            print("INFO:", *args, **kwargs)

    @staticmethod
    def jwt_print(*args, **kwargs) -> None:
        """
        JWT-specific debugging - critical for authentication troubleshooting
        Used in: JWT token creation, validation, organization claims
        """
        if SHOULD_LOG:
            print("🔐 JWT:", *args, **kwargs)

    @staticmethod
    def org_print(*args, **kwargs) -> None:
        """
        Organization-specific debugging - critical for multi-tenant functionality
        Used in: Organization creation, tenant isolation, access control
        """
        if SHOULD_LOG:
            print("🏢 ORG:", *args, **kwargs)

    @staticmethod
    def api_print(*args, **kwargs) -> None:
        """
        API debugging - for endpoint troubleshooting
        Used in: Request handling, response generation, middleware operations
        """
        if SHOULD_LOG:
            print("🌐 API:", *args, **kwargs)

    @staticmethod
    def dev_print(*args, **kwargs) -> None:
        """
        Development mode debugging - enhanced logging for dev environment
        Used in: Development organization setup, mock data, testing scenarios
        """
        if SHOULD_LOG:
            print("🔧 DEV:", *args, **kwargs)

    @staticmethod
    def auth_print(*args, **kwargs) -> None:
        """
        Authentication flow debugging - critical for login troubleshooting
        Used in: User creation, login attempts, session management
        """
        if SHOULD_LOG:
            print("👤 AUTH:", *args, **kwargs)

    @staticmethod
    def db_print(*args, **kwargs) -> None:
        """
        Database operation debugging - critical for data integrity
        Used in: Query execution, transaction handling, data validation
        """
        if SHOULD_LOG:
            print("💾 DB:", *args, **kwargs)

    @staticmethod
    def security_print(*args, **kwargs) -> None:
        """
        Security-related debugging - critical for multi-tenant security
        Used in: RLS policy verification, data isolation, access control
        """
        if SHOULD_LOG:
            print("🛡️ SECURITY:", *args, **kwargs)


# Create logger instance
dev_logger = DevLogger()


# Convenience functions for backward compatibility
def debug_print(*args, **kwargs) -> None:
    """Legacy function for gradual migration"""
    dev_logger.debug_print(*args, **kwargs)


def error_print(*args, **kwargs) -> None:
    """Legacy function for gradual migration"""
    dev_logger.error_print(*args, **kwargs)


def warn_print(*args, **kwargs) -> None:
    """Legacy function for gradual migration"""
    dev_logger.warn_print(*args, **kwargs)


# Environment check utilities
def is_debug_active() -> bool:
    """Check if debug mode is active"""
    return SHOULD_LOG


def is_development() -> bool:
    """Check if running in development environment"""
    return IS_DEVELOPMENT


def get_environment() -> str:
    """Get current environment name"""
    return ENVIRONMENT
