import uuid
from typing import Optional, List
from sqlalchemy import String, Enum, Integer, Numeric, ForeignKey, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import LocationType

class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    locations: Mapped[List["Location"]] = relationship("Location", back_populates="zone", cascade="all, delete-orphan")

class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    aisle: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    rack: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    shelf: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    type: Mapped[LocationType] = mapped_column(Enum(LocationType), nullable=False, default=LocationType.STORAGE)
    max_weight_kg: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    max_volume_m3: Mapped[Optional[float]] = mapped_column(Numeric(10, 3), nullable=True)

    zone: Mapped["Zone"] = relationship("Zone", back_populates="locations")
