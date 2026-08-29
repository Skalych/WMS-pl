from __future__ import annotations

import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import verify_password, create_access_token
from app.models.enums import TaskStatus, UserRole, WorkerStatus
from app.models.users import User
from app.models.waves import MicroTask, MicroTaskItem, Wave
from app.services import user_service, inventory_service


TERMINAL_ROLES = {UserRole.PICKER, UserRole.PACKER_DISPATCHER, UserRole.ADMIN_MANAGER}


async def terminal_login(db: AsyncSession, email: str, pin: str) -> dict:
    user = await user_service.get_user_by_email(db, email)
    if not user or not verify_password(pin, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.role not in TERMINAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not allowed for terminal access")
    token = create_access_token(
        {"sub": str(user.id), "role": user.role.value, "tv": user.token_version}
    )
    return {"access_token": token, "token_type": "bearer"}


async def _load_task_with_items(db: AsyncSession, task_id: uuid.UUID) -> Optional[MicroTask]:
    result = await db.execute(
        select(MicroTask)
        .options(
            selectinload(MicroTask.items).selectinload(MicroTaskItem.product),
            selectinload(MicroTask.items).selectinload(MicroTaskItem.source_location),
        )
        .where(MicroTask.id == task_id)
    )
    return result.unique().scalar_one_or_none()


def _inventory_error_to_http(exc: Exception) -> HTTPException:
    if isinstance(exc, inventory_service.BalanceNotFoundError):
        return HTTPException(status_code=409, detail="No inventory balance at this location")
    if isinstance(exc, inventory_service.InsufficientStockError):
        return HTTPException(
            status_code=409,
            detail=f"Insufficient stock: need {exc.requested}, available {exc.available}",
        )
    if isinstance(exc, inventory_service.InsufficientReservedError):
        return HTTPException(
            status_code=409,
            detail=f"Insufficient reserved stock: need {exc.requested}, reserved {exc.reserved}",
        )
    raise exc


async def get_next_task(db: AsyncSession, user: User) -> Optional[dict]:
    result = await db.execute(
        select(MicroTask)
        .options(
            selectinload(MicroTask.items).selectinload(MicroTaskItem.product),
            selectinload(MicroTask.items).selectinload(MicroTaskItem.source_location),
        )
        .where(MicroTask.assigned_user_id == user.id)
        .where(MicroTask.status == TaskStatus.IN_PROGRESS)
        .limit(1)
    )
    task = result.unique().scalar_one_or_none()

    if not task:
        pending_result = await db.execute(
            select(MicroTask)
            .options(
                selectinload(MicroTask.items).selectinload(MicroTaskItem.product),
                selectinload(MicroTask.items).selectinload(MicroTaskItem.source_location),
            )
            .join(Wave, MicroTask.wave_id == Wave.id)
            .where(MicroTask.status == TaskStatus.PENDING)
            .where(MicroTask.assigned_user_id.is_(None))
            .order_by(Wave.created_at.asc(), MicroTask.created_at.asc())
            .limit(1)
            .with_for_update(of=MicroTask, skip_locked=True)
        )
        task = pending_result.unique().scalar_one_or_none()
        if not task:
            return None

        task.status = TaskStatus.IN_PROGRESS
        task.assigned_user_id = user.id
        user.status = WorkerStatus.PICKING
        await db.commit()
        task = await _load_task_with_items(db, task.id)
        if not task:
            return None

    if not task.items:
        return None

    first_item = next((i for i in task.items if i.quantity_picked < i.quantity_to_pick), task.items[0])
    return {
        "task_id": task.id,
        "task_type": task.type.value,
        "location_code": first_item.source_location.code if first_item.source_location else "",
        "product_sku": first_item.product.sku if first_item.product else "",
        "quantity_required": float(first_item.quantity_to_pick - first_item.quantity_picked),
        "cart_id": None,
    }


async def process_scan(db: AsyncSession, task_id: uuid.UUID, barcode: str, quantity: int, user: User) -> dict:
    task = await _load_task_with_items(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.assigned_user_id != user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to current user")

    active_item = next((i for i in task.items if i.quantity_picked < i.quantity_to_pick), None)
    if not active_item:
        task.status = TaskStatus.COMPLETED
        await db.commit()
        return {"status": "completed", "message": "Task already completed"}

    expected_barcodes = {
        active_item.product.sku if active_item.product else "",
        active_item.product.barcode if active_item.product else "",
        active_item.source_location.code if active_item.source_location else "",
    }
    if barcode not in expected_barcodes:
        raise HTTPException(status_code=400, detail="Barcode does not match expected product or location")

    remaining = active_item.quantity_to_pick - active_item.quantity_picked
    pick_qty = min(float(quantity), float(remaining))
    active_item.quantity_picked = float(active_item.quantity_picked) + pick_qty

    try:
        await inventory_service.commit_pick(
            db,
            product_id=active_item.product_id,
            location_id=active_item.source_location_id,
            quantity=int(pick_qty),
            reference_id=task.wave_id or task_id,
            user_id=user.id,
        )
    except (
        inventory_service.BalanceNotFoundError,
        inventory_service.InsufficientStockError,
        inventory_service.InsufficientReservedError,
    ) as exc:
        active_item.quantity_picked -= pick_qty
        raise _inventory_error_to_http(exc) from exc

    if active_item.quantity_picked >= active_item.quantity_to_pick:
        active_item.status = TaskStatus.COMPLETED

    all_done = all(i.quantity_picked >= i.quantity_to_pick for i in task.items)
    await user_service.increment_shift_pick(db, user.id, int(pick_qty), tasks=1 if all_done else 0)
    if all_done:
        task.status = TaskStatus.COMPLETED
        user.status = WorkerStatus.IDLE

    await db.commit()

    from app.services.shift_live_service import publish_shift_live_update

    await publish_shift_live_update(db)

    return {
        "status": "accepted",
        "message": "Scan processed successfully",
        "quantity_picked": active_item.quantity_picked,
        "task_completed": all_done,
    }
