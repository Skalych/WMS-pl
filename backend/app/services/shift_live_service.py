from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.enums import TransactionType, UserRole, WorkerStatus, WaveStatus
from app.models.inventory import InventoryTransaction
from app.models.users import Shift, User
from app.models.waves import Wave, MicroTaskItem, MicroTask
from app.services import order_service, wave_service, user_service


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _shift_window_start(db: AsyncSession) -> Optional[datetime]:
    """Earliest open shift among workers — set when admin starts shifts on Team page."""
    earliest = await db.scalar(
        select(func.min(Shift.start_time)).where(Shift.end_time.is_(None))
    )
    if not earliest:
        return None
    if earliest.tzinfo is None:
        return earliest.replace(tzinfo=timezone.utc)
    return earliest


CHART_WINDOW_HOURS = 4
CHART_BUCKET_MINUTES = 15


def _floor_to_bucket(dt: datetime, minutes: int = CHART_BUCKET_MINUTES) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.replace(minute=(dt.minute // minutes) * minutes, second=0, microsecond=0)


async def _hourly_buckets(db: AsyncSession) -> list[dict]:
    """Exactly 16 × 15-min buckets ending at the current interval (rolling 4 h)."""
    now = _utcnow()
    bucket_minutes = CHART_BUCKET_MINUTES
    bucket_size = timedelta(minutes=bucket_minutes)
    num_buckets = (CHART_WINDOW_HOURS * 60) // bucket_minutes
    end_bucket = _floor_to_bucket(now, bucket_minutes)
    slot_starts = [
        end_bucket - bucket_size * (num_buckets - 1 - i) for i in range(num_buckets)
    ]

    buckets: dict[str, dict] = {
        slot.isoformat(): {"time": slot.isoformat(), "picked": 0, "inbound": 0}
        for slot in slot_starts
    }

    query_since = slot_starts[0]
    result = await db.execute(
        select(
            InventoryTransaction.created_at,
            InventoryTransaction.quantity,
            InventoryTransaction.transaction_type,
        ).where(InventoryTransaction.created_at >= query_since)
    )

    for created_at, quantity, tx_type in result.all():
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        key = _floor_to_bucket(created_at, bucket_minutes).isoformat()
        if key not in buckets:
            continue
        if tx_type == TransactionType.WAVE_PICK_BATCH:
            buckets[key]["picked"] += quantity
        elif tx_type == TransactionType.RECEIPT:
            buckets[key]["inbound"] += quantity

    return list(buckets.values())


def _chart_window_bounds(buckets: list[dict]) -> tuple[Optional[str], Optional[str]]:
    if not buckets:
        return None, None
    return buckets[0]["time"], buckets[-1]["time"]


async def _items_picked_since(db: AsyncSession, since: datetime) -> int:
    shift_sum = await db.scalar(
        select(func.coalesce(func.sum(Shift.total_items_picked), 0)).where(
            Shift.end_time.is_(None),
            Shift.start_time >= since,
        )
    )
    if shift_sum and int(shift_sum) > 0:
        return int(shift_sum)

    from_tx = await db.scalar(
        select(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).where(
            InventoryTransaction.transaction_type == TransactionType.WAVE_PICK_BATCH,
            InventoryTransaction.created_at >= since,
        )
    )
    if from_tx and from_tx > 0:
        return int(from_tx)

    task_sum = await db.scalar(
        select(func.coalesce(func.sum(MicroTaskItem.quantity_picked), 0))
        .join(MicroTask, MicroTaskItem.micro_task_id == MicroTask.id)
        .join(Wave, MicroTask.wave_id == Wave.id)
        .where(Wave.created_at >= since)
    )
    return int(task_sum or 0)


async def _inbound_units_since(db: AsyncSession, since: datetime) -> int:
    total = await db.scalar(
        select(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).where(
            InventoryTransaction.transaction_type == TransactionType.RECEIPT,
            InventoryTransaction.created_at >= since,
        )
    )
    return int(total or 0)


async def _items_picked_last_minutes(db: AsyncSession, minutes: int) -> int:
    since = _utcnow() - timedelta(minutes=minutes)
    total = await db.scalar(
        select(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).where(
            InventoryTransaction.transaction_type == TransactionType.WAVE_PICK_BATCH,
            InventoryTransaction.created_at >= since,
        )
    )
    return int(total or 0)


async def _waves_completed_since(db: AsyncSession, since: datetime) -> int:
    count = await db.scalar(
        select(func.count()).select_from(Wave).where(
            Wave.status.in_([WaveStatus.PICKED, WaveStatus.COMPLETED, WaveStatus.SORTING]),
            Wave.updated_at >= since,
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


async def _top_pickers(db: AsyncSession, since: datetime) -> list[dict]:
    shift_rows = await db.execute(
        select(User.id, User.full_name, Shift.total_items_picked)
        .join(Shift, Shift.user_id == User.id)
        .where(Shift.end_time.is_(None), Shift.start_time >= since)
        .order_by(Shift.total_items_picked.desc())
        .limit(5)
    )
    rows = [(r[0], r[1], r[2]) for r in shift_rows.all() if int(r[2]) > 0]

    if not rows:
        result = await db.execute(
            select(User.id, User.full_name, func.coalesce(func.sum(InventoryTransaction.quantity), 0))
            .join(InventoryTransaction, InventoryTransaction.user_id == User.id)
            .where(
                InventoryTransaction.transaction_type == TransactionType.WAVE_PICK_BATCH,
                InventoryTransaction.created_at >= since,
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


async def _recent_events(db: AsyncSession, since: Optional[datetime] = None, limit: int = 15) -> list[dict]:
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


async def build_shift_live_snapshot(db: AsyncSession) -> dict:
    since = await _shift_window_start(db)
    now = _utcnow()

    if since is None:
        hourly = await _hourly_buckets(db)
        window_start, window_end = _chart_window_bounds(hourly)
        return {
            "shift_active": False,
            "shift_started_at": None,
            "elapsed_seconds": 0,
            "items_picked": 0,
            "items_picked_delta_5m": 0,
            "waves_completed": 0,
            "waves_active": await wave_service.count_active_waves(db),
            "orders_shipped": await order_service.count_shipped_today(db),
            "inbound_received_units": 0,
            "pickers_online": await _pickers_online(db),
            "pick_rate_per_hour": 0.0,
            "bucket_minutes": CHART_BUCKET_MINUTES,
            "chart_window_start": window_start,
            "chart_window_end": window_end,
            "hourly_buckets": hourly,
            "top_pickers": [],
            "recent_events": await _recent_events(db),
        }

    if since.tzinfo is None:
        since = since.replace(tzinfo=timezone.utc)
    elapsed = max(int((now - since).total_seconds()), 1)

    items_picked = await _items_picked_since(db, since)
    inbound_units = await _inbound_units_since(db, since)
    delta_5m = await _items_picked_last_minutes(db, 5)
    waves_completed = await _waves_completed_since(db, since)
    waves_active = await wave_service.count_active_waves(db)
    orders_shipped = await order_service.count_shipped_today(db)
    pickers = await _pickers_online(db)

    elapsed_hours = elapsed / 3600
    pick_rate = round(items_picked / elapsed_hours, 1) if elapsed_hours > 0 else 0.0
    hourly = await _hourly_buckets(db)
    window_start, window_end = _chart_window_bounds(hourly)

    return {
        "shift_active": True,
        "shift_started_at": since,
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
        "top_pickers": await _top_pickers(db, since),
        "recent_events": await _recent_events(db, since),
    }


async def publish_shift_live_update(db: AsyncSession) -> None:
    from app.services.ws_manager import shift_ws_manager
    from app.schemas.shift_live import ShiftLiveResponse

    raw = await build_shift_live_snapshot(db)
    payload = ShiftLiveResponse.model_validate(raw).model_dump(mode="json")
    await shift_ws_manager.broadcast({"type": "shift_live", "payload": payload})


async def build_shift_live_snapshot_json(db: AsyncSession) -> dict:
    """JSON-safe snapshot for WebSocket transport."""
    from app.schemas.shift_live import ShiftLiveResponse

    raw = await build_shift_live_snapshot(db)
    return ShiftLiveResponse.model_validate(raw).model_dump(mode="json")
