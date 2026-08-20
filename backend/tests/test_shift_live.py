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
async def test_shift_live_rejects_non_admin(picker_client):
    response = await picker_client.get("/api/v1/dashboard/shift-live")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_hourly_buckets_cover_four_hours(db_session):
    from app.services.shift_live_service import _hourly_buckets, CHART_BUCKET_MINUTES, CHART_WINDOW_HOURS

    buckets = await _hourly_buckets(db_session)
    expected = (CHART_WINDOW_HOURS * 60) // CHART_BUCKET_MINUTES
    assert len(buckets) == expected

    from datetime import datetime

    first = datetime.fromisoformat(buckets[0]["time"])
    last = datetime.fromisoformat(buckets[-1]["time"])
    span_minutes = (last - first).total_seconds() / 60 + CHART_BUCKET_MINUTES
    assert span_minutes == CHART_WINDOW_HOURS * 60


@pytest.mark.asyncio
async def test_shift_live_json_serializable(db_session):
    from app.services.shift_live_service import build_shift_live_snapshot_json

    payload = await build_shift_live_snapshot_json(db_session)
    serialized = json.dumps(payload)
    assert "items_picked" in serialized
    assert len(payload["hourly_buckets"]) == 16
    assert payload.get("chart_window_start")
    assert payload.get("chart_window_end")
