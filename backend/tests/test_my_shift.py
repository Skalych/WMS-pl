"""Tests for self-scoped My Shift endpoints."""
import pytest


@pytest.mark.asyncio
async def test_my_shift_requires_auth(client):
    response = await client.get("/api/v1/users/me/shift")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_my_shift_without_active_shift(picker_client):
    response = await picker_client.get("/api/v1/users/me/shift")
    assert response.status_code == 200
    data = response.json()
    assert data["has_active_shift"] is False
    assert data["role"] == "PICKER"
    assert data["total_items_picked"] == 0


@pytest.mark.asyncio
async def test_my_shift_break_flow(picker_client, admin_client, seeded_db):
    picker_id = str(seeded_db["picker"].id)
    start = await admin_client.post("/api/v1/users/shift/start", json={"user_ids": [picker_id]})
    assert start.status_code == 200

    snap = await picker_client.get("/api/v1/users/me/shift")
    assert snap.status_code == 200
    assert snap.json()["has_active_shift"] is True

    br = await picker_client.post("/api/v1/users/me/break/start")
    assert br.status_code == 200
    assert br.json()["on_break"] is True
    assert br.json()["status"] == "BREAK"

    end = await picker_client.post("/api/v1/users/me/break/end")
    assert end.status_code == 200
    assert end.json()["on_break"] is False


@pytest.mark.asyncio
async def test_my_shift_includes_break_fields(picker_client, admin_client, seeded_db):
    picker_id = str(seeded_db["picker"].id)
    await admin_client.post("/api/v1/users/shift/start", json={"user_ids": [picker_id]})
    await picker_client.post("/api/v1/users/me/break/start")

    snap = await picker_client.get("/api/v1/users/me/shift")
    assert snap.status_code == 200
    data = snap.json()
    assert data["break_count"] == 1
    assert data["current_break_started_at"] is not None
    assert data["break_minutes"] >= 0
