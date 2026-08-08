from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from app.models.enums import InboundStatus

class InboundItemCreate(BaseModel):
    product_id: UUID
    expected_quantity: int = Field(..., gt=0)
    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None

class InboundCreate(BaseModel):
    supplier_name: str = Field(..., max_length=150)
    dock_number: Optional[str] = None
    items: List[InboundItemCreate]

class InboundItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    expected_quantity: int
    received_quantity: int

    model_config = {"from_attributes": True}

class InboundResponse(BaseModel):
    id: UUID
    shipment_number: str
    supplier_name: str
    status: InboundStatus
    dock_number: Optional[str] = None
    items_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
