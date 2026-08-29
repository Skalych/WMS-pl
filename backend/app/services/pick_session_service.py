from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.containers import Container, IssuedContainerLabel
from app.models.enums import ContainerStatus, IssuedLabelStatus, PickStep, ShiftEventType, TaskStatus, WorkerStatus
from app.models.pick_sessions import PickSession
from app.models.users import Shift, ShiftEvent, User
from app.models.waves import MicroTask, MicroTaskItem
from app.services import container_service, inventory_service, user_service
from app.utils.location_barcode import location_barcode_matches

BUFFER_CODES = {"b-1-acc", "b-2-acc", "b-3-acc"}


def _to_decimal(value: float | Decimal | int) -> Decimal:
    return Decimal(str(value))


def _remaining(item: MicroTaskItem) -> Decimal:
    return _to_decimal(item.quantity_to_pick) - _to_decimal(item.quantity_picked)


async def _load_session(db: AsyncSession, user_id: uuid.UUID) -> Optional[PickSession]:
    result = await db.execute(
        select(PickSession)
        .options(
            selectinload(PickSession.micro_task).selectinload(MicroTask.items).selectinload(MicroTaskItem.product),
            selectinload(PickSession.micro_task).selectinload(MicroTask.items).selectinload(MicroTaskItem.source_location),
            selectinload(PickSession.container),
            selectinload(PickSession.current_item).selectinload(MicroTaskItem.product),
            selectinload(PickSession.current_item).selectinload(MicroTaskItem.source_location),
        )
        .where(PickSession.user_id == user_id)
        .where(PickSession.step != PickStep.COMPLETED)
        .order_by(PickSession.updated_at.desc())
        .limit(1)
    )
    return result.unique().scalar_one_or_none()


def _active_item(task: MicroTask) -> Optional[MicroTaskItem]:
    return next((i for i in task.items if _remaining(i) > 0), None)


async def _load_task(db: AsyncSession, task_id: uuid.UUID) -> Optional[MicroTask]:
    result = await db.execute(
        select(MicroTask)
        .options(
            selectinload(MicroTask.items).selectinload(MicroTaskItem.product),
            selectinload(MicroTask.items).selectinload(MicroTaskItem.source_location),
        )
        .where(MicroTask.id == task_id)
    )
    return result.unique().scalar_one_or_none()


def _session_payload(session: PickSession) -> dict:
    task = session.micro_task
    item = session.current_item or (task and _active_item(task))
    location_code = item.source_location.code if item and item.source_location else ""
    product_sku = item.product.sku if item and item.product else ""
    qty_remaining = float(_remaining(item)) if item else 0.0
    qty_to_pick = float(_to_decimal(item.quantity_to_pick)) if item else 0.0

    return {
        "session_id": session.id,
        "step": session.step.value,
        "task_id": task.id if task else None,
        "task_number": task.task_number if task else None,
        "location_code": location_code,
        "product_sku": product_sku,
        "quantity_to_pick": qty_to_pick,
        "quantity_remaining": qty_remaining,
        "quantity_default": qty_remaining,
        "container_barcode": session.container.barcode if session.container else None,
    }


async def clock_shift(db: AsyncSession, user: User, *, clock_in: bool) -> dict:
    """Informational shift clock — does not block picking."""
    result = await db.execute(
        select(Shift)
        .where(Shift.user_id == user.id)
        .where(Shift.end_time.is_(None))
        .order_by(Shift.start_time.desc())
        .limit(1)
    )
    shift = result.scalar_one_or_none()
    if not shift:
        shift = Shift(id=uuid.uuid4(), user_id=user.id)
        db.add(shift)
        await db.flush()

    event_type = ShiftEventType.SHIFT_CLOCK_IN if clock_in else ShiftEventType.SHIFT_CLOCK_OUT
    db.add(ShiftEvent(id=uuid.uuid4(), shift_id=shift.id, event_type=event_type))
    await db.commit()
    return {"status": "ok", "event": event_type.value}


async def list_spheres() -> list[dict]:
    return [{"id": "picking", "label": "Picking"}]


async def list_available_tasks(db: AsyncSession, user: User) -> list[dict]:
    result = await db.execute(
        select(MicroTask)
        .options(selectinload(MicroTask.items))
        .where(MicroTask.status == TaskStatus.PENDING)
        .where(MicroTask.assigned_user_id.is_(None))
        .order_by(MicroTask.created_at.asc())
    )
    tasks = result.unique().scalars().all()
    return [
        {
            "task_id": task.id,
            "task_number": task.task_number,
            "item_count": len(task.items),
            "total_quantity": float(sum(_to_decimal(i.quantity_to_pick) for i in task.items)),
        }
        for task in tasks
    ]


async def claim_task(db: AsyncSession, user: User, task_id: uuid.UUID) -> dict:
    existing = await _load_session(db, user.id)
    if existing:
        raise HTTPException(status_code=409, detail="Active pick session already exists")

    task = await _load_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.PENDING or task.assigned_user_id is not None:
        raise HTTPException(status_code=409, detail="Task is not available")

    task.status = TaskStatus.IN_PROGRESS
    task.assigned_user_id = user.id
    user.status = WorkerStatus.PICKING

    active = _active_item(task)
    session = PickSession(
        id=uuid.uuid4(),
        user_id=user.id,
        micro_task_id=task.id,
        current_item_id=active.id if active else None,
        step=PickStep.CONTAINER_SCAN,
    )
    db.add(session)
    await db.commit()

    session = await _load_session(db, user.id)
    if not session:
        raise HTTPException(status_code=500, detail="Failed to create session")
    return _session_payload(session)


async def get_current_session(db: AsyncSession, user: User) -> Optional[dict]:
    session = await _load_session(db, user.id)
    if not session:
        return None
    return _session_payload(session)


async def advance_to_location(db: AsyncSession, user: User) -> dict:
    session = await _load_session(db, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    if session.step != PickStep.GO_TO_LOCATION:
        raise HTTPException(status_code=400, detail=f"Expected GO_TO_LOCATION, got {session.step.value}")

    session.step = PickStep.LOCATION_VERIFY
    await db.commit()
    session = await _load_session(db, user.id)
    return _session_payload(session)  # type: ignore[arg-type]


async def process_session_scan(db: AsyncSession, user: User, barcode: str) -> dict:
    session = await _load_session(db, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")

    scanned = barcode.strip()
    step = session.step

    if step == PickStep.CONTAINER_SCAN:
        container = await container_service.activate_container_on_scan(
            db,
            barcode=scanned,
            picker_user=user,
            micro_task_id=session.micro_task_id,
        )
        session.container_id = container.id
        session.step = PickStep.GO_TO_LOCATION

    elif step == PickStep.LOCATION_VERIFY:
        item = session.current_item or _active_item(session.micro_task)
        if not item or not item.source_location:
            raise HTTPException(status_code=400, detail="No active pick line")
        if not location_barcode_matches(item.source_location.code, scanned):
            raise HTTPException(status_code=400, detail="Location barcode does not match")

        session.step = PickStep.SKU_SCAN

    elif step == PickStep.SKU_SCAN:
        item = session.current_item or _active_item(session.micro_task)
        if not item or not item.product:
            raise HTTPException(status_code=400, detail="No active pick line")
        expected = {item.product.sku, item.product.barcode or ""}
        if scanned not in expected:
            raise HTTPException(status_code=400, detail="SKU barcode does not match")

        session.step = PickStep.QUANTITY_CONFIRM

    elif step == PickStep.BUFFER_SCAN:
        if scanned not in BUFFER_CODES:
            raise HTTPException(status_code=400, detail="Invalid buffer barcode")
        if not session.container:
            raise HTTPException(status_code=400, detail="No container on session")

        session.container.status = ContainerStatus.AT_BUFFER
        session.container.buffer_code = scanned
        session.micro_task.status = TaskStatus.COMPLETED
        session.step = PickStep.COMPLETED
        user.status = WorkerStatus.IDLE
        await user_service.increment_shift_pick(
            db,
            user.id,
            tasks=1,
        )

    else:
        raise HTTPException(status_code=400, detail=f"Scan not allowed at step {step.value}")

    await db.commit()
    session = await _load_session(db, user.id)
    if session:
        return _session_payload(session)
    return {"step": PickStep.COMPLETED.value, "message": "Session completed"}


async def confirm_quantity(db: AsyncSession, user: User, quantity: float) -> dict:
    session = await _load_session(db, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    if session.step != PickStep.QUANTITY_CONFIRM:
        raise HTTPException(status_code=400, detail="Not at quantity confirm step")

    item = session.current_item or _active_item(session.micro_task)
    if not item:
        raise HTTPException(status_code=400, detail="No active pick line")

    pick_qty = _to_decimal(quantity)
    if pick_qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    remaining = _remaining(item)
    if pick_qty > remaining:
        raise HTTPException(status_code=400, detail=f"Cannot pick more than {remaining}")

    int_qty = int(pick_qty)
    if pick_qty != int_qty:
        raise HTTPException(status_code=400, detail="Fractional inventory picks not supported yet")

    try:
        await inventory_service.commit_pick(
            db,
            product_id=item.product_id,
            location_id=item.source_location_id,
            quantity=int_qty,
            reference_id=session.micro_task.wave_id or session.micro_task_id,
            user_id=user.id,
        )
    except (
        inventory_service.BalanceNotFoundError,
        inventory_service.InsufficientStockError,
        inventory_service.InsufficientReservedError,
    ) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    item.quantity_picked = _to_decimal(item.quantity_picked) + pick_qty
    await user_service.increment_shift_pick(db, user.id, int_qty)

    if _remaining(item) <= 0:
        item.status = TaskStatus.COMPLETED
        next_item = _active_item(session.micro_task)
        session.current_item_id = next_item.id if next_item else None
        if next_item:
            session.step = PickStep.GO_TO_LOCATION
        else:
            session.step = PickStep.BUFFER_SCAN
    else:
        session.step = PickStep.GO_TO_LOCATION

    await db.commit()

    from app.services.shift_live_service import publish_shift_live_update

    await publish_shift_live_update(db)

    session = await _load_session(db, user.id)
    if session:
        return _session_payload(session)
    return {"step": PickStep.COMPLETED.value, "message": "Session completed"}
