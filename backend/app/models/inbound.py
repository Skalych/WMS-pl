import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Enum, Integer, Date, DateTime, ForeignKey, func, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import InboundStatus

class InboundShipment(Base):
    __tablename__ = "inbound_shipments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[InboundStatus] = mapped_column(Enum(InboundStatus), nullable=False, default=InboundStatus.PENDING)
    dock_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by_user: Mapped["User"] = relationship("User")
    items: Mapped[List["InboundItem"]] = relationship("InboundItem", back_populates="shipment", cascade="all, delete-orphan")

class InboundItem(Base):
    __tablename__ = "inbound_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inbound_shipments.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    expected_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    received_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lot_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    expiration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    shipment: Mapped["InboundShipment"] = relationship("InboundShipment", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
