"""Tests for login rate limiting."""
import pytest

from app.core.rate_limit import login_rate_limiter


@pytest.fixture(autouse=True)
def enable_rate_limit(monkeypatch):
    monkeypatch.setattr("app.core.rate_limit.settings.RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr("app.core.rate_limit.settings.LOGIN_RATE_LIMIT", 3)
    login_rate_limiter.max_requests = 3
    login_rate_limiter._hits.clear()


@pytest.mark.asyncio
async def test_login_rate_limit(client):
    for _ in range(3):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.local", "password": "wrong"},
        )
        assert response.status_code == 401

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.local", "password": "wrong"},
    )
    assert response.status_code == 429
