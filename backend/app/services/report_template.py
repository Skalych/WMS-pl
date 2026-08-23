"""Default TipTap JSON template for warehouse shift reports."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional


def _text(text: str, marks: Optional[list] = None) -> dict:
    node: dict[str, Any] = {"type": "text", "text": text}
    if marks:
        node["marks"] = marks
    return node


def _paragraph(*texts: dict) -> dict:
    return {"type": "paragraph", "content": list(texts) if texts else []}


def _heading(level: int, text: str) -> dict:
    return {
        "type": "heading",
        "attrs": {"level": level},
        "content": [_text(text)],
    }


def _bullet_list(items: list[str]) -> dict:
    return {
        "type": "bulletList",
        "content": [
            {
                "type": "listItem",
                "content": [_paragraph(_text(item))],
            }
            for item in items
        ],
    }


def build_default_report_content(
    *,
    started_at: datetime,
    ended_at: Optional[datetime],
    duration_label: str,
    metrics: dict[str, Any],
) -> dict[str, Any]:
    date_label = started_at.strftime("%d.%m.%Y")
    start_label = started_at.strftime("%H:%M")
    end_label = ended_at.strftime("%H:%M") if ended_at else "триває"
    items = int(metrics.get("items_picked") or 0)
    waves = int(metrics.get("waves_completed") or 0)
    inbound = int(metrics.get("inbound_received_units") or 0)
    rate = float(metrics.get("pick_rate_per_hour") or 0)
    orders = int(metrics.get("orders_shipped") or 0)
    top = metrics.get("top_pickers") or []
    buckets = metrics.get("hourly_buckets") or []

    top_lines = [
        f"{p.get('name', '?')}: {p.get('items', 0)} items ({p.get('pct_of_leader', 0)}%)"
        for p in top
    ] or ["Немає даних по збирачах"]

    # Placeholder paragraphs for charts — frontend injects images on template build / reset
    chart_pace_note = (
        f"[Діаграма темпу] Інтервалів: {len(buckets)}. "
        "Після відкриття звіту діаграми підставляються автоматично."
    )
    chart_top_note = "[Діаграма топ збирачів] Підставляється в редакторі."

    content = [
        _heading(1, f"Звіт за складську зміну — {date_label}"),
        _paragraph(
            _text(
                f"Вікно зміни: {start_label} – {end_label} ({duration_label}).",
            )
        ),
        _heading(2, "Основні показники"),
        _bullet_list(
            [
                f"Виконано хвиль: {waves}",
                f"Зібрано items: {items}",
                f"Темп збору: {rate} items/год",
                f"Прийнято units: {inbound}",
                f"Відвантажено замовлень: {orders}",
            ]
        ),
        _heading(2, "Темп роботи"),
        _paragraph(_text(chart_pace_note)),
        _heading(2, "Топ збирачів"),
        _bullet_list(top_lines),
        _paragraph(_text(chart_top_note)),
        _heading(2, "Коментар керівника"),
        _paragraph(
            _text(
                "Тут можна додати підсумки зміни, проблеми на складі або плани на наступну зміну."
            )
        ),
    ]

    return {"type": "doc", "content": content}
