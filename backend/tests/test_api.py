"""HTTP integration tests for core API endpoints."""
import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register_and_login(client, admin_headers):
    register_resp = await client.post(
        "/api/v1/auth/register",
        headers=admin_headers,
        json={
            "email": "api@test.local",
            "password": "password123",
            "full_name": "API User",
            "role": "PICKER",
        },
    )
    assert register_resp.status_code == 201
    assert register_resp.json()["email"] == "api@test.local"

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "api@test.local", "password": "password123"},
    )
    assert login_resp.status_code == 200
    body = login_resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client, seeded_db):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.local", "password": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_inventory_requires_auth(client):
    response = await client.get("/api/v1/inventory/?page=1&size=10")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_inventory_list(client, admin_headers):
    response = await client.get("/api/v1/inventory/?page=1&size=10", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2


@pytest.mark.asyncio
async def test_create_wave_via_api(client, admin_headers):
    orders_resp = await client.get("/api/v1/orders", headers=admin_headers)
    assert orders_resp.status_code == 200
    orders = orders_resp.json()
    assert len(orders) >= 1

    wave_resp = await client.post(
        "/api/v1/waves",
        headers=admin_headers,
        json={"order_ids": [orders[0]["id"]]},
    )
    assert wave_resp.status_code == 201
    wave = wave_resp.json()
    assert "wave_number" in wave
    assert wave["total_orders_count"] == 1
    assert wave["progress"] == 0.0
