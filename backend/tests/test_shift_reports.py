"""Tests for warehouse shift report helpers."""
import pytest
from datetime import datetime, timezone

from app.services.report_template import build_default_report_content
from app.services.report_export_service import export_report


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
