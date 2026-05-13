"""Strava OAuth + activity sync (C1).

Three steps to use:
  1. Register an app at https://www.strava.com/settings/api
  2. Set STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REDIRECT_URI in env
  3. The runner clicks "Connect Strava" → we redirect to Strava → on callback
     we exchange the code for an access+refresh token (stored on the user
     row — column add deferred to migration 0010 once keys exist)

Without keys, this module's helpers raise `RuntimeError("strava_not_configured")`.
The router gates calls behind `settings.STRAVA_CLIENT_ID` so users never see
a broken Connect button.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.config import settings

STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_API_BASE = "https://www.strava.com/api/v3"


def is_configured() -> bool:
    return bool(
        settings.STRAVA_CLIENT_ID
        and settings.STRAVA_CLIENT_SECRET
        and settings.STRAVA_REDIRECT_URI
    )


def authorize_url(state: str) -> str:
    """Build the Strava authorise URL the user is redirected to.

    `state` should be a CSRF-bound nonce the caller stores in a short-lived
    cookie or Redis entry; verify on callback.
    """
    if not is_configured():
        raise RuntimeError("strava_not_configured")
    from urllib.parse import urlencode

    params = {
        "client_id": settings.STRAVA_CLIENT_ID,
        "redirect_uri": settings.STRAVA_REDIRECT_URI,
        "response_type": "code",
        "approval_prompt": "auto",
        "scope": "read,activity:read",
        "state": state,
    }
    return f"{STRAVA_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict[str, Any]:
    """Exchange an OAuth code for {access_token, refresh_token, expires_at, athlete}."""
    if not is_configured():
        raise RuntimeError("strava_not_configured")
    payload = {
        "client_id": settings.STRAVA_CLIENT_ID,
        "client_secret": settings.STRAVA_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.post(STRAVA_TOKEN_URL, data=payload)
        r.raise_for_status()
        return r.json()


async def refresh_access(refresh_token: str) -> dict[str, Any]:
    if not is_configured():
        raise RuntimeError("strava_not_configured")
    payload = {
        "client_id": settings.STRAVA_CLIENT_ID,
        "client_secret": settings.STRAVA_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.post(STRAVA_TOKEN_URL, data=payload)
        r.raise_for_status()
        return r.json()


async def list_recent_activities(
    access_token: str, *, after: int | None = None, per_page: int = 30
) -> list[dict[str, Any]]:
    """Fetch the runner's recent activities. `after` = unix epoch lower bound."""
    if not is_configured():
        raise RuntimeError("strava_not_configured")
    params: dict[str, Any] = {"per_page": per_page}
    if after:
        params["after"] = after
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            f"{STRAVA_API_BASE}/athlete/activities",
            params=params,
            headers=headers,
        )
        r.raise_for_status()
        return r.json()
