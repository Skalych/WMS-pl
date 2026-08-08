from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.enums import WaveStatus

class WaveCreate(BaseModel):
    order_ids: List[UUID] = Field(..., min_length=1)

class WaveResponse(BaseModel):
    id: UUID
    wave_number: str
    status: WaveStatus
    total_orders_count: int
    progress: float = 0.0  # 0-100
    created_at: datetime

    model_config = {"from_attributes": True}
