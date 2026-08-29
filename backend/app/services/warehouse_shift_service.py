"""Warehouse shift lifecycle, listing, and report drafts."""
from __future__ import annotations

import uuid
from datetime import datetime, date, time, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.users import Shift
from app.models.warehouse_shifts import WarehouseShift, ShiftReportDraft
from app.services.shift_metrics_service import compute_shift_metrics, metrics_to_snapshot
from app.services.report_template import build_default_report_content


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def get_open_warehouse_shift(db: AsyncSession) -> Optional[WarehouseShift]:
    result = await db.execute(
        select(WarehouseShift).where(WarehouseShift.ended_at.is_(None)).order_by(WarehouseShift.started_at.desc())
    )
    return result.scalars().first()


def _active_open_shift_cutoff() -> datetime:
    """Ignore orphan open worker shifts older than this window."""
    return _utcnow() - timedelta(hours=48)


async def _earliest_open_worker_start(db: AsyncSession) -> Optional[datetime]:
    cutoff = _active_open_shift_cutoff()
    earliest = await db.scalar(
        select(func.min(Shift.start_time)).where(
            Shift.end_time.is_(None),
            Shift.start_time >= cutoff,
        )
    )
    if not earliest:
        return None
    return _ensure_utc(earliest)


async def ensure_open_warehouse_shift(
    db: AsyncSession, started_by: Optional[uuid.UUID] = None
) -> WarehouseShift:
    existing = await get_open_warehouse_shift(db)
    earliest = await _earliest_open_worker_start(db)

    if existing:
        if earliest and earliest < _ensure_utc(existing.started_at):
            existing.started_at = earliest
            db.add(existing)
            await db.commit()
            await db.refresh(existing)
        return existing

    started_at = earliest or _utcnow()
    ws = WarehouseShift(
        id=uuid.uuid4(),
        started_at=started_at,
        started_by=started_by,
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return ws


async def count_open_worker_shifts(db: AsyncSession) -> int:
    cutoff = _active_open_shift_cutoff()
    return int(
        await db.scalar(
            select(func.count()).select_from(Shift).where(
                Shift.end_time.is_(None),
                Shift.start_time >= cutoff,
            )
        ) or 0
    )


async def maybe_close_warehouse_shift(
    db: AsyncSession, ended_by: Optional[uuid.UUID] = None
) -> Optional[WarehouseShift]:
    if await count_open_worker_shifts(db) > 0:
        return None

    open_ws = await get_open_warehouse_shift(db)
    if not open_ws:
        return None

    end = _utcnow()
    metrics = await compute_shift_metrics(db, open_ws.started_at, end=end, live=False)
    open_ws.ended_at = end
    open_ws.ended_by = ended_by
    open_ws.metrics_snapshot = metrics_to_snapshot(metrics)
    db.add(open_ws)
    await db.commit()
    await db.refresh(open_ws)
    return open_ws


async def get_warehouse_shift(db: AsyncSession, shift_id: uuid.UUID) -> Optional[WarehouseShift]:
    result = await db.execute(
        select(WarehouseShift)
        .options(selectinload(WarehouseShift.report_draft))
        .where(WarehouseShift.id == shift_id)
    )
    return result.scalars().first()


async def resolve_metrics_for_shift(db: AsyncSession, ws: WarehouseShift) -> dict[str, Any]:
    if ws.ended_at and ws.metrics_snapshot:
        snap = dict(ws.metrics_snapshot)
        snap.setdefault("hourly_buckets", [])
        snap.setdefault("top_pickers", [])
        snap.setdefault("waves_active", 0)
        snap.setdefault("pickers_online", 0)
        snap.setdefault("orders_shipped", snap.get("orders_shipped", 0))
        snap.setdefault("bucket_minutes", 15)
        bucket_picked = sum(int(b.get("picked") or 0) for b in snap.get("hourly_buckets") or [])
        items_picked = int(snap.get("items_picked") or 0)
        if items_picked > 0 and bucket_picked == 0:
            recomputed = await compute_shift_metrics(
                db, ws.started_at, end=ws.ended_at, live=False
            )
            snap["hourly_buckets"] = recomputed.get("hourly_buckets") or []
            snap["bucket_minutes"] = recomputed.get("bucket_minutes", 15)
        return snap

    end = ws.ended_at or _utcnow()
    start = _ensure_utc(ws.started_at)
    if ws.ended_at is None:
        earliest = await _earliest_open_worker_start(db)
        if earliest and earliest < start:
            start = earliest
    metrics = await compute_shift_metrics(
        db, start, end=end, live=ws.ended_at is None
    )
    return metrics_to_snapshot(metrics) if ws.ended_at else metrics_to_snapshot(
        {**metrics, "shift_active": True}
    )


def _summary_from_ws_and_metrics(ws: WarehouseShift, metrics: dict[str, Any]) -> dict[str, Any]:
    started = _ensure_utc(ws.started_at)
    ended = _ensure_utc(ws.ended_at) if ws.ended_at else None
    elapsed = int(metrics.get("elapsed_seconds") or 0)
    if not elapsed:
        end = ended or _utcnow()
        elapsed = max(int((end - started).total_seconds()), 0)

    top = metrics.get("top_pickers") or []
    buckets = metrics.get("hourly_buckets") or []

    return {
        "id": ws.id,
        "started_at": started,
        "ended_at": ended,
        "is_active": ws.ended_at is None,
        "elapsed_seconds": elapsed,
        "items_picked": int(metrics.get("items_picked") or 0),
        "waves_completed": int(metrics.get("waves_completed") or 0),
        "orders_shipped": int(metrics.get("orders_shipped") or 0),
        "inbound_received_units": int(metrics.get("inbound_received_units") or 0),
        "pick_rate_per_hour": float(metrics.get("pick_rate_per_hour") or 0),
        "top_pickers": top,
        "hourly_buckets": buckets,
    }


async def backfill_from_worker_shifts(db: AsyncSession) -> int:
    """Create warehouse_shifts for calendar days that have worker shifts but no WS yet."""
    existing = await db.execute(select(WarehouseShift.started_at, WarehouseShift.ended_at))
    covered_days: set[date] = set()
    for started_at, ended_at in existing.all():
        covered_days.add(_ensure_utc(started_at).date())

    # Also skip day of currently open WS
    open_ws = await get_open_warehouse_shift(db)
    if open_ws:
        covered_days.add(_ensure_utc(open_ws.started_at).date())

    result = await db.execute(
        select(Shift.start_time, Shift.end_time).order_by(Shift.start_time.asc())
    )
    by_day: dict[date, list[tuple[datetime, Optional[datetime]]]] = {}
    for start_time, end_time in result.all():
        start_time = _ensure_utc(start_time)
        end_time = _ensure_utc(end_time) if end_time else None
        day = start_time.date()
        by_day.setdefault(day, []).append((start_time, end_time))

    today = _utcnow().date()
    created = 0
    for day, spans in by_day.items():
        if day in covered_days:
            continue

        closed_spans = [(s, e) for s, e in spans if e is not None]
        if day >= today:
            # Live day: wait until all worker shifts are closed
            if any(e is None for _, e in spans):
                continue
            use_spans = spans
        else:
            # Past day: build report from closed shifts; ignore orphan open records
            if not closed_spans:
                continue
            use_spans = closed_spans

        day_start = min(s for s, _ in use_spans)
        day_end = max(e for _, e in use_spans if e is not None)
        metrics = await compute_shift_metrics(db, day_start, end=day_end, live=False)
        ws = WarehouseShift(
            id=uuid.uuid4(),
            started_at=day_start,
            ended_at=day_end,
            metrics_snapshot=metrics_to_snapshot(metrics),
        )
        db.add(ws)
        created += 1

    if created:
        await db.commit()
    return created


async def list_warehouse_shifts(
    db: AsyncSession,
    *,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[dict[str, Any]]:
    # If workers are on shift but no warehouse window exists yet, open one
    if await count_open_worker_shifts(db) > 0:
        await ensure_open_warehouse_shift(db)

    await backfill_from_worker_shifts(db)

    query = select(WarehouseShift).order_by(WarehouseShift.started_at.desc())
    if date_from is not None:
        start_dt = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        query = query.where(WarehouseShift.started_at >= start_dt)
    if date_to is not None:
        end_dt = datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        query = query.where(WarehouseShift.started_at <= end_dt)

    result = await db.execute(query)
    shifts = result.scalars().all()
    out: list[dict[str, Any]] = []
    for ws in shifts:
        metrics = await resolve_metrics_for_shift(db, ws)
        out.append(_summary_from_ws_and_metrics(ws, metrics))
    return out


async def get_warehouse_shift_detail(db: AsyncSession, shift_id: uuid.UUID) -> Optional[dict[str, Any]]:
    ws = await get_warehouse_shift(db, shift_id)
    if not ws:
        return None
    metrics = await resolve_metrics_for_shift(db, ws)
    summary = _summary_from_ws_and_metrics(ws, metrics)
    summary["metrics"] = metrics
    return summary


def _format_duration(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    return f"{h} год {m:02d} хв"


async def get_or_create_report_draft(
    db: AsyncSession,
    shift_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = None,
) -> Optional[ShiftReportDraft]:
    ws = await get_warehouse_shift(db, shift_id)
    if not ws:
        return None

    if ws.report_draft:
        return ws.report_draft

    metrics = await resolve_metrics_for_shift(db, ws)
    started = _ensure_utc(ws.started_at)
    title = f"Звіт за зміну {started.strftime('%d.%m.%Y')}"
    content = build_default_report_content(
        started_at=started,
        ended_at=_ensure_utc(ws.ended_at) if ws.ended_at else None,
        duration_label=_format_duration(int(metrics.get("elapsed_seconds") or 0)),
        metrics=metrics,
    )
    draft = ShiftReportDraft(
        id=uuid.uuid4(),
        warehouse_shift_id=ws.id,
        title=title,
        content_json=content,
        updated_by=user_id,
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def update_report_draft(
    db: AsyncSession,
    shift_id: uuid.UUID,
    *,
    title: Optional[str] = None,
    content_json: Optional[dict[str, Any]] = None,
    user_id: Optional[uuid.UUID] = None,
) -> Optional[ShiftReportDraft]:
    draft = await get_or_create_report_draft(db, shift_id, user_id=user_id)
    if not draft:
        return None
    if title is not None:
        draft.title = title
    if content_json is not None:
        draft.content_json = content_json
    draft.updated_by = user_id
    draft.updated_at = _utcnow()
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def reset_report_draft(
    db: AsyncSession,
    shift_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = None,
) -> Optional[ShiftReportDraft]:
    ws = await get_warehouse_shift(db, shift_id)
    if not ws:
        return None

    metrics = await resolve_metrics_for_shift(db, ws)
    started = _ensure_utc(ws.started_at)
    title = f"Звіт за зміну {started.strftime('%d.%m.%Y')}"
    content = build_default_report_content(
        started_at=started,
        ended_at=_ensure_utc(ws.ended_at) if ws.ended_at else None,
        duration_label=_format_duration(int(metrics.get("elapsed_seconds") or 0)),
        metrics=metrics,
    )

    draft = ws.report_draft
    if draft:
        draft.title = title
        draft.content_json = content
        draft.updated_by = user_id
        draft.updated_at = _utcnow()
    else:
        draft = ShiftReportDraft(
            id=uuid.uuid4(),
            warehouse_shift_id=ws.id,
            title=title,
            content_json=content,
            updated_by=user_id,
        )
        db.add(draft)

    await db.commit()
    await db.refresh(draft)
    return draft
