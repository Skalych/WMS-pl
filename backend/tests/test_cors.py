"""CORS middleware: allowlisted origins only (no wildcard)."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app

ALLOWED_ORIGIN = "http://localhost:3000"
EVIL_ORIGIN = "https://evil.example"


@pytest.fixture
async def cors_client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_preflight_allows_configured_origin(cors_client: AsyncClient):
    assert ALLOWED_ORIGIN in settings.CORS_ORIGINS

    response = await cors_client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.asyncio
async def test_preflight_rejects_evil_origin(cors_client: AsyncClient):
    response = await cors_client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": EVIL_ORIGIN,
            "Access-Control-Request-Method": "POST",
        },
    )

    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin != EVIL_ORIGIN
    assert allow_origin != "*"


@pytest.mark.asyncio
async def test_health_works_regardless_of_cors(cors_client: AsyncClient):
    response = await cors_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_origins_have_no_wildcard():
    assert "*" not in settings.CORS_ORIGINS
    assert "http://127.0.0.1:3000" in settings.CORS_ORIGINS
