from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.waves import Wave, WaveOrder, MicroTask
from app.models.orders import Order
from app.models.enums import WaveStatus, OrderStatus


async def get_waves(db: AsyncSession):
    result = await db.execute(
        select(Wave).options(joinedload(Wave.wave_orders)).order_by(Wave.created_at.desc())
    )
    return result.unique().scalars().all()


async def get_wave_by_id(db: AsyncSession, wave_id: uuid.UUID):
    result = await db.execute(
        select(Wave)
        .options(joinedload(Wave.wave_orders), joinedload(Wave.micro_tasks))
        .where(Wave.id == wave_id)
    )
    return result.unique().scalar_one_or_none()


async def create_wave(db: AsyncSession, order_ids: List[uuid.UUID], created_by_user_id: uuid.UUID):
    count_result = await db.execute(select(func.count()).select_from(Wave))
    count = count_result.scalar_one()
    wave_number = f"WAVE-{datetime.now(timezone.utc).year}-{count + 1:03d}"

    wave = Wave(
        id=uuid.uuid4(),
        wave_number=wave_number,
        status=WaveStatus.DRAFT,
        total_orders_count=len(order_ids),
        created_by_user_id=created_by_user_id,
    )
    db.add(wave)
    await db.flush()

    for order_id in order_ids:
        wo = WaveOrder(id=uuid.uuid4(), wave_id=wave.id, order_id=order_id)
        db.add(wo)
        order = await db.get(Order, order_id)
        if order:
            order.status = OrderStatus.IN_WAVE

    await db.commit()
    await db.refresh(wave)
    return await get_wave_by_id(db, wave.id)


async def count_active_waves(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(Wave).where(
            Wave.status.not_in([WaveStatus.COMPLETED, WaveStatus.CANCELLED])
        )
    )
    return result.scalar_one()
