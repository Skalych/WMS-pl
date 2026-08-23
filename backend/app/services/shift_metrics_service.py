"""Compute warehouse shift metrics for a time window (live or historical)."""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.enums import TransactionType, UserRole, WorkerStatus, WaveStatus, OrderStatus
from app.models.inventory import InventoryTransaction
from app.models.orders import Order
from app.models.users import Shift, User
from app.models.waves import Wave, MicroTaskItem, MicroTask
from app.services import order_service, wave_service

CHART_WINDOW_HOURS = 4
CHART_BUCKET_MINUTES = 15
MAX_HISTORICAL_BUCKETS = 48


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _floor_to_bucket(dt: datetime, minutes: int = CHART_BUCKET_MINUTES) -> datetime:
    dt = _ensure_utc(dt)
    return dt.replace(minute=(dt.minute // minutes) * minutes, second=0, microsecond=0)


async def _items_picked_in_window(db: AsyncSession, start: datetime, end: datetime) -> int:
    from_tx = await db.scalar(
        select(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).where(
            InventoryTransaction.transaction_type == TransactionType.WAVE_PICK_BATCH,
            InventoryTransaction.created_at >= start,
            InventoryTransaction.created_at <= end,
        )
    )
    if from_tx and int(from_tx) > 0:
        return int(from_tx)

    shift_sum = await db.scalar(
        select(func.coalesce(func.sum(Shift.total_items_picked), 0)).where(
            Shift.start_time >= start,
            Shift.start_time <= end,
        )
    )
    if shift_sum and int(shift_sum) > 0:
        return int(shift_sum)

    task_sum = await db.scalar(
        select(func.coalesce(func.sum(MicroTaskItem.quantity_picked), 0))
        .join(MicroTask, MicroTaskItem.micro_task_id == MicroTask.id)
        .join(Wave, MicroTask.wave_id == Wave.id)
        .where(Wave.created_at >= start, Wave.created_at <= end)
    )
    return int(task_sum or 0)


async def _inbound_units_in_window(db: AsyncSession, start: datetime, end: datetime) -> int:
    total = await db.scalar(
        select(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).where(
            InventoryTransaction.transaction_type == TransactionType.RECEIPT,
            InventoryTransaction.created_at >= start,
            InventoryTransaction.created_at <= end,
        )
    )
    return int(total or 0)


async def _items_picked_last_minutes(db: AsyncSession, minutes: int, as_of: datetime) -> int:
    since = as_of - timedelta(minutes=minutes)
    total = await db.scalar(
        select(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).where(
            InventoryTransaction.transaction_type == TransactionType.WAVE_PICK_BATCH,
            InventoryTransaction.created_at >= since,
            InventoryTransaction.created_at <= as_of,
        )
    )
    return int(total or 0)


async def _waves_completed_in_window(db: AsyncSession, start: datetime, end: datetime) -> int:
    count = await db.scalar(
        select(func.count()).select_from(Wave).where(
            Wave.status.in_([WaveStatus.PICKED, WaveStatus.COMPLETED, WaveStatus.SORTING]),
            Wave.updated_at >= start,
            Wave.updated_at <= end,
        )
    )
    return int(count or 0)


async def _pickers_online(db: AsyncSession) -> int:
    count = await db.scalar(
        select(func.count()).select_from(User).where(
            User.role == UserRole.PICKER,
            User.status.in_([WorkerStatus.PICKING, WorkerStatus.IDLE, WorkerStatus.SORTING]),
        )
    )
    return int(count or 0)


async def _top_pickers(
    db: AsyncSession, start: datetime, end: datetime, *, live_open_only: bool = False
) -> list[dict]:
    if live_open_only:
        shift_rows = await db.execute(
            select(User.id, User.full_name, Shift.total_items_picked)
            .join(Shift, Shift.user_id == User.id)
            .where(Shift.end_time.is_(None), Shift.start_time >= start)
            .order_by(Shift.total_items_picked.desc())
            .limit(5)
        )
        rows = [(r[0], r[1], r[2]) for r in shift_rows.all() if int(r[2]) > 0]
        if rows:
            leader_items = max(int(r[2]) for r in rows) or 1
            return [
                {
                    "user_id": str(row[0]),
                    "name": row[1],
                    "items": int(row[2]),
                    "pct_of_leader": int(round(int(row[2]) / leader_items * 100)),
                }
                for row in rows
            ]

    result = await db.execute(
        select(User.id, User.full_name, func.coalesce(func.sum(InventoryTransaction.quantity), 0))
        .join(InventoryTransaction, InventoryTransaction.user_id == User.id)
        .where(
            InventoryTransaction.transaction_type == TransactionType.WAVE_PICK_BATCH,
            InventoryTransaction.created_at >= start,
            InventoryTransaction.created_at <= end,
        )
        .group_by(User.id, User.full_name)
        .order_by(func.sum(InventoryTransaction.quantity).desc())
        .limit(5)
    )
    rows = result.all()
    if not rows:
        return []
    leader_items = max(int(r[2]) for r in rows) or 1
    return [
        {
            "user_id": str(row[0]),
            "name": row[1],
            "items": int(row[2]),
            "pct_of_leader": int(round(int(row[2]) / leader_items * 100)),
        }
        for row in rows
    ]


async def _hourly_buckets(
    db: AsyncSession,
    *,
    window_end: datetime,
    window_start: Optional[datetime] = None,
) -> list[dict]:
    window_end = _ensure_utc(window_end)
    bucket_minutes = CHART_BUCKET_MINUTES

    if window_start is None:
        bucket_size = timedelta(minutes=bucket_minutes)
        end_bucket = _floor_to_bucket(window_end, bucket_minutes)
        num_buckets = (CHART_WINDOW_HOURS * 60) // bucket_minutes
        slot_starts = [end_bucket - bucket_size * (num_buckets - 1 - i) for i in range(num_buckets)]
        range_start = slot_starts[0]
        range_end = window_end
    else:
        window_start = _ensure_utc(window_start)
        start_bucket = _floor_to_bucket(window_start, bucket_minutes)
        end_bucket = _floor_to_bucket(window_end, bucket_minutes)
        if start_bucket > end_bucket:
            start_bucket = end_bucket

        span_minutes = max(int((end_bucket - start_bucket).total_seconds() // 60), bucket_minutes)
        if span_minutes // bucket_minutes > MAX_HISTORICAL_BUCKETS:
            bucket_minutes = max(
                CHART_BUCKET_MINUTES,
                int(math.ceil(span_minutes / MAX_HISTORICAL_BUCKETS / 15) * 15),
            )

        bucket_size = timedelta(minutes=bucket_minutes)
        start_bucket = _floor_to_bucket(window_start, bucket_minutes)
        end_bucket = _floor_to_bucket(window_end, bucket_minutes)
        slots: list[datetime] = []
        cur = start_bucket
        while cur <= end_bucket and len(slots) < MAX_HISTORICAL_BUCKETS:
            slots.append(cur)
            cur += bucket_size
        slot_starts = slots or [end_bucket]
        range_start = window_start
        range_end = window_end

    buckets: dict[str, dict] = {
        slot.isoformat(): {"time": slot.isoformat(), "picked": 0, "inbound": 0}
        for slot in slot_starts
    }

    result = await db.execute(
        select(
            InventoryTransaction.created_at,
            InventoryTransaction.quantity,
            InventoryTransaction.transaction_type,
        ).where(
            InventoryTransaction.created_at >= range_start,
            InventoryTransaction.created_at <= range_end,
        )
    )

    for created_at, quantity, tx_type in result.all():
        created_at = _ensure_utc(created_at)
        key = _floor_to_bucket(created_at, bucket_minutes).isoformat()
        if key not in buckets:
            continue
        if tx_type == TransactionType.WAVE_PICK_BATCH:
            buckets[key]["picked"] += quantity
        elif tx_type == TransactionType.RECEIPT:
            buckets[key]["inbound"] += quantity

    picked_sum = sum(b["picked"] for b in buckets.values())
    if window_start is not None and picked_sum == 0:
        mt_result = await db.execute(
            select(MicroTaskItem.quantity_picked, Wave.updated_at)
            .join(MicroTask, MicroTaskItem.micro_task_id == MicroTask.id)
            .join(Wave, MicroTask.wave_id == Wave.id)
            .where(
                MicroTaskItem.quantity_picked > 0,
                Wave.updated_at >= range_start,
                Wave.updated_at <= range_end,
            )
        )
        for qty, updated_at in mt_result.all():
            updated_at = _ensure_utc(updated_at)
            key = _floor_to_bucket(updated_at, bucket_minutes).isoformat()
            if key in buckets:
                buckets[key]["picked"] += int(qty)

    return list(buckets.values())


def _chart_window_bounds(buckets: list[dict]) -> tuple[Optional[str], Optional[str]]:
    if not buckets:
        return None, None
    return buckets[0]["time"], buckets[-1]["time"]


async def _recent_events(
    db: AsyncSession, since: Optional[datetime] = None, until: Optional[datetime] = None, limit: int = 15
) -> list[dict]:
    query = (
        select(InventoryTransaction)
        .options(
            joinedload(InventoryTransaction.product),
            joinedload(InventoryTransaction.source_location),
            joinedload(InventoryTransaction.target_location),
            joinedload(InventoryTransaction.user),
        )
        .order_by(InventoryTransaction.created_at.desc())
        .limit(limit)
    )
    if since is not None:
        query = query.where(InventoryTransaction.created_at >= since)
    if until is not None:
        query = query.where(InventoryTransaction.created_at <= until)
    result = await db.execute(query)
    txs = result.unique().scalars().all()
    events = []
    for tx in reversed(txs):
        actor = tx.user.full_name if tx.user else "System"
        sku = tx.product.sku if tx.product else "?"
        if tx.transaction_type == TransactionType.WAVE_PICK_BATCH:
            loc = tx.source_location.code if tx.source_location else "?"
            detail = f"picked {tx.quantity}× {sku} @ {loc}"
            ev_type = "PICK"
        elif tx.transaction_type == TransactionType.RECEIPT:
            detail = f"received {tx.quantity}× {sku}"
            ev_type = "INBOUND"
        else:
            detail = f"{tx.transaction_type.value} {tx.quantity}× {sku}"
            ev_type = tx.transaction_type.value

        events.append({
            "id": str(tx.id),
            "at": tx.created_at,
            "type": ev_type,
            "actor": actor,
            "detail": detail,
        })
    return events


async def _orders_shipped_in_window(db: AsyncSession, start: datetime, end: datetime) -> int:
    count = await db.scalar(
        select(func.count()).select_from(Order).where(
            Order.status == OrderStatus.SHIPPED,
            Order.updated_at >= start,
            Order.updated_at <= end,
        )
    )
    return int(count or 0)


async def compute_shift_metrics(
    db: AsyncSession,
    start: Optional[datetime],
    end: Optional[datetime] = None,
    *,
    live: bool = False,
) -> dict[str, Any]:
    now = _utcnow()
    end = _ensure_utc(end or now)

    if start is None:
        hourly = await _hourly_buckets(db, window_end=end)
        window_start, window_end = _chart_window_bounds(hourly)
        return {
            "shift_active": False,
            "shift_started_at": None,
            "elapsed_seconds": 0,
            "items_picked": 0,
            "items_picked_delta_5m": 0,
            "waves_completed": 0,
            "waves_active": await wave_service.count_active_waves(db),
            "orders_shipped": await order_service.count_shipped_today(db) if live else 0,
            "inbound_received_units": 0,
            "pickers_online": await _pickers_online(db) if live else 0,
            "pick_rate_per_hour": 0.0,
            "bucket_minutes": CHART_BUCKET_MINUTES,
            "chart_window_start": window_start,
            "chart_window_end": window_end,
            "hourly_buckets": hourly,
            "top_pickers": [],
            "recent_events": await _recent_events(db),
        }

    start = _ensure_utc(start)
    elapsed = max(int((end - start).total_seconds()), 1)
    items_picked = await _items_picked_in_window(db, start, end)
    inbound_units = await _inbound_units_in_window(db, start, end)
    delta_5m = await _items_picked_last_minutes(db, 5, end) if live else 0
    waves_completed = await _waves_completed_in_window(db, start, end)
    waves_active = await wave_service.count_active_waves(db) if live else 0
    orders_shipped = (
        await order_service.count_shipped_today(db)
        if live
        else await _orders_shipped_in_window(db, start, end)
    )
    pickers = await _pickers_online(db) if live else 0
    elapsed_hours = elapsed / 3600
    pick_rate = round(items_picked / elapsed_hours, 1) if elapsed_hours > 0 else 0.0

    if live:
        hourly = await _hourly_buckets(db, window_end=end)
    else:
        hourly = await _hourly_buckets(db, window_end=end, window_start=start)
    window_start, window_end = _chart_window_bounds(hourly)

    return {
        "shift_active": bool(live),
        "shift_started_at": start,
        "elapsed_seconds": elapsed,
        "items_picked": items_picked,
        "items_picked_delta_5m": delta_5m,
        "waves_completed": waves_completed,
        "waves_active": waves_active,
        "orders_shipped": orders_shipped,
        "inbound_received_units": inbound_units,
        "pickers_online": pickers,
        "pick_rate_per_hour": pick_rate,
        "bucket_minutes": CHART_BUCKET_MINUTES,
        "chart_window_start": window_start,
        "chart_window_end": window_end,
        "hourly_buckets": hourly,
        "top_pickers": await _top_pickers(db, start, end, live_open_only=live),
        "recent_events": await _recent_events(db, since=start, until=None if live else end),
    }


def metrics_to_snapshot(metrics: dict[str, Any]) -> dict[str, Any]:
    from app.schemas.shift_live import ShiftLiveResponse

    validated = ShiftLiveResponse.model_validate({
        **metrics,
        "recent_events": metrics.get("recent_events") or [],
        "items_picked_delta_5m": metrics.get("items_picked_delta_5m") or 0,
    }).model_dump(mode="json")
    validated.pop("recent_events", None)
    validated.pop("items_picked_delta_5m", None)
    return validated
