"""Tests for live shift dashboard endpoint."""
import json

import pytest


@pytest.mark.asyncio
async def test_shift_live_endpoint(admin_client):
    response = await admin_client.get("/api/v1/dashboard/shift-live")
    assert response.status_code == 200
    data = response.json()
    assert "items_picked" in data
    assert "shift_active" in data
    assert "hourly_buckets" in data
    assert "recent_events" in data
    assert "top_pickers" in data
    assert "pick_rate_per_hour" in data


@pytest.mark.asyncio
async def test_shift_live_requires_auth(client):
    response = await client.get("/api/v1/dashboard/shift-live")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_shift_live_json_serializable(db_session):
    from app.services.shift_live_service import build_shift_live_snapshot_json

    payload = await build_shift_live_snapshot_json(db_session)
    serialized = json.dumps(payload)
    assert "items_picked" in serialized
