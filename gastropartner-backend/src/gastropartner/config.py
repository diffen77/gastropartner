"""Configuration module för GastroPartner."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings med Supabase konfiguration."""

    # App settings
    app_name: str = "GastroPartner"
    environment: str = "development"
    debug: bool = False

    # Supabase (hämtas från environment)
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str | None = None  # Endast för admin operations

    # Frontend URL för CORS
    frontend_url: str = "http://localhost:3000"

    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Monitoring Settings
    monitoring_enabled: bool = True
    synthetic_test_api_key: str = "dev-synthetic-key-12345"  # Override in production

    # Alerting Settings (optional)
    pagerduty_enabled: bool = False
    pagerduty_integration_key: str | None = None
    pagerduty_service_id: str | None = None

    # Notification Settings
    notification_email: str | None = None
    slack_webhook_url: str | None = None

    # AI Settings
    openai_api_key: str | None = None

    model_config = SettingsConfigDict(
        # Försök läsa från .env.development (om den finns lokalt)
        # Fallback till environment variables
        env_file=[".env.development", ".env.local", ".env"],
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Tillåt environment variables att override .env filer
        env_prefix="GASTROPARTNER_",
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()  # type: ignore[call-arg]
