"""Tests for JWT auth dependencies and RBAC."""
import pytest


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client):
    response = await client.get("/api/v1/inventory/?page=1&size=10")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_can_access_users(client, admin_headers):
    response = await client.get("/api/v1/users", headers=admin_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 2


@pytest.mark.asyncio
async def test_picker_cannot_access_users(client, picker_headers):
    response = await client.get("/api/v1/users", headers=picker_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_picker_can_read_inventory(client, picker_headers):
    response = await client.get("/api/v1/inventory/?page=1&size=10", headers=picker_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_picker_cannot_create_wave(client, picker_headers, seeded_db):
    response = await client.post(
        "/api/v1/waves",
        headers=picker_headers,
        json={"order_ids": [str(seeded_db["order"].id)]},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_register_requires_admin(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "blocked@test.local",
            "password": "password123",
            "full_name": "Blocked",
            "role": "PICKER",
        },
    )
    assert response.status_code == 401
