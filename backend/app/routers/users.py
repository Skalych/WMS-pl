import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.schemas.users import UserResponse, UserStatusUpdate, BulkShiftUpdate, ShiftResponse, MyShiftResponse, TeamMemberResponse
from app.services import user_service
from app.models.enums import UserRole, WorkerStatus
from app.models.users import User
from typing import Optional

router = APIRouter(prefix="/users", tags=["Users"])

FLOOR_ROLES = {UserRole.PICKER, UserRole.INBOUND_OPERATOR, UserRole.PACKER_DISPATCHER, UserRole.ADMIN_MANAGER}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/shift", response_model=MyShiftResponse)
async def get_my_shift(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await user_service.build_my_shift_snapshot(db, current_user)


@router.post("/me/break/start", response_model=MyShiftResponse)
async def start_my_break(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in FLOOR_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed")
    shift = await user_service.start_break(db, current_user.id)
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift found")
    user = await user_service.get_user_by_id(db, current_user.id)
    return await user_service.build_my_shift_snapshot(db, user)


@router.post("/me/break/end", response_model=MyShiftResponse)
async def end_my_break(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in FLOOR_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed")
    shift = await user_service.end_break(db, current_user.id)
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift found")
    user = await user_service.get_user_by_id(db, current_user.id)
    return await user_service.build_my_shift_snapshot(db, user)


@router.get("", response_model=list[TeamMemberResponse])
async def list_users(
    role: Optional[UserRole] = Query(None),
    status: Optional[WorkerStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    return await user_service.get_team_members(db, role=role, status=status)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_status(
    user_id: uuid.UUID,
    data: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    user = await user_service.update_user_status(db, user_id, status=data.status, location_id=data.current_location_id, efficiency=data.efficiency)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_service.enrich_user(user)


@router.post("/shift/start", response_model=list[UserResponse])
async def start_shift(
    data: BulkShiftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    for uid in data.user_ids:
        await user_service.start_shift(db, uid)
    from app.services import warehouse_shift_service
    from app.services.shift_live_service import publish_shift_live_update
    await warehouse_shift_service.ensure_open_warehouse_shift(db, started_by=current_user.id)
    await publish_shift_live_update(db)
    return [await user_service.get_user_by_id(db, uid) for uid in data.user_ids]


@router.post("/shift/end", response_model=list[UserResponse])
async def end_shift(
    data: BulkShiftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    for uid in data.user_ids:
        await user_service.end_shift(db, uid)
    from app.services import warehouse_shift_service
    from app.services.shift_live_service import publish_shift_live_update
    await warehouse_shift_service.maybe_close_warehouse_shift(db, ended_by=current_user.id)
    await publish_shift_live_update(db)
    return [await user_service.get_user_by_id(db, uid) for uid in data.user_ids]


@router.get("/{user_id}/shift/current", response_model=ShiftResponse)
async def get_current_shift(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    shift = await user_service.get_current_shift_with_events(db, user_id)
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift found")
    return user_service.build_shift_response(shift)


@router.get("/{user_id}/shifts", response_model=list[ShiftResponse])
async def get_past_shifts(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    shifts = await user_service.get_past_shifts(db, user_id)
    return [user_service.build_shift_response(shift) for shift in shifts]


@router.post("/{user_id}/break/start", response_model=ShiftResponse)
async def start_break(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    shift = await user_service.start_break(db, user_id)
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift found")
    return user_service.build_shift_response(shift)


@router.post("/{user_id}/break/end", response_model=ShiftResponse)
async def end_break(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    shift = await user_service.end_break(db, user_id)
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift found")
    return user_service.build_shift_response(shift)
