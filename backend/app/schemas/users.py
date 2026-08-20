from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.enums import UserRole, WorkerStatus, ShiftEventType

class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., max_length=100)
    role: UserRole = UserRole.PICKER

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    status: WorkerStatus
    efficiency: float
    current_location_id: Optional[UUID] = None
    current_location_code: Optional[str] = None

    model_config = {"from_attributes": True}

class UserStatusUpdate(BaseModel):
    status: Optional[WorkerStatus] = None
    efficiency: Optional[float] = None
    current_location_id: Optional[UUID] = None

class BulkShiftUpdate(BaseModel):
    user_ids: list[UUID]

class ShiftEventResponse(BaseModel):
    id: UUID
    event_type: ShiftEventType
    timestamp: datetime
    model_config = {"from_attributes": True}

class ShiftResponse(BaseModel):
    id: UUID
    user_id: UUID
    start_time: datetime
    end_time: Optional[datetime]
    total_tasks_completed: int
    total_items_picked: int
    total_volume_cm3: float
    total_orders_completed: int
    error_count: int
    total_units_received: int = 0
    events: Optional[list[ShiftEventResponse]] = None

    model_config = {"from_attributes": True}


class MyShiftTaskProgress(BaseModel):
    task_id: UUID
    task_type: str
    quantity_done: int
    quantity_total: int


class MyShiftResponse(BaseModel):
    has_active_shift: bool
    status: WorkerStatus
    role: UserRole
    shift_id: Optional[UUID] = None
    start_time: Optional[datetime] = None
    elapsed_minutes: int = 0
    break_minutes: int = 0
    on_break: bool = False
    total_items_picked: int = 0
    total_units_received: int = 0
    total_tasks_completed: int = 0
    pick_rate_per_hour: float = 0.0
    current_task: Optional[MyShiftTaskProgress] = None
