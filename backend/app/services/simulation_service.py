import asyncio
import logging
import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from sqlalchemy.orm import joinedload

from app.models.users import User
from app.models.waves import Wave, MicroTask, MicroTaskItem, WaveOrder
from app.models.enums import WorkerStatus, WaveStatus, TaskStatus, OrderStatus, UserRole
from app.services import app_settings_service, inventory_service, user_service

logger = logging.getLogger(__name__)

SIMULATION_ACTIVE = True
# Realistic cap: each picker scans ~2 items per 5-second tick
BASE_ITEMS_PER_TICK = 2


def get_simulation_state() -> bool:
    return SIMULATION_ACTIVE


async def init_simulation_state(session: AsyncSession) -> None:
    global SIMULATION_ACTIVE
    SIMULATION_ACTIVE = await app_settings_service.get_simulation_active(session)
    logger.info("Simulation state loaded: %s", SIMULATION_ACTIVE)


async def persist_simulation_state(session: AsyncSession, active: bool) -> None:
    global SIMULATION_ACTIVE
    SIMULATION_ACTIVE = active
    await app_settings_service.set_simulation_active(session, active)
    await session.commit()
    logger.info("Simulation state saved: %s", active)


async def perform_simulation_tick(session: AsyncSession):
    workers = await session.execute(
        select(User).where(
            User.role == UserRole.PICKER,
            User.status.in_([WorkerStatus.PICKING, WorkerStatus.IDLE]),
        )
    )
    available_workers = workers.scalars().all()

    waves_result = await session.execute(
        select(Wave)
        .options(
            joinedload(Wave.micro_tasks).joinedload(MicroTask.items),
            joinedload(Wave.wave_orders).joinedload(WaveOrder.order),
        )
        .where(Wave.status == WaveStatus.IN_PROGRESS)
        .order_by(Wave.created_at.asc())
    )
    waves = waves_result.unique().scalars().all()

    if not waves:
        changed = False
        for worker in available_workers:
            if worker.status == WorkerStatus.PICKING:
                worker.status = WorkerStatus.IDLE
                changed = True
        if changed:
            await session.commit()
        return

    picking_workers: list[User] = []
    for worker in available_workers:
        if worker.status == WorkerStatus.IDLE:
            worker.status = WorkerStatus.PICKING
        if worker.status == WorkerStatus.PICKING:
            picking_workers.append(worker)

    if not picking_workers:
        return

    items_picked_this_tick = 0
    worker_capacity = {
        w.id: max(int(BASE_ITEMS_PER_TICK * w.efficiency), 1) for w in picking_workers
    }

    for wave in waves:
        if sum(worker_capacity.values()) <= 0:
            break

        all_tasks_completed = True

        for task in wave.micro_tasks:
            if task.status == TaskStatus.COMPLETED:
                continue

            task_all_items_completed = True

            for item in task.items:
                if item.status == TaskStatus.COMPLETED:
                    continue

                items_needed = item.quantity_to_pick - item.quantity_picked
                if items_needed <= 0:
                    item.status = TaskStatus.COMPLETED
                    continue

                worker = random.choice(picking_workers)
                cap_left = worker_capacity.get(worker.id, 0)
                if cap_left <= 0:
                    all_tasks_completed = False
                    task_all_items_completed = False
                    continue

                pick_qty = min(items_needed, cap_left)
                item.quantity_picked += pick_qty
                worker_capacity[worker.id] -= pick_qty
                items_picked_this_tick += pick_qty
                worker.current_location_id = item.source_location_id

                await inventory_service.commit_pick(
                    session,
                    product_id=item.product_id,
                    location_id=item.source_location_id,
                    quantity=pick_qty,
                    reference_id=task.id,
                    user_id=worker.id,
                )
                await user_service.increment_shift_pick(session, worker.id, pick_qty)

                if item.quantity_picked >= item.quantity_to_pick:
                    item.status = TaskStatus.COMPLETED
                else:
                    task_all_items_completed = False
                    all_tasks_completed = False

                if sum(worker_capacity.values()) <= 0:
                    break

            if task_all_items_completed:
                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.now(timezone.utc)
            else:
                if task.status == TaskStatus.PENDING:
                    task.status = TaskStatus.IN_PROGRESS
                    task.started_at = datetime.now(timezone.utc)
                all_tasks_completed = False

        if all_tasks_completed and wave.micro_tasks:
            wave.status = WaveStatus.PICKED
            for wo in wave.wave_orders:
                if wo.order:
                    wo.order.status = OrderStatus.PACKED

    if items_picked_this_tick <= 0:
        return

    await session.commit()

    from app.services.shift_live_service import publish_shift_live_update

    await publish_shift_live_update(session)


async def warehouse_simulation(session_maker: async_sessionmaker[AsyncSession]):
    logger.info("Warehouse Simulation started.")
    while True:
        try:
            await asyncio.sleep(5)
            if SIMULATION_ACTIVE:
                async with session_maker() as session:
                    await perform_simulation_tick(session)
        except asyncio.CancelledError:
            logger.info("Warehouse Simulation stopped.")
            break
        except Exception as e:
            logger.error(f"Error in warehouse simulation: %s", e)
            await asyncio.sleep(5)
