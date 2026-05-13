"""Authentication flow tests."""
from httpx import AsyncClient

from tests.conftest import ADMIN_CREDS, RUNNER_CREDS, login


async def test_login_success(client: AsyncClient) -> None:
    res = await client.post("/api/v1/auth/login", json=ADMIN_CREDS)
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["email"] == "admin@runforacause.in"
    assert body["user"]["role"] == "super_admin"


async def test_login_wrong_password(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@runforacause.in", "password": "wrong-password"},
    )
    assert res.status_code == 401


async def test_me_requires_login(client: AsyncClient) -> None:
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401


async def test_me_returns_logged_in_user(client: AsyncClient) -> None:
    await login(client, ADMIN_CREDS)
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "admin@runforacause.in"


async def test_logout_clears_session(client: AsyncClient) -> None:
    await login(client, ADMIN_CREDS)
    res = await client.post("/api/v1/auth/logout")
    assert res.status_code == 204
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401


async def test_register_validation(client: AsyncClient) -> None:
    """Reject too-short passwords."""
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newbie@example.com",
            "password": "short",
            "full_name": "Newbie",
        },
    )
    assert res.status_code == 422


async def test_data_export_requires_login(client: AsyncClient) -> None:
    res = await client.get("/api/v1/auth/me/data-export")
    assert res.status_code == 401


async def test_data_export_returns_shape(client: AsyncClient) -> None:
    await login(client, RUNNER_CREDS)
    res = await client.get("/api/v1/auth/me/data-export")
    assert res.status_code == 200
    data = res.json()
    assert "user" in data
    assert "donations" in data
    assert "runner_profiles" in data
    assert "achievements" in data
    assert "notifications" in data
    assert "exported_at" in data
