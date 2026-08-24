from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.users import User, Shift, ShiftEvent
from app.models.enums import UserRole, WorkerStatus, ShiftEventType, TaskStatus
from app.models.waves import MicroTask
from app.core.security import hash_password, verify_password
from app.schemas.users import (
    BreakSessionResponse,
    BreakSummaryBrief,
    BreakSummaryResponse,
    MyShiftResponse,
    MyShiftTaskProgress,
    ShiftEventResponse,
    ShiftResponse,
    TeamMemberResponse,
)

BREAK_LIMIT_MINUTES = 23


@dataclass
class BreakSessionSummary:
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: int


@dataclass
class BreakSummary:
    break_count: int
    break_minutes: int
    over_limit: bool
    current_break_started_at: Optional[datetime]
    sessions: list[BreakSessionSummary]


async def get_users(db: AsyncSession, role: Optional[UserRole] = None, status: Optional[WorkerStatus] = None):
    query = select(User).options(joinedload(User.current_location))
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    result = await db.execute(query.order_by(User.full_name))
    users = result.scalars().all()
    return [enrich_user(user) for user in users]


def _break_summary_brief(summary: BreakSummary) -> BreakSummaryBrief:
    return BreakSummaryBrief(
        break_count=summary.break_count,
        break_minutes=summary.break_minutes,
        over_limit=summary.over_limit,
        current_break_started_at=summary.current_break_started_at,
    )


async def get_team_members(
    db: AsyncSession,
    role: Optional[UserRole] = None,
    status: Optional[WorkerStatus] = None,
) -> list[TeamMemberResponse]:
    query = select(User).options(joinedload(User.current_location))
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    result = await db.execute(query.order_by(User.full_name))
    users = result.scalars().all()
    if not users:
        return []

    user_ids = [u.id for u in users]
    now = datetime.now(timezone.utc)
    shift_result = await db.execute(
        select(Shift)
        .options(joinedload(Shift.events))
        .where(Shift.user_id.in_(user_ids), Shift.end_time.is_(None))
    )
    shifts_by_user = {s.user_id: s for s in shift_result.unique().scalars().all()}

    members: list[TeamMemberResponse] = []
    for user in users:
        enriched = enrich_user(user)
        shift = shifts_by_user.get(user.id)
        break_summary = None
        has_active_shift = shift is not None
        if shift:
            summary = compute_break_summary(list(shift.events or []), now=now)
            break_summary = _break_summary_brief(summary)
        members.append(
            TeamMemberResponse(
                id=enriched.id,
                email=enriched.email,
                full_name=enriched.full_name,
                role=enriched.role,
                status=enriched.status,
                efficiency=enriched.efficiency,
                current_location_id=enriched.current_location_id,
                current_location_code=enriched.current_location_code,
                current_cart_items=enriched.current_cart_items,
                cart_capacity_items=enriched.cart_capacity_items,
                has_active_shift=has_active_shift,
                break_summary=break_summary,
            )
        )
    return members


def enrich_user(user: User) -> User:
    if user.status == WorkerStatus.BREAK:
        user.current_location_code = "CAFETERIA"
    elif user.status == WorkerStatus.OFFLINE:
        user.current_location_code = "OFFLINE"
    elif user.status == WorkerStatus.IDLE:
        user.current_location_code = "IDLE (Base)"
    else:
        user.current_location_code = user.current_location.code if user.current_location else None
    return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID):
    result = await db.execute(
        select(User).options(joinedload(User.current_location)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    return enrich_user(user) if user else None


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
        token_version=0,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def change_password(db: AsyncSession, user_id: uuid.UUID, new_password: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.password_hash = hash_password(new_password)
    user.token_version += 1
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
            user.current_cart_items = 0
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
    query = select(Shift).options(joinedload(Shift.events)).where(
        Shift.user_id == user_id,
        Shift.end_time == None
    ).order_by(Shift.start_time.desc())
    result = await db.execute(query)
    return result.unique().scalars().first()

async def get_past_shifts(db: AsyncSession, user_id: uuid.UUID) -> list[Shift]:
    query = select(Shift).options(joinedload(Shift.events)).where(
        Shift.user_id == user_id,
        Shift.end_time != None
    ).order_by(Shift.start_time.desc())
    result = await db.execute(query)
    return result.unique().scalars().all()

async def get_current_shift_with_events(db: AsyncSession, user_id: uuid.UUID) -> Optional[Shift]:
    query = select(Shift).options(joinedload(Shift.events)).where(
        Shift.user_id == user_id,
        Shift.end_time == None
    ).order_by(Shift.start_time.desc())
    result = await db.execute(query)
    return result.unique().scalars().first()

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
    
    user = await get_user_by_id(db, user_id)
    target_status = WorkerStatus.IDLE
    if user:
        if user.role == UserRole.INBOUND_OPERATOR:
            target_status = WorkerStatus.RECEIVING
        elif user.role == UserRole.PACKER_DISPATCHER:
            target_status = WorkerStatus.SORTING
            
        user.current_cart_items = 0

    await update_user_status(db, user_id, status=target_status)
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
        
    user = await get_user_by_id(db, user_id)
    if user and user.status == WorkerStatus.BREAK:
        return shift
        
    db.add(ShiftEvent(id=uuid.uuid4(), shift_id=shift.id, event_type=ShiftEventType.BREAK_START))
    await update_user_status(db, user_id, status=WorkerStatus.BREAK)
    await db.commit()
    return await get_current_shift(db, user_id)

async def end_break(db: AsyncSession, user_id: uuid.UUID) -> Optional[Shift]:
    shift = await get_current_shift(db, user_id)
    if not shift:
        return None
        
    user = await get_user_by_id(db, user_id)
    if user and user.status != WorkerStatus.BREAK:
        return shift
        
    db.add(ShiftEvent(id=uuid.uuid4(), shift_id=shift.id, event_type=ShiftEventType.BREAK_END))
    
    target_status = WorkerStatus.IDLE
    if user:
        if user.role == UserRole.INBOUND_OPERATOR:
            target_status = WorkerStatus.RECEIVING
        elif user.role == UserRole.PACKER_DISPATCHER:
            target_status = WorkerStatus.SORTING
            
    await update_user_status(db, user_id, status=target_status)
    await db.commit()
    return await get_current_shift(db, user_id)


async def increment_shift_pick(
    db: AsyncSession,
    user_id: uuid.UUID,
    quantity: int = 1,
    *,
    tasks: int = 0,
    orders: int = 0,
) -> None:
    shift = await get_current_shift(db, user_id)
    if not shift:
        return
    shift.total_items_picked += quantity
    shift.total_tasks_completed += tasks
    shift.total_orders_completed += orders
    db.add(shift)


async def increment_shift_receive(db: AsyncSession, user_id: uuid.UUID, quantity: int) -> None:
    if quantity <= 0:
        return
    shift = await get_current_shift(db, user_id)
    if not shift:
        return
    shift.total_units_received += quantity
    db.add(shift)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def compute_break_summary(events: list[ShiftEvent], *, now: Optional[datetime] = None) -> BreakSummary:
    now = _as_utc(now or datetime.now(timezone.utc))
    sessions: list[BreakSessionSummary] = []
    open_start: Optional[datetime] = None

    for event in sorted(events, key=lambda e: e.timestamp):
        if event.event_type == ShiftEventType.BREAK_START:
            open_start = _as_utc(event.timestamp)
        elif event.event_type == ShiftEventType.BREAK_END and open_start is not None:
            ended = _as_utc(event.timestamp)
            duration = max(0, int((ended - open_start).total_seconds()))
            sessions.append(BreakSessionSummary(open_start, ended, duration))
            open_start = None

    current_break_started_at: Optional[datetime] = None
    if open_start is not None:
        current_break_started_at = open_start
        duration = max(0, int((now - open_start).total_seconds()))
        sessions.append(BreakSessionSummary(open_start, None, duration))

    total_seconds = sum(s.duration_seconds for s in sessions)
    break_minutes = int(total_seconds // 60)
    return BreakSummary(
        break_count=len(sessions),
        break_minutes=break_minutes,
        over_limit=break_minutes >= BREAK_LIMIT_MINUTES,
        current_break_started_at=current_break_started_at,
        sessions=sessions,
    )


def compute_break_minutes(events: list[ShiftEvent], *, now: Optional[datetime] = None) -> int:
    return compute_break_summary(events, now=now).break_minutes


def _break_summary_response(summary: BreakSummary) -> BreakSummaryResponse:
    return BreakSummaryResponse(
        break_count=summary.break_count,
        break_minutes=summary.break_minutes,
        over_limit=summary.over_limit,
        current_break_started_at=summary.current_break_started_at,
        sessions=[
            BreakSessionResponse(
                started_at=s.started_at,
                ended_at=s.ended_at,
                duration_seconds=s.duration_seconds,
            )
            for s in summary.sessions
        ],
    )


def build_shift_response(shift: Shift, *, now: Optional[datetime] = None) -> ShiftResponse:
    effective_now = now or datetime.now(timezone.utc)
    if shift.end_time is not None:
        effective_now = min(_as_utc(effective_now), _as_utc(shift.end_time))
    summary = compute_break_summary(list(shift.events or []), now=effective_now)
    return ShiftResponse(
        id=shift.id,
        user_id=shift.user_id,
        start_time=shift.start_time,
        end_time=shift.end_time,
        total_tasks_completed=shift.total_tasks_completed,
        total_items_picked=shift.total_items_picked,
        total_volume_cm3=shift.total_volume_cm3,
        total_orders_completed=shift.total_orders_completed,
        error_count=shift.error_count,
        total_units_received=getattr(shift, "total_units_received", 0) or 0,
        events=[ShiftEventResponse.model_validate(e) for e in (shift.events or [])],
        break_summary=_break_summary_response(summary),
    )


async def get_active_task_progress(db: AsyncSession, user_id: uuid.UUID) -> Optional[MyShiftTaskProgress]:
    result = await db.execute(
        select(MicroTask)
        .options(selectinload(MicroTask.items))
        .where(MicroTask.assigned_user_id == user_id)
        .where(MicroTask.status == TaskStatus.IN_PROGRESS)
        .limit(1)
    )
    task = result.unique().scalar_one_or_none()
    if not task or not task.items:
        return None
    done = sum(i.quantity_picked for i in task.items)
    total = sum(i.quantity_to_pick for i in task.items)
    return MyShiftTaskProgress(
        task_id=task.id,
        task_type=task.type.value,
        quantity_done=done,
        quantity_total=total,
    )


async def build_my_shift_snapshot(db: AsyncSession, user: User) -> MyShiftResponse:
    shift = await get_current_shift_with_events(db, user.id)
    on_break = user.status == WorkerStatus.BREAK
    if not shift:
        return MyShiftResponse(
            has_active_shift=False,
            status=user.status,
            role=user.role,
            on_break=on_break,
        )

    now = datetime.now(timezone.utc)
    start = _as_utc(shift.start_time)
    elapsed_minutes = max(0, int((now - start).total_seconds() // 60))
    break_summary = compute_break_summary(list(shift.events or []), now=now)
    worked_hours = max((elapsed_minutes - break_summary.break_minutes) / 60.0, 1 / 60.0)
    pick_rate = round(shift.total_items_picked / worked_hours, 1)
    current_task = await get_active_task_progress(db, user.id)

    return MyShiftResponse(
        has_active_shift=True,
        status=user.status,
        role=user.role,
        shift_id=shift.id,
        start_time=shift.start_time,
        elapsed_minutes=elapsed_minutes,
        break_minutes=break_summary.break_minutes,
        break_count=break_summary.break_count,
        current_break_started_at=break_summary.current_break_started_at,
        on_break=on_break,
        total_items_picked=shift.total_items_picked,
        total_units_received=getattr(shift, "total_units_received", 0) or 0,
        total_tasks_completed=shift.total_tasks_completed,
        pick_rate_per_hour=pick_rate,
        current_task=current_task,
    )

