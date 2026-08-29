import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Enum, DateTime, ForeignKey, func, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PickStep


class PickSession(Base):
    __tablename__ = "pick_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    micro_task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("micro_tasks.id", ondelete="CASCADE"), nullable=False
    )
    container_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("containers.id", ondelete="SET NULL"), nullable=True
    )
    current_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("micro_task_items.id", ondelete="SET NULL"), nullable=True
    )
    step: Mapped[PickStep] = mapped_column(Enum(PickStep), nullable=False, default=PickStep.CONTAINER_SCAN)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    micro_task: Mapped["MicroTask"] = relationship("MicroTask", foreign_keys=[micro_task_id])
    container: Mapped[Optional["Container"]] = relationship("Container", foreign_keys=[container_id])
    current_item: Mapped[Optional["MicroTaskItem"]] = relationship(
        "MicroTaskItem", foreign_keys=[current_item_id]
    )
