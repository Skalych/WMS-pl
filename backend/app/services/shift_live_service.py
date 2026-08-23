from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.shift_metrics_service import compute_shift_metrics
from app.models.users import Shift
from sqlalchemy import select, func


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _shift_window_start(db: AsyncSession) -> Optional[datetime]:
    earliest = await db.scalar(
        select(func.min(Shift.start_time)).where(Shift.end_time.is_(None))
    )
    if not earliest:
        return None
    if earliest.tzinfo is None:
        return earliest.replace(tzinfo=timezone.utc)
    return earliest


async def build_shift_live_snapshot(db: AsyncSession) -> dict:
    since = await _shift_window_start(db)
    return await compute_shift_metrics(db, since, end=_utcnow(), live=True)


async def publish_shift_live_update(db: AsyncSession) -> None:
    from app.services.ws_manager import shift_ws_manager
    from app.schemas.shift_live import ShiftLiveResponse

    raw = await build_shift_live_snapshot(db)
    payload = ShiftLiveResponse.model_validate(raw).model_dump(mode="json")
    await shift_ws_manager.broadcast({"type": "shift_live", "payload": payload})


async def build_shift_live_snapshot_json(db: AsyncSession) -> dict:
    from app.schemas.shift_live import ShiftLiveResponse

    raw = await build_shift_live_snapshot(db)
    return ShiftLiveResponse.model_validate(raw).model_dump(mode="json")
