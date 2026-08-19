"""Tests for GET /users/me endpoint."""
import pytest


@pytest.mark.asyncio
async def test_users_me_returns_profile(admin_client, seeded_db):
    response = await admin_client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == seeded_db["admin"].email
    assert data["role"] == "ADMIN_MANAGER"
    assert data["full_name"] == "Test Admin"


@pytest.mark.asyncio
async def test_users_me_requires_auth(client):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_users_me_picker_role(picker_client, seeded_db):
    response = await picker_client.get("/api/v1/users/me")
    assert response.status_code == 200
    assert response.json()["role"] == "PICKER"
