import uuid
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class SortingStation(Base):
    __tablename__ = "sorting_stations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    location: Mapped["Location"] = relationship("Location")
    bins: Mapped[List["SortingBin"]] = relationship("SortingBin", back_populates="station", cascade="all, delete-orphan")

class SortingBin(Base):
    __tablename__ = "sorting_bins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sorting_stations.id", ondelete="CASCADE"), nullable=False)
    bin_code: Mapped[str] = mapped_column(String(20), nullable=False)
    current_order_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    is_full: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    station: Mapped["SortingStation"] = relationship("SortingStation", back_populates="bins")
    current_order: Mapped[Optional["Order"]] = relationship("Order")
