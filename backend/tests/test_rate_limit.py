"""Verify the in-memory rate limiter blocks abuse but lets normal traffic through."""
from httpx import AsyncClient


async def test_login_rate_limit_kicks_in(client: AsyncClient) -> None:
    """11 quick login attempts should hit the 10/min cap."""
    # 5 burst-cap; 10/min total. Hammer past both.
    last_status = 200
    for _ in range(20):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "x@x.com", "password": "wrong"},
        )
        last_status = res.status_code
        if last_status == 429:
            break
    assert last_status == 429, "rate limiter should have triggered"


async def test_health_not_rate_limited(client: AsyncClient) -> None:
    """Health endpoint must never be rate-limited."""
    for _ in range(15):
        res = await client.get("/health")
        assert res.status_code == 200
