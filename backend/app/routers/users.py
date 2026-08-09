import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.users import UserResponse, UserStatusUpdate
from app.services import user_service
from app.models.enums import UserRole, WorkerStatus
from typing import Optional

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    role: Optional[UserRole] = Query(None),
    status: Optional[WorkerStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.get_users(db, role=role, status=status)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_status(
    user_id: uuid.UUID,
    data: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.update_user_status(db, user_id, status=data.status, location_id=data.current_location_id, efficiency=data.efficiency)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
