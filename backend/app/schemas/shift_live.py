from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class HourlyBucket(BaseModel):
    time: str
    picked: int
    inbound: int


class TopPicker(BaseModel):
    user_id: str
    name: str
    items: int
    pct_of_leader: int


class ShiftLiveEvent(BaseModel):
    id: str
    at: datetime
    type: str
    actor: str
    detail: str


class ShiftLiveResponse(BaseModel):
    shift_active: bool
    shift_started_at: Optional[datetime] = None
    elapsed_seconds: int
    items_picked: int
    items_picked_delta_5m: int
    waves_completed: int
    waves_active: int
    orders_shipped: int
    inbound_received_units: int
    pickers_online: int
    pick_rate_per_hour: float
    hourly_buckets: List[HourlyBucket]
    top_pickers: List[TopPicker]
    recent_events: List[ShiftLiveEvent]
