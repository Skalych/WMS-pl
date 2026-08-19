"""Tests for Terminal API."""
import pytest


@pytest.mark.asyncio
async def test_terminal_login(client, seeded_db):
    response = await client.post(
        "/api/v1/terminal/login",
        json={"email": "picker@test.local", "pin": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_terminal_login_allows_admin(client, seeded_db):
    response = await client.post(
        "/api/v1/terminal/login",
        json={"email": "admin@test.local", "pin": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_get_next_task(picker_client, seeded_db):
    response = await picker_client.get("/api/v1/terminal/tasks/next")
    assert response.status_code == 200
    data = response.json()
    assert data is not None
    assert data["task_type"] == "BATCH_PICK"
    assert data["location_code"] == seeded_db["storage_loc"].code
    assert data["product_sku"] == seeded_db["product_small"].sku
    assert data["quantity_required"] == 5


@pytest.mark.asyncio
async def test_process_scan(picker_client, seeded_db):
    next_resp = await picker_client.get("/api/v1/terminal/tasks/next")
    task = next_resp.json()
    assert task is not None

    scan_resp = await picker_client.post(
        f"/api/v1/terminal/tasks/{task['task_id']}/scan",
        json={"barcode": seeded_db["product_small"].sku, "quantity": 2},
    )
    assert scan_resp.status_code == 200
    body = scan_resp.json()
    assert body["status"] == "accepted"
    assert body["quantity_picked"] == 2


@pytest.mark.asyncio
async def test_process_scan_invalid_barcode(picker_client, seeded_db):
    next_resp = await picker_client.get("/api/v1/terminal/tasks/next")
    task = next_resp.json()

    scan_resp = await picker_client.post(
        f"/api/v1/terminal/tasks/{task['task_id']}/scan",
        json={"barcode": "INVALID", "quantity": 1},
    )
    assert scan_resp.status_code == 400
