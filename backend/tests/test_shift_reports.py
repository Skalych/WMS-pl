"""Tests for warehouse shift report helpers."""
import uuid
from datetime import datetime, timezone, timedelta

import pytest

from app.models.users import Shift, User
from app.models.warehouse_shifts import WarehouseShift
from app.services import warehouse_shift_service
from app.services.report_template import build_default_report_content
from app.services.report_export_service import export_report
from app.models.enums import UserRole
from app.core.security import hash_password


def test_default_report_template_has_headings():
    content = build_default_report_content(
        started_at=datetime(2026, 8, 23, 8, 0, tzinfo=timezone.utc),
        ended_at=datetime(2026, 8, 23, 16, 0, tzinfo=timezone.utc),
        duration_label="8 год 00 хв",
        metrics={
            "items_picked": 120,
            "waves_completed": 4,
            "inbound_received_units": 50,
            "pick_rate_per_hour": 15.0,
            "orders_shipped": 10,
            "top_pickers": [{"name": "Anna", "items": 40, "pct_of_leader": 100}],
            "hourly_buckets": [{"time": "2026-08-23T08:00:00+00:00", "picked": 5, "inbound": 1}],
        },
    )
    assert content["type"] == "doc"
    texts = []
    for node in content["content"]:
        if node.get("type") == "heading":
            texts.append(node["content"][0]["text"])
    assert any("Звіт за складську зміну" in t for t in texts)


@pytest.mark.parametrize("fmt", ["pdf", "html", "docx"])
def test_export_formats(fmt):
    content, media, name = export_report("<h1>Hi</h1><p>Body</p>", "Demo Report", fmt)
    assert len(content) > 20
    assert name.endswith(f".{fmt}")
    assert media


@pytest.mark.asyncio
async def test_backfill_past_day_with_orphan_open_shift(db_session):
    """Past days with a forgotten open shift should still get a warehouse report."""
    user = User(
        id=uuid.uuid4(),
        email="orphan@test.local",
        password_hash=hash_password("x"),
        full_name="Orphan",
        role=UserRole.PICKER,
    )
    db_session.add(user)
    await db_session.flush()

    past_day = datetime.now(timezone.utc) - timedelta(days=7)
    past_day = past_day.replace(hour=9, minute=0, second=0, microsecond=0)
    closed_end = past_day + timedelta(hours=7)
    orphan_start = past_day + timedelta(hours=8)

    db_session.add(Shift(
        id=uuid.uuid4(),
        user_id=user.id,
        start_time=past_day,
        end_time=closed_end,
    ))
    db_session.add(Shift(
        id=uuid.uuid4(),
        user_id=user.id,
        start_time=orphan_start,
        end_time=None,
    ))
    await db_session.commit()

    created = await warehouse_shift_service.backfill_from_worker_shifts(db_session)
    assert created == 1

    rows = await warehouse_shift_service.list_warehouse_shifts(db_session)
    closed = [r for r in rows if r["ended_at"] is not None]
    assert len(closed) == 1
    assert closed[0]["items_picked"] >= 0
