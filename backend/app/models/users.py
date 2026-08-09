import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Enum, DateTime, ForeignKey, Integer, func, UUID, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import UserRole, WorkerStatus, ShiftEventType

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.PICKER)
    status: Mapped[WorkerStatus] = mapped_column(Enum(WorkerStatus), nullable=False, default=WorkerStatus.OFFLINE)
    efficiency: Mapped[float] = mapped_column(Float, nullable=False, default=1.0, server_default="1.0")
    cart_capacity_items: Mapped[int] = mapped_column(Integer, nullable=False, default=15, server_default="15")
    current_cart_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    current_location_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    current_location: Mapped[Optional["Location"]] = relationship("Location", foreign_keys=[current_location_id])
    shifts: Mapped[List["Shift"]] = relationship("Shift", back_populates="user")

class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    total_items_picked: Mapped[int] = mapped_column(Integer, default=0)
    total_volume_cm3: Mapped[float] = mapped_column(Float, default=0.0)
    total_orders_completed: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship("User", back_populates="shifts")
    events: Mapped[List["ShiftEvent"]] = relationship("ShiftEvent", back_populates="shift", cascade="all, delete-orphan")

class ShiftEvent(Base):
    __tablename__ = "shift_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shift_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[ShiftEventType] = mapped_column(Enum(ShiftEventType), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    shift: Mapped["Shift"] = relationship("Shift", back_populates="events")
