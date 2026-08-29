import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Enum, DateTime, ForeignKey, func, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ContainerStatus, IssuedLabelStatus


class IssuedContainerLabel(Base):
    """Barcode printed by packer; becomes a live container only after picker scan."""

    __tablename__ = "issued_container_labels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    barcode: Mapped[str] = mapped_column(String(8), unique=True, index=True, nullable=False)
    status: Mapped[IssuedLabelStatus] = mapped_column(
        Enum(IssuedLabelStatus), nullable=False, default=IssuedLabelStatus.ISSUED
    )
    issued_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    issued_by_user: Mapped["User"] = relationship("User", foreign_keys=[issued_by_user_id])


class Container(Base):
    __tablename__ = "containers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    barcode: Mapped[str] = mapped_column(String(8), unique=True, index=True, nullable=False)
    status: Mapped[ContainerStatus] = mapped_column(
        Enum(ContainerStatus), nullable=False, default=ContainerStatus.IN_PICKING
    )
    micro_task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("micro_tasks.id", ondelete="SET NULL"), nullable=True
    )
    picker_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    buffer_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    micro_task: Mapped[Optional["MicroTask"]] = relationship("MicroTask", foreign_keys=[micro_task_id])
    picker_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[picker_user_id])
    created_by_user: Mapped["User"] = relationship("User", foreign_keys=[created_by_user_id])
