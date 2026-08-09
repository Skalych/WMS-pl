from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from app.models.waves import Wave, WaveOrder, MicroTask, MicroTaskItem
from app.models.orders import Order
from app.models.topology import Location
from app.models.enums import WaveStatus, OrderStatus, LocationType, TaskType, TaskStatus


async def get_waves(db: AsyncSession, limit: int = 50):
    result = await db.execute(
        select(Wave)
        .options(
            selectinload(Wave.micro_tasks).selectinload(MicroTask.items),
            selectinload(Wave.wave_orders).selectinload(WaveOrder.order)
        )
        .order_by(Wave.created_at.desc())
        .limit(limit)
    )
    return result.unique().scalars().all()


async def get_wave_by_id(db: AsyncSession, wave_id: uuid.UUID):
    result = await db.execute(
        select(Wave)
        .options(joinedload(Wave.wave_orders), joinedload(Wave.micro_tasks).joinedload(MicroTask.items))
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
        status=WaveStatus.IN_PROGRESS,
        total_orders_count=len(order_ids),
        created_by_user_id=created_by_user_id,
    )
    db.add(wave)
    await db.flush()

    storage_loc = await db.scalar(select(Location).where(Location.type == LocationType.STORAGE).limit(1))
    staging_loc = await db.scalar(select(Location).where(Location.type == LocationType.STAGING_SORTING).limit(1))

    for idx, order_id in enumerate(order_ids):
        wo = WaveOrder(id=uuid.uuid4(), wave_id=wave.id, order_id=order_id)
        db.add(wo)
        order = await db.scalar(select(Order).options(joinedload(Order.items)).where(Order.id == order_id))
        
        if order:
            order.status = OrderStatus.IN_WAVE
            
            # Create a MicroTask for EACH order (1 order = 1 Злецення)
            task = MicroTask(
                id=uuid.uuid4(),
                wave_id=wave.id,
                task_number=f"TASK-{wave_number}-{idx+1:03d}",
                type=TaskType.BATCH_PICK,
                status=TaskStatus.IN_PROGRESS,
            )
            db.add(task)
            
            # Create MicroTaskItems for each OrderItem in this specific order
            for item in order.items:
                mti = MicroTaskItem(
                    id=uuid.uuid4(),
                    micro_task_id=task.id,
                    product_id=item.product_id,
                    source_location_id=storage_loc.id if storage_loc else uuid.uuid4(),
                    target_location_id=staging_loc.id if staging_loc else uuid.uuid4(),
                    quantity_to_pick=item.requested_quantity,
                    quantity_picked=0,
                    status=TaskStatus.IN_PROGRESS,
                )
                db.add(mti)

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
