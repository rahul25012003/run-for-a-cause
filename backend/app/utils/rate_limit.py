"""Lightweight in-memory rate limiter for auth + upload endpoints.

Token-bucket per (key, route). Key is client IP by default. Doesn't survive
restart and isn't shared across workers — fine for single-instance dev and
small deploys; for production scale, swap the storage to Redis.

Usage:
    @router.post("/login")
    async def login(
        request: Request,
        _: None = Depends(rate_limit("auth.login", per_minute=10)),
    ):
        ...
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

# {(key, route): deque[timestamps]} — old timestamps drop out of the window
# when checked. defaultdict keeps the first hit cheap.
_HITS: dict[tuple[str, str], deque[float]] = defaultdict(lambda: deque())


def _client_key(request: Request) -> str:
    """Best-effort client identifier. Reads X-Forwarded-For when running
    behind a reverse proxy, falls back to direct peer IP, falls back to the
    string 'anon' so unknown clients still rate-limit."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        # First IP in the list is the original client
        return fwd.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "anon"


def rate_limit(
    route: str,
    *,
    per_minute: int,
    burst: int | None = None,
):
    """Returns a FastAPI Depends-able guard.

    Args:
        route:      logical name in the limiter store (lets us limit
                    /auth/login and /auth/register independently)
        per_minute: average allowed requests per 60s window
        burst:      max in any 10s window (defaults to per_minute / 4)
    """
    burst_limit = burst if burst is not None else max(2, per_minute // 4)

    async def guard(request: Request) -> None:
        key = (_client_key(request), route)
        now = time.monotonic()
        window = _HITS[key]

        # Drop timestamps older than 60s
        cutoff = now - 60.0
        while window and window[0] < cutoff:
            window.popleft()

        # Per-minute cap
        if len(window) >= per_minute:
            retry = int(60 - (now - window[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry}s.",
                headers={"Retry-After": str(retry)},
            )

        # Burst cap (last 10s)
        burst_cutoff = now - 10.0
        recent = sum(1 for ts in window if ts >= burst_cutoff)
        if recent >= burst_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Slow down — too many requests in a short window.",
                headers={"Retry-After": "10"},
            )

        window.append(now)

    return Depends(guard)


# Common limiter dependencies (import these instead of recreating per route)
RateLimitAuth = Annotated[None, rate_limit("auth", per_minute=10, burst=5)]
RateLimitRegister = Annotated[None, rate_limit("auth.register", per_minute=5, burst=3)]
RateLimitUpload = Annotated[None, rate_limit("upload", per_minute=30, burst=10)]
RateLimitNewsletter = Annotated[
    None, rate_limit("newsletter", per_minute=5, burst=3)
]
