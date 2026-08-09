from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from app.models.waves import Wave, WaveOrder, MicroTask, MicroTaskItem
from app.models.orders import Order, OrderItem
from app.models.catalog import Product
from app.models.topology import Location
from app.models.inventory import InventoryBalance
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

    # 1. Fetch all requested orders and their items, with Product loaded for volume
    orders_result = await db.execute(
        select(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .where(Order.id.in_(order_ids))
    )
    orders = orders_result.unique().scalars().all()
    
    product_ids = [item.product_id for order in orders for item in order.items]
    inventory_result = await db.execute(
        select(InventoryBalance)
        .where(InventoryBalance.product_id.in_(product_ids))
    )
    inventory = inventory_result.scalars().all()
    
    product_locations = {}
    for inv in inventory:
        if inv.quantity > 0:
            product_locations[inv.product_id] = inv.location_id
    
    # 2. Add them to wave and flatten items
    all_items = []
    for order in orders:
        wo = WaveOrder(id=uuid.uuid4(), wave_id=wave.id, order_id=order.id)
        db.add(wo)
        order.status = OrderStatus.IN_WAVE
        for item in order.items:
            all_items.append((item, item.product))
            
    # 3. Create MicroTasks chunked by volume
    MAX_VOLUME_PER_TASK = 100_000.0  # cm3
    current_task = None
    current_task_volume = 0.0
    task_idx = 1
    
    def create_new_task():
        nonlocal current_task, current_task_volume, task_idx
        current_task = MicroTask(
            id=uuid.uuid4(),
            wave_id=wave.id,
            task_number=f"TASK-{wave_number}-{task_idx:03d}",
            type=TaskType.BATCH_PICK,
            status=TaskStatus.IN_PROGRESS,
        )
        db.add(current_task)
        task_idx += 1
        current_task_volume = 0.0
        
    create_new_task()
    
    for item, product in all_items:
        qty_left = item.requested_quantity
        item_volume = float(product.volume_cm3) if product.volume_cm3 else 100.0
        
        while qty_left > 0:
            space_left = MAX_VOLUME_PER_TASK - current_task_volume
            
            if item_volume <= 0:
                qty_to_put = qty_left
            else:
                qty_to_put = int(space_left // item_volume)
                
            # If space is too small even for 1 item, but task is empty, just force 1 item
            if qty_to_put == 0 and current_task_volume == 0:
                qty_to_put = 1
                
            # If space is too small for 1 item and task is not empty, create a new task
            if qty_to_put <= 0:
                create_new_task()
                continue
                
            qty_to_put = min(qty_to_put, qty_left)
            
            loc_id = product_locations.get(product.id, storage_loc.id if storage_loc else uuid.uuid4())
            
            mti = MicroTaskItem(
                id=uuid.uuid4(),
                micro_task_id=current_task.id,
                product_id=product.id,
                source_location_id=loc_id,
                target_location_id=staging_loc.id if staging_loc else uuid.uuid4(),
                quantity_to_pick=qty_to_put,
                quantity_picked=0,
                status=TaskStatus.IN_PROGRESS,
            )
            db.add(mti)
            
            current_task_volume += (qty_to_put * item_volume)
            qty_left -= qty_to_put

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
