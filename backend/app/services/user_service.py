from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.users import User
from app.models.enums import UserRole, WorkerStatus
from app.core.security import hash_password, verify_password


async def get_users(db: AsyncSession, role: Optional[UserRole] = None, status: Optional[WorkerStatus] = None):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    result = await db.execute(query.order_by(User.full_name))
    return result.scalars().all()


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


async def count_online_users(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(User).where(User.status != WorkerStatus.OFFLINE)
    )
    return result.scalar_one()


async def count_total_users(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User))
    return result.scalar_one()
