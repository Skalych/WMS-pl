import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Enum, Integer, DateTime, ForeignKey, UniqueConstraint, func, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import WaveStatus, TaskStatus, TaskType

class Wave(Base):
    __tablename__ = "waves"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wave_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    status: Mapped[WaveStatus] = mapped_column(Enum(WaveStatus), nullable=False, default=WaveStatus.DRAFT)
    total_orders_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by_user: Mapped["User"] = relationship("User")
    wave_orders: Mapped[List["WaveOrder"]] = relationship("WaveOrder", back_populates="wave", cascade="all, delete-orphan")
    micro_tasks: Mapped[List["MicroTask"]] = relationship("MicroTask", back_populates="wave", cascade="all, delete-orphan")

class WaveOrder(Base):
    __tablename__ = "wave_orders"
    __table_args__ = (
        UniqueConstraint("wave_id", "order_id", name="uq_wave_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wave_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("waves.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)

    wave: Mapped["Wave"] = relationship("Wave", back_populates="wave_orders")
    order: Mapped["Order"] = relationship("Order")

class MicroTask(Base):
    __tablename__ = "micro_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wave_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("waves.id", ondelete="CASCADE"), nullable=True)
    task_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    type: Mapped[TaskType] = mapped_column(Enum(TaskType), nullable=False)
    assigned_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    wave: Mapped[Optional["Wave"]] = relationship("Wave", back_populates="micro_tasks")
    assigned_user: Mapped[Optional["User"]] = relationship("User")
    items: Mapped[List["MicroTaskItem"]] = relationship("MicroTaskItem", back_populates="micro_task", cascade="all, delete-orphan")

class MicroTaskItem(Base):
    __tablename__ = "micro_task_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    micro_task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("micro_tasks.id", ondelete="CASCADE"), nullable=False)
    order_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("order_items.id", ondelete="SET NULL"), nullable=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    source_location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    target_location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    quantity_to_pick: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_picked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING)

    micro_task: Mapped["MicroTask"] = relationship("MicroTask", back_populates="items")
    order_item: Mapped[Optional["OrderItem"]] = relationship("OrderItem")
    product: Mapped["Product"] = relationship("Product")
    source_location: Mapped["Location"] = relationship("Location", foreign_keys=[source_location_id])
    target_location: Mapped["Location"] = relationship("Location", foreign_keys=[target_location_id])
