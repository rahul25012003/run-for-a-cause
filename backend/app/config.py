"""Application configuration using pydantic-settings."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "RunForACause"
    APP_ENV: str = "development"
    DEBUG: bool = False

    SECRET_KEY: str = "change-me-in-production-min-32-chars-long-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    DATABASE_URL: str = (
        "postgresql+asyncpg://runforacause:localpassword@localhost:5432/runforacause"
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage backend selector. "local" = LOCAL_UPLOAD_DIR + StaticFiles mount.
    # "s3" = S3-compatible (AWS, Wasabi, R2, Spaces) — needs boto3 installed
    # and the S3_* keys below.
    STORAGE_BACKEND: str = "local"
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "runforacause-uploads"
    S3_PUBLIC_URL: str = ""
    LOCAL_UPLOAD_DIR: str = "./uploads"

    RAZORPAY_KEY_ID: str = "rzp_test_dummy"
    RAZORPAY_KEY_SECRET: str = "dummy_secret"
    RAZORPAY_WEBHOOK_SECRET: str = "dummy_webhook_secret"

    EMAIL_PROVIDER: str = "console"
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@runforacause.in"
    FROM_NAME: str = "RunForACause"

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    PLATFORM_FEE_PERCENT: float = 3.0
    SETTLEMENT_WINDOW_DAYS: int = 7
    MIN_DISTANCE_THRESHOLD_PCT: float = 20.0

    # Sentry — fully optional. When SENTRY_DSN is empty, the SDK init in
    # main.py is skipped and Sentry has zero runtime cost.
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    ENVIRONMENT: str = "development"

    # ===== External integrations (all optional — services no-op when blank) =====
    # WhatsApp Business (D1). Gupshup is the recommended India-region provider.
    GUPSHUP_API_KEY: str = ""
    GUPSHUP_APP_NAME: str = ""
    GUPSHUP_SOURCE_NUMBER: str = ""

    # SMS OTP (D6). MSG91 is recommended for India DLT compliance.
    MSG91_AUTH_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""
    MSG91_SENDER_ID: str = "RFACAU"

    # Strava OAuth (C1). Register the app at https://www.strava.com/settings/api.
    STRAVA_CLIENT_ID: str = ""
    STRAVA_CLIENT_SECRET: str = ""
    STRAVA_REDIRECT_URI: str = ""

    # Anthropic (C2 / D5 — already used as fallback). Keeping here for visibility.
    ANTHROPIC_API_KEY: str = ""

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()


settings = get_settings()
