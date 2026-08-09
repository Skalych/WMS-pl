import asyncio
from datetime import datetime, timezone
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from sqlalchemy.orm import joinedload
from app.models.users import User
from app.models.waves import Wave, MicroTask, MicroTaskItem, WaveOrder
from app.models.enums import WorkerStatus, WaveStatus, TaskStatus, OrderStatus, UserRole

logger = logging.getLogger(__name__)

# Global Simulation State
SIMULATION_ACTIVE = True

def set_simulation_state(active: bool):
    global SIMULATION_ACTIVE
    SIMULATION_ACTIVE = active

# Base pick rate: realistic speed (e.g., scanning, driving, placing on pallet)
# 2 items per 5-second tick
BASE_ITEMS_PER_TICK = 2

async def perform_simulation_tick(session: AsyncSession):
    # 1. Fetch online workers that are PICKING or IDLE (to be assigned) AND are PICKER role
    workers = await session.execute(
        select(User).where(
            User.role == UserRole.PICKER,
            User.status.in_([WorkerStatus.PICKING, WorkerStatus.IDLE])
        )
    )
    available_workers = workers.scalars().all()

    # 2. Fetch waves that are IN_PROGRESS, ordered by oldest first
    waves_result = await session.execute(
        select(Wave)
        .options(
            joinedload(Wave.micro_tasks).joinedload(MicroTask.items),
            joinedload(Wave.wave_orders).joinedload(WaveOrder.order)
        )
        .where(Wave.status == WaveStatus.IN_PROGRESS)
        .order_by(Wave.created_at.asc())
    )
    waves = waves_result.unique().scalars().all()
    
    # If no waves are in progress, set all active pickers back to IDLE
    if not waves:
        changed = False
        for worker in available_workers:
            if worker.status == WorkerStatus.PICKING:
                worker.status = WorkerStatus.IDLE
                changed = True
        if changed:
            await session.commit()
        return

    # If there are waves, assign IDLE pickers to PICKING
    picking_workers = []
    for worker in available_workers:
        # Assuming only pickers are involved in this simulation step
        # If there's work, move IDLE to PICKING
        if worker.status == WorkerStatus.IDLE:
            worker.status = WorkerStatus.PICKING
        
        if worker.status == WorkerStatus.PICKING:
            picking_workers.append(worker)
            
    if not picking_workers:
        return # No pickers available
        
    # Calculate total picking capacity for this tick
    total_capacity = sum(int(BASE_ITEMS_PER_TICK * w.efficiency) for w in picking_workers)
    if total_capacity <= 0:
        return

    capacity_left = total_capacity
    
    for wave in waves:
        if capacity_left <= 0:
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
                    
                if capacity_left >= items_needed:
                    item.quantity_picked = item.quantity_to_pick
                    item.status = TaskStatus.COMPLETED
                    capacity_left -= items_needed
                else:
                    item.quantity_picked += capacity_left
                    capacity_left = 0
                    task_all_items_completed = False
                    all_tasks_completed = False
                    
                # Update a random picker's location to this item's location
                import random
                if picking_workers:
                    worker = random.choice(picking_workers)
                    worker.current_location_id = item.source_location_id
                    
                if capacity_left <= 0:
                    break # Out of capacity
            
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
            # Update associated orders so macro progress updates
            for wo in wave.wave_orders:
                if wo.order:
                    wo.order.status = OrderStatus.PACKED

    await session.commit()

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
            logger.error(f"Error in warehouse simulation: {e}")
            await asyncio.sleep(5) # Prevent tight loop on error
