"""FastAPI application entrypoint."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import (
    achievements,
    admin,
    auth,
    causes,
    certificates,
    checkin,
    distance_logs,
    donations,
    events,
    notifications,
    organisations,
    payments,
    payouts,
    receipts,
    runners,
    settlement,
    public_feed,
    public_stats,
    newsletter,
    exports,
    corporate_sponsors,
    site_settings,
    strava,
    teams,
    uploads,
    volunteers,
    webhooks,
)
from app.utils.logger import configure_logging, get_logger

configure_logging(debug=settings.DEBUG)
logger = get_logger(__name__)

# Sentry — fully optional. Init only when SENTRY_DSN is set; the import is
# guarded so the package isn't required for development. Install via
# `pip install "sentry-sdk[fastapi]"` to activate.
if settings.SENTRY_DSN:
    try:
        import sentry_sdk  # type: ignore[import-untyped]

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            environment=settings.ENVIRONMENT,
            send_default_pii=False,  # respect DPDP — opt-in only
        )
        logger.info("sentry_initialised", env=settings.ENVIRONMENT)
    except ImportError:
        logger.warning(
            "sentry_dsn_set_but_sdk_missing",
            hint='Run: pip install "sentry-sdk[fastapi]"',
        )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application startup/shutdown hook."""
    logger.info("app_startup", env=settings.APP_ENV, debug=settings.DEBUG)
    # Production safety nets — loud warnings when something deploy-blocking
    # is misconfigured. Doesn't kill startup (might be a quick dev test against
    # a prod-flagged env), but the warning will scream in any log aggregator.
    if settings.APP_ENV == "production":
        # Hard-block on secret-key and cookie-secure — forged JWTs / session
        # hijacking are catastrophic; better to refuse to start than silently
        # accept a misconfigured deploy.
        if "change-me" in settings.SECRET_KEY:
            raise RuntimeError(
                "FATAL: SECRET_KEY is still the development default. "
                "Generate a strong key with `openssl rand -hex 64` and set it "
                "in your production environment before starting."
            )
        if not settings.COOKIE_SECURE:
            raise RuntimeError(
                "FATAL: COOKIE_SECURE is False in production. Auth cookies "
                "will be transmitted over plain HTTP. Set COOKIE_SECURE=true."
            )
        # Non-fatal warnings — loud in logs but don't block serving traffic.
        if settings.RAZORPAY_KEY_ID.startswith("rzp_test"):
            logger.warning(
                "razorpay_test_keys_in_production",
                hint="Donations will route to Razorpay's test mode — no real money moves.",
            )
        if settings.EMAIL_PROVIDER == "console":
            logger.error(
                "email_provider_console_in_production",
                hint=(
                    "Emails will only be logged, never sent. Set "
                    "EMAIL_PROVIDER=resend and RESEND_API_KEY=re_..."
                ),
            )
        if "localhost" in settings.FRONTEND_URL or "127.0.0.1" in settings.FRONTEND_URL:
            logger.error(
                "frontend_url_localhost_in_production",
                hint="FRONTEND_URL is still a dev URL. Email/QR/Strava callback links will be broken.",
            )
        if (
            settings.EMAIL_PROVIDER == "resend"
            and settings.RESEND_API_KEY
            and not settings.FROM_EMAIL.endswith("@runforacause.in")
        ):
            logger.warning(
                "from_email_domain_mismatch",
                hint="FROM_EMAIL is not on @runforacause.in — DKIM/SPF won't pass.",
            )
    # APScheduler — opt-in via ENABLE_SCHEDULER=1. In a multi-worker prod
    # setup, only ONE worker should host the scheduler.
    from app.scheduler import start_scheduler, stop_scheduler

    start_scheduler()
    try:
        yield
    finally:
        stop_scheduler()
        logger.info("app_shutdown")


_is_prod = settings.APP_ENV == "production"
app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description=(
        "RunForACause — a transparent crowd-funding portal for "
        "cause-based run events."
    ),
    # Disable interactive docs in production — schema still served for tooling.
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    # Render's Cloudflare proxy strips trailing slashes (308 redirect).
    # If FastAPI then re-adds one (307 to backend URL), the browser follows
    # it cross-origin — without the auth cookie — causing 401 errors.
    # redirect_slashes=False accepts both /path and /path/ without redirect.
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
async def root() -> dict[str, str]:
    """Root health check."""
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "status": "ok",
    }


@app.get("/health", tags=["meta"])
async def health() -> JSONResponse:
    """Liveness probe."""
    return JSONResponse({"status": "ok"})


API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(organisations.router, prefix=API_PREFIX)
app.include_router(causes.router, prefix=API_PREFIX)
app.include_router(events.router, prefix=API_PREFIX)
app.include_router(runners.router, prefix=API_PREFIX)
app.include_router(distance_logs.router, prefix=API_PREFIX)
app.include_router(donations.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(payouts.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(webhooks.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(receipts.router, prefix=API_PREFIX)
app.include_router(settlement.router, prefix=API_PREFIX)
app.include_router(site_settings.router, prefix=API_PREFIX)
app.include_router(uploads.router, prefix=API_PREFIX)
app.include_router(public_stats.router, prefix=API_PREFIX)
app.include_router(public_feed.router, prefix=API_PREFIX)
app.include_router(certificates.router, prefix=API_PREFIX)
app.include_router(achievements.achievements_router, prefix=API_PREFIX)
app.include_router(achievements.analytics_router, prefix=API_PREFIX)
app.include_router(newsletter.router, prefix=API_PREFIX)
app.include_router(exports.router, prefix=API_PREFIX)
app.include_router(volunteers.router, prefix=API_PREFIX)
app.include_router(corporate_sponsors.router, prefix=API_PREFIX)
app.include_router(checkin.router, prefix=API_PREFIX)
app.include_router(teams.router, prefix=API_PREFIX)
app.include_router(strava.router, prefix=API_PREFIX)

# Serve uploaded files publicly so the frontend can <img src> them.
_uploads_dir = Path(settings.LOCAL_UPLOAD_DIR)
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")
