"""Shared pytest fixtures.

Provides:
- `client`: async HTTP client wired to the FastAPI app via ASGITransport.
  Cookies persist across requests on the same client (so login sticks).
- `db_session`: async SQLAlchemy session for direct DB inspection.

Tests use the live development database. To use a separate test DB,
override `DATABASE_URL` via environment variable before importing
`app.config`.
"""
from __future__ import annotations

# IMPORTANT: switch to SelectorEventLoop on Windows BEFORE importing
# anything that creates an asyncpg engine. The default ProactorEventLoop
# crashes during connection cleanup with "'NoneType' object has no
# attribute 'send'" — a known asyncpg + Windows + ProactorEventLoop bug.
import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Override the default function-scoped event_loop with a session-scoped
    one. Required so the asyncpg engine pool (module-level singleton) and
    every test share the same loop — otherwise asyncpg connections created
    on test N's loop can't be torn down on test N+1's loop.
    """
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """A fresh httpx client per test, bound to the FastAPI app in-process.

    Cookies persist across requests on the same client instance, so login
    flows can be tested end-to-end without re-authenticating.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        follow_redirects=True,
    ) as c:
        yield c


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """Direct DB session for assertions / data setup.

    Don't use this for the SUT (system under test) — let the API endpoints
    own their sessions. This is for verifying side effects after a request
    and for seeding pre-conditions.
    """
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


# Helper functions (not pytest fixtures) — tests call these to log in
# inline rather than depend on a chained async fixture. Chained fixtures
# create cross-loop async cleanup races on Windows + asyncpg.

ADMIN_CREDS = {"email": "admin@runforacause.in", "password": "Admin@1234"}
MANAGER_CREDS = {
    "email": "contact@ashafoundation.in",
    "password": "Manager@1234",
}
RUNNER_CREDS = {
    "email": "meera.gupta@example.com",
    "password": "Runner@1234",
}


async def login(client: AsyncClient, creds: dict) -> None:
    """Log in via the API. Cookies persist on the client for subsequent calls."""
    res = await client.post("/api/v1/auth/login", json=creds)
    assert res.status_code == 200, f"login failed: {res.text}"
