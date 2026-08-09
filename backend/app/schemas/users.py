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
    events: Optional[list[ShiftEventResponse]] = None

    model_config = {"from_attributes": True}
