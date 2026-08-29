from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.waves import Wave, WaveOrder, MicroTask, MicroTaskItem
from app.models.orders import Order, OrderItem
from app.models.topology import Location
from app.models.users import User
from app.models.enums import WaveStatus, OrderStatus, LocationType, TaskType, TaskStatus
from app.services import inventory_service


MAX_VOLUME_PER_TASK = 100_000.0


class EmptyWaveError(Exception):
    """Raised when no stock could be allocated for the requested orders."""


@dataclass
class WaveAllocationSummary:
    lines_fully_allocated: int = 0
    lines_partially_allocated: int = 0
    lines_skipped: int = 0
    total_units_allocated: int = 0
    order_ids_in_wave: List[uuid.UUID] = field(default_factory=list)


@dataclass
class CreateWaveResult:
    wave: Wave
    summary: WaveAllocationSummary


async def get_waves(db: AsyncSession, limit: int = 50):
    result = await db.execute(
        select(Wave)
        .options(
            selectinload(Wave.micro_tasks).selectinload(MicroTask.items),
            selectinload(Wave.micro_tasks).selectinload(MicroTask.assigned_user),
            selectinload(Wave.wave_orders).selectinload(WaveOrder.order),
        )
        .order_by(Wave.created_at.desc())
        .limit(limit)
    )
    return result.unique().scalars().all()


async def get_wave_by_id(db: AsyncSession, wave_id: uuid.UUID):
    result = await db.execute(
        select(Wave)
        .options(
            joinedload(Wave.wave_orders),
            joinedload(Wave.micro_tasks).joinedload(MicroTask.items),
            joinedload(Wave.micro_tasks).joinedload(MicroTask.assigned_user),
        )
        .where(Wave.id == wave_id)
    )
    return result.unique().scalar_one_or_none()


def _order_fully_allocated(order: Order) -> bool:
    return all(item.allocated_quantity >= item.requested_quantity for item in order.items)


async def create_wave(
    db: AsyncSession, order_ids: List[uuid.UUID], created_by_user_id: uuid.UUID
) -> CreateWaveResult:
    orders_result = await db.execute(
        select(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .where(Order.id.in_(order_ids))
    )
    orders = orders_result.unique().scalars().all()
    if len(orders) != len(order_ids):
        raise HTTPException(status_code=400, detail="One or more orders not found")

    for order in orders:
        if order.status not in (OrderStatus.PENDING, OrderStatus.PARTIALLY_IN_WAVE):
            raise HTTPException(
                status_code=400,
                detail=f"Order {order.order_number} cannot be added to a wave (status={order.status.value})",
            )

    count_result = await db.execute(select(func.count()).select_from(Wave))
    count = count_result.scalar_one()
    wave_number = f"WAVE-{datetime.now(timezone.utc).year}-{count + 1:03d}"

    wave = Wave(
        id=uuid.uuid4(),
        wave_number=wave_number,
        status=WaveStatus.IN_PROGRESS,
        total_orders_count=0,
        created_by_user_id=created_by_user_id,
    )
    db.add(wave)
    await db.flush()

    staging_loc = await db.scalar(
        select(Location).where(Location.type == LocationType.STAGING_SORTING).limit(1)
    )

    summary = WaveAllocationSummary()
    current_task: Optional[MicroTask] = None
    current_task_volume = 0.0
    task_idx = 1
    orders_in_wave: set[uuid.UUID] = set()

    def create_new_task() -> MicroTask:
        nonlocal current_task, current_task_volume, task_idx
        current_task = MicroTask(
            id=uuid.uuid4(),
            wave_id=wave.id,
            task_number=f"TASK-{wave_number}-{task_idx:03d}",
            type=TaskType.BATCH_PICK,
            status=TaskStatus.PENDING,
        )
        db.add(current_task)
        task_idx += 1
        current_task_volume = 0.0
        return current_task

    create_new_task()

    try:
        for order in orders:
            order_got_units = False

            for item in order.items:
                need = item.requested_quantity - item.allocated_quantity
                if need <= 0:
                    continue

                qty_left = need
                line_allocated_before = item.allocated_quantity
                item_volume = float(item.product.volume_cm3) if item.product and item.product.volume_cm3 else 100.0

                while qty_left > 0:
                    if current_task is None:
                        create_new_task()

                    space_left = MAX_VOLUME_PER_TASK - current_task_volume
                    if item_volume <= 0:
                        chunk_by_volume = qty_left
                    else:
                        chunk_by_volume = int(space_left // item_volume) if space_left > 0 else 0

                    if chunk_by_volume == 0 and current_task_volume == 0:
                        chunk_by_volume = 1

                    if chunk_by_volume <= 0:
                        create_new_task()
                        continue

                    qty_attempt = min(chunk_by_volume, qty_left)

                    balance = await inventory_service.find_best_balance(db, item.product_id, qty_attempt)
                    if not balance:
                        break

                    available = balance.quantity - balance.reserved_quantity
                    if available <= 0:
                        break

                    qty_to_put = min(qty_attempt, available)
                    if qty_to_put <= 0:
                        break

                    await inventory_service.reserve_stock(
                        db,
                        product_id=item.product_id,
                        location_id=balance.location_id,
                        quantity=qty_to_put,
                        reference_id=wave.id,
                        user_id=created_by_user_id,
                    )

                    item.allocated_quantity += qty_to_put
                    order_got_units = True
                    summary.total_units_allocated += qty_to_put

                    mti = MicroTaskItem(
                        id=uuid.uuid4(),
                        micro_task_id=current_task.id,
                        order_item_id=item.id,
                        product_id=item.product_id,
                        source_location_id=balance.location_id,
                        target_location_id=staging_loc.id if staging_loc else balance.location_id,
                        quantity_to_pick=qty_to_put,
                        quantity_picked=0,
                        status=TaskStatus.PENDING,
                    )
                    db.add(mti)

                    current_task_volume += qty_to_put * item_volume
                    qty_left -= qty_to_put

                line_allocated = item.allocated_quantity - line_allocated_before
                if line_allocated <= 0:
                    summary.lines_skipped += 1
                elif item.allocated_quantity >= item.requested_quantity:
                    summary.lines_fully_allocated += 1
                else:
                    summary.lines_partially_allocated += 1

            if order_got_units:
                orders_in_wave.add(order.id)
                db.add(WaveOrder(id=uuid.uuid4(), wave_id=wave.id, order_id=order.id))
                if _order_fully_allocated(order):
                    order.status = OrderStatus.IN_WAVE
                else:
                    order.status = OrderStatus.PARTIALLY_IN_WAVE

        if summary.total_units_allocated <= 0:
            await db.rollback()
            raise EmptyWaveError("No stock could be allocated for the selected orders")

        wave.total_orders_count = len(orders_in_wave)
        summary.order_ids_in_wave = list(orders_in_wave)
        await db.commit()
    except inventory_service.InsufficientStockError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock for product {exc.product_id}: "
                f"need {exc.requested}, available {exc.available}"
            ),
        ) from exc

    await db.refresh(wave)
    loaded = await get_wave_by_id(db, wave.id)
    assert loaded is not None
    return CreateWaveResult(wave=loaded, summary=summary)


async def count_active_waves(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(Wave).where(
            Wave.status.not_in([WaveStatus.COMPLETED, WaveStatus.CANCELLED])
        )
    )
    return result.scalar_one()


def _recompute_order_status(order: Order) -> None:
    if all(item.allocated_quantity <= 0 for item in order.items):
        order.status = OrderStatus.PENDING
    elif all(item.allocated_quantity >= item.requested_quantity for item in order.items):
        order.status = OrderStatus.IN_WAVE
    else:
        order.status = OrderStatus.PARTIALLY_IN_WAVE


async def cancel_wave(
    db: AsyncSession,
    wave_id: uuid.UUID,
) -> Wave:
    wave = await get_wave_by_id(db, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    if wave.status == WaveStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Wave is already cancelled")
    if wave.status == WaveStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed wave")
    if wave.status in (WaveStatus.PICKED, WaveStatus.SORTING):
        raise HTTPException(status_code=400, detail="Cannot cancel wave after picking finished")

    from app.models.pick_sessions import PickSession
    from app.models.enums import PickStep, WorkerStatus

    session_result = await db.execute(
        select(PickSession)
        .join(MicroTask, PickSession.micro_task_id == MicroTask.id)
        .where(MicroTask.wave_id == wave_id, PickSession.step != PickStep.COMPLETED)
    )
    for session in session_result.scalars().all():
        session.step = PickStep.COMPLETED

    order_ids = [wo.order_id for wo in wave.wave_orders]

    for task in wave.micro_tasks:
        if task.assigned_user_id:
            picker = await db.get(User, task.assigned_user_id)
            if picker and picker.status == WorkerStatus.PICKING:
                picker.status = WorkerStatus.IDLE
        task.status = TaskStatus.CANCELLED
        task.assigned_user_id = None
        for item in task.items:
            unpicked = int(float(item.quantity_to_pick) - float(item.quantity_picked))
            if unpicked > 0:
                try:
                    await inventory_service.release_reserved_stock(
                        db,
                        item.product_id,
                        item.source_location_id,
                        unpicked,
                    )
                except inventory_service.BalanceNotFoundError:
                    # Stale task line after re-seed or stock already moved
                    pass
                if item.order_item_id:
                    order_item = await db.get(OrderItem, item.order_item_id)
                    if order_item:
                        order_item.allocated_quantity = max(0, order_item.allocated_quantity - unpicked)
            item.status = TaskStatus.CANCELLED

    wave.status = WaveStatus.CANCELLED

    if order_ids:
        orders_result = await db.execute(
            select(Order)
            .options(joinedload(Order.items))
            .where(Order.id.in_(order_ids))
        )
        for order in orders_result.unique().scalars().all():
            _recompute_order_status(order)

    await db.commit()
    loaded = await get_wave_by_id(db, wave_id)
    assert loaded is not None
    return loaded
