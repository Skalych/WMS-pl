from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.users import User, Shift, ShiftEvent
from app.models.enums import UserRole, WorkerStatus, ShiftEventType
from app.core.security import hash_password, verify_password


async def get_users(db: AsyncSession, role: Optional[UserRole] = None, status: Optional[WorkerStatus] = None):
    query = select(User).options(joinedload(User.current_location))
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    result = await db.execute(query.order_by(User.full_name))
    users = result.scalars().all()
    for user in users:
        if user.status == WorkerStatus.BREAK:
            user.current_location_code = "CAFETERIA"
        elif user.status == WorkerStatus.OFFLINE:
            user.current_location_code = "OFFLINE"
        elif user.status == WorkerStatus.IDLE:
            user.current_location_code = "IDLE (Base)"
        else:
            user.current_location_code = user.current_location.code if user.current_location else None
    return users


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, email: str, password: str, full_name: str, role: UserRole):
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=role,
        status=WorkerStatus.OFFLINE,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_status(db: AsyncSession, user_id: uuid.UUID, status: Optional[WorkerStatus] = None, location_id: Optional[uuid.UUID] = None, efficiency: Optional[float] = None):
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    if status is not None:
        user.status = status
    if efficiency is not None:
        user.efficiency = efficiency
    if location_id is not None:
        user.current_location_id = location_id
    await db.commit()
    await db.refresh(user)
    return user


async def bulk_update_status(db: AsyncSession, user_ids: list[uuid.UUID], status: WorkerStatus):
    query = select(User).where(User.id.in_(user_ids))
    result = await db.execute(query)
    users = result.scalars().all()
    for user in users:
        # If requested to set to IDLE (starting shift), map it based on user role
        if status == WorkerStatus.IDLE and user.status == WorkerStatus.OFFLINE:
            if user.role == UserRole.INBOUND_OPERATOR:
                user.status = WorkerStatus.RECEIVING
            elif user.role == UserRole.PACKER_DISPATCHER:
                user.status = WorkerStatus.SORTING
            else:
                user.status = WorkerStatus.IDLE
        else:
            user.status = status

        if user.status in [WorkerStatus.IDLE, WorkerStatus.RECEIVING, WorkerStatus.SORTING]:
            user.picking_progress = 0
            user.total_picked = 0
            # Note: shift time is generated via DB updated_at or simulated, 
            # for now we'll just reset progress.
    await db.commit()
    return users


async def count_online_users(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(User).where(User.status != WorkerStatus.OFFLINE)
    )
    return result.scalar_one()


async def count_total_users(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User))
    return result.scalar_one()

async def get_current_shift(db: AsyncSession, user_id: uuid.UUID) -> Optional[Shift]:
    query = select(Shift).where(
        Shift.user_id == user_id,
        Shift.end_time == None
    ).order_by(Shift.start_time.desc())
    result = await db.execute(query)
    return result.scalars().first()

async def get_past_shifts(db: AsyncSession, user_id: uuid.UUID) -> list[Shift]:
    query = select(Shift).where(
        Shift.user_id == user_id,
        Shift.end_time != None
    ).order_by(Shift.start_time.desc())
    result = await db.execute(query)
    return result.scalars().all()

async def get_current_shift_with_events(db: AsyncSession, user_id: uuid.UUID) -> Optional[Shift]:
    query = select(Shift).options(joinedload(Shift.events)).where(
        Shift.user_id == user_id,
        Shift.end_time == None
    ).order_by(Shift.start_time.desc())
    result = await db.execute(query)
    return result.scalars().first()

async def start_shift(db: AsyncSession, user_id: uuid.UUID) -> Shift:
    # Close any existing open shifts
    existing_shift = await get_current_shift(db, user_id)
    if existing_shift:
        existing_shift.end_time = func.now()
        db.add(ShiftEvent(id=uuid.uuid4(), shift_id=existing_shift.id, event_type=ShiftEventType.LOGOUT))
    
    # Create new shift
    new_shift = Shift(id=uuid.uuid4(), user_id=user_id)
    db.add(new_shift)
    await db.flush() # to get ID
    
    login_event = ShiftEvent(id=uuid.uuid4(), shift_id=new_shift.id, event_type=ShiftEventType.LOGIN)
    db.add(login_event)
    
    await update_user_status(db, user_id, status=WorkerStatus.IDLE)
    await db.commit()
    await db.refresh(new_shift)
    return new_shift

async def end_shift(db: AsyncSession, user_id: uuid.UUID) -> Optional[Shift]:
    shift = await get_current_shift(db, user_id)
    if shift:
        shift.end_time = func.now()
        db.add(ShiftEvent(id=uuid.uuid4(), shift_id=shift.id, event_type=ShiftEventType.LOGOUT))
        
    await update_user_status(db, user_id, status=WorkerStatus.OFFLINE)
    await db.commit()
    return shift

async def start_break(db: AsyncSession, user_id: uuid.UUID) -> Optional[Shift]:
    shift = await get_current_shift(db, user_id)
    if not shift:
        return None
        
    user = await get_user(db, user_id)
    if user and user.status == WorkerStatus.BREAK:
        return shift
        
    db.add(ShiftEvent(id=uuid.uuid4(), shift_id=shift.id, event_type=ShiftEventType.BREAK_START))
    await update_user_status(db, user_id, status=WorkerStatus.BREAK)
    await db.commit()
    return shift

async def end_break(db: AsyncSession, user_id: uuid.UUID) -> Optional[Shift]:
    shift = await get_current_shift(db, user_id)
    if not shift:
        return None
        
    user = await get_user(db, user_id)
    if user and user.status != WorkerStatus.BREAK:
        return shift
        
    db.add(ShiftEvent(id=uuid.uuid4(), shift_id=shift.id, event_type=ShiftEventType.BREAK_END))
    await update_user_status(db, user_id, status=WorkerStatus.IDLE)
    await db.commit()
    return shift

