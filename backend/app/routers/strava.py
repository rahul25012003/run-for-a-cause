"""Strava OAuth + activity import (C1).

Three endpoints:
  - GET /strava/authorize — returns the URL the runner is redirected to.
    State is signed (HMAC of user_id + timestamp) so the callback can
    verify it without a session lookup.
  - GET /strava/callback?code=...&state=... — exchanges code, persists
    tokens on the User row, redirects to /runner/profile.
  - POST /strava/sync — pulls recent activities and creates DistanceLog
    rows in SUBMITTED state for manager review (matches the existing
    distance-log moderation pattern).

All three return a 503 with a clear message when keys aren't configured,
so the frontend can hide the Connect button cleanly.
"""
from __future__ import annotations

import hashlib
import hmac
import time
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.distance_log import DistanceLog, DistanceProofSource, DistanceStatus
from app.models.event_runner import EventRunner, RunnerStatus
from app.models.user import User
from app.services import strava_service
from app.services.audit_service import log_action
from app.utils.logger import get_logger

router = APIRouter(prefix="/strava", tags=["strava"])
logger = get_logger(__name__)


def _sign_state(user_id: str) -> str:
    ts = str(int(time.time()))
    msg = f"{user_id}:{ts}".encode()
    sig = hmac.new(
        settings.SECRET_KEY.encode(), msg, hashlib.sha256
    ).hexdigest()[:16]
    return f"{user_id}:{ts}:{sig}"


def _verify_state(state: str, max_age_seconds: int = 600) -> str | None:
    try:
        user_id, ts, sig = state.split(":")
    except ValueError:
        return None
    expected = hmac.new(
        settings.SECRET_KEY.encode(),
        f"{user_id}:{ts}".encode(),
        hashlib.sha256,
    ).hexdigest()[:16]
    if not hmac.compare_digest(sig, expected):
        return None
    if int(time.time()) - int(ts) > max_age_seconds:
        return None
    return user_id


@router.get("/me-status")
async def my_status(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Returns whether the current user has linked Strava. Returns 503 if
    Strava isn't configured server-side, so the UI can hide the section."""
    if not strava_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Strava integration is not configured.",
        )
    return {
        "strava_athlete_id": user.strava_athlete_id,
        "expires_at": user.strava_expires_at.isoformat() if user.strava_expires_at else None,
    }


@router.get("/authorize")
async def authorize(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Returns the Strava OAuth URL the runner should be redirected to.

    Frontend reads `url` from the response and does
    `window.location.href = url`. We don't 302 here so the SPA can show
    a loading state."""
    if not strava_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Strava integration is not configured.",
        )
    state = _sign_state(str(user.id))
    return {"url": strava_service.authorize_url(state)}


@router.get("/callback")
async def callback(
    code: str,
    state: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> RedirectResponse:
    """Strava redirects the runner here after they grant access.
    Exchanges the auth code for tokens, persists them on the user,
    redirects to the runner profile."""
    if not strava_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Strava integration is not configured.",
        )
    user_id = _verify_state(state)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state. Try connecting again.",
        )

    try:
        tokens = await strava_service.exchange_code(code)
    except Exception as exc:
        logger.warning("strava.exchange_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Strava rejected the connection. Try again.",
        ) from exc

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    user.strava_access_token = tokens.get("access_token")
    user.strava_refresh_token = tokens.get("refresh_token")
    expires = tokens.get("expires_at")
    if expires:
        user.strava_expires_at = datetime.fromtimestamp(expires, tz=UTC)
    athlete = tokens.get("athlete") or {}
    if athlete.get("id"):
        user.strava_athlete_id = int(athlete["id"])

    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.strava_connected",
        actor=user,
        request=request,
    )
    await db.commit()

    return RedirectResponse(
        f"{settings.FRONTEND_URL}/runner/profile?strava=connected",
        status_code=302,
    )


@router.post("/disconnect")
async def disconnect(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> dict:
    """Forget Strava tokens. We don't revoke on Strava's side — the user
    can do that from their Strava settings if they want."""
    user.strava_access_token = None
    user.strava_refresh_token = None
    user.strava_expires_at = None
    user.strava_athlete_id = None
    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.strava_disconnected",
        actor=user,
        request=request,
    )
    await db.commit()
    return {"ok": True}


async def _ensure_fresh_token(user: User, db: AsyncSession) -> str | None:
    """Refresh the Strava access token if it's within 5 minutes of expiry."""
    if not user.strava_access_token:
        return None
    needs_refresh = (
        user.strava_expires_at is None
        or user.strava_expires_at - timedelta(minutes=5) <= datetime.now(UTC)
    )
    if needs_refresh and user.strava_refresh_token:
        try:
            tokens = await strava_service.refresh_access(
                user.strava_refresh_token
            )
            user.strava_access_token = tokens.get("access_token")
            user.strava_refresh_token = tokens.get("refresh_token")
            expires = tokens.get("expires_at")
            if expires:
                user.strava_expires_at = datetime.fromtimestamp(expires, tz=UTC)
            await db.commit()
        except Exception as exc:
            logger.warning("strava.refresh_failed", error=str(exc))
            return None
    return user.strava_access_token


@router.post("/sync")
async def sync_activities(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> dict:
    """Pull the runner's recent (last 14 days) Strava activities and
    create SUBMITTED distance logs against ALL their active event_runners.

    Manager still approves each log via the existing queue — Strava just
    seeds the entries."""
    if not strava_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Strava integration is not configured.",
        )
    token = await _ensure_fresh_token(user, db)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect Strava first.",
        )

    after = int((datetime.now(UTC) - timedelta(days=14)).timestamp())
    try:
        activities = await strava_service.list_recent_activities(
            token, after=after, per_page=30
        )
    except Exception as exc:
        logger.warning("strava.list_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Strava is unavailable. Try again later.",
        ) from exc

    runs = [
        a
        for a in activities
        if (a.get("type") in ("Run", "TrailRun", "VirtualRun"))
        and (a.get("distance") or 0) > 0
    ]
    if not runs:
        return {"imported": 0, "scanned": len(activities)}

    er_res = await db.execute(
        select(EventRunner).where(
            EventRunner.user_id == user.id,
            EventRunner.status.in_(
                (RunnerStatus.APPROVED, RunnerStatus.ACTIVE)
            ),
        )
    )
    runners = list(er_res.scalars().all())
    if not runners:
        return {"imported": 0, "scanned": len(activities), "reason": "no active events"}

    imported = 0
    for er in runners:
        for a in runs:
            strava_id = str(a.get("id"))
            # Idempotency: skip if we already imported this strava activity for this runner
            existing = await db.execute(
                select(DistanceLog).where(
                    DistanceLog.event_runner_id == er.id,
                    DistanceLog.proof_source == DistanceProofSource.STRAVA,
                    DistanceLog.notes.like(f"%strava:{strava_id}%"),
                )
            )
            if existing.scalar_one_or_none():
                continue
            distance_km = Decimal(str(a.get("distance", 0))) / Decimal("1000")
            start = a.get("start_date_local") or a.get("start_date")
            log = DistanceLog(
                event_runner_id=er.id,
                distance_km=distance_km.quantize(Decimal("0.01")),
                activity_date=(
                    datetime.fromisoformat(start.replace("Z", "+00:00")).date()
                    if start
                    else datetime.now(UTC).date()
                ),
                proof_source=DistanceProofSource.STRAVA,
                proof_url=f"https://www.strava.com/activities/{strava_id}",
                notes=f"Imported from Strava (strava:{strava_id})",
                status=DistanceStatus.SUBMITTED,
            )
            db.add(log)
            imported += 1

    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.strava_synced",
        actor=user,
        metadata={"imported": imported},
        request=request,
    )
    await db.commit()
    return {"imported": imported, "scanned": len(activities)}
