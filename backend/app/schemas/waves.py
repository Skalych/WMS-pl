from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.enums import WaveStatus, TaskStatus

class WaveCreate(BaseModel):
    order_ids: List[UUID] = Field(..., min_length=1)

class WaveAllocationSummary(BaseModel):
    lines_fully_allocated: int = 0
    lines_partially_allocated: int = 0
    lines_skipped: int = 0
    total_units_allocated: int = 0

class MicroTaskResponse(BaseModel):
    id: UUID
    task_number: str
    status: TaskStatus
    progress: float = 0.0
    items_count: int = 0
    assigned_user_name: Optional[str] = None

    model_config = {"from_attributes": True}


class WaveResponse(BaseModel):
    id: UUID
    wave_number: str
    status: WaveStatus
    total_orders_count: int
    progress: float = 0.0  # 0-100
    micro_tasks: List[MicroTaskResponse] = []
    micro_tasks_completed: int = 0
    micro_tasks_total: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}

class WaveCreateResponse(WaveResponse):
    allocation_summary: WaveAllocationSummary
