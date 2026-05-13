"""Smoke tests — high-level public endpoints respond.

These don't validate business logic; they just check the routes are
mounted, the DB connection works, and basic shapes are correct. If
any of these fail, something fundamental is broken.
"""
from httpx import AsyncClient


async def test_health(client: AsyncClient) -> None:
    """Liveness probe."""
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_public_settings_returns_dict(client: AsyncClient) -> None:
    """Site settings public endpoint returns at least the seeded keys."""
    res = await client.get("/api/v1/site-settings/")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # A few keys we know are seeded
    assert "hero.heading" in data
    assert "footer.tagline" in data


async def test_public_events_list(client: AsyncClient) -> None:
    """Public event list returns a JSON array."""
    res = await client.get("/api/v1/events/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


async def test_public_organisations_list(client: AsyncClient) -> None:
    """Public organisations list returns a JSON array (verified by default)."""
    res = await client.get("/api/v1/organisations/?verified_only=false")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


async def test_public_stats(client: AsyncClient) -> None:
    """Aggregate platform stats endpoint."""
    res = await client.get("/api/v1/stats/public")
    assert res.status_code == 200
    data = res.json()
    assert "total_raised" in data
    assert "total_runners" in data


async def test_runners_spotlight(client: AsyncClient) -> None:
    """Spotlight endpoint for the home page."""
    res = await client.get("/api/v1/runners/spotlight?limit=3")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


async def test_unauthenticated_admin_returns_401(client: AsyncClient) -> None:
    """Admin endpoints reject unauthenticated requests."""
    res = await client.get("/api/v1/admin/stats")
    assert res.status_code in (401, 403)
