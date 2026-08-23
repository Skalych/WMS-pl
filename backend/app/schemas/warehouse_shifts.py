from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class HourlyBucketOut(BaseModel):
    time: str
    picked: int
    inbound: int


class TopPickerOut(BaseModel):
    user_id: str
    name: str
    items: int
    pct_of_leader: int


class WarehouseShiftSummary(BaseModel):
    id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool
    elapsed_seconds: int
    items_picked: int
    waves_completed: int
    orders_shipped: int
    inbound_received_units: int
    pick_rate_per_hour: float
    top_pickers: List[TopPickerOut] = Field(default_factory=list)
    hourly_buckets: List[HourlyBucketOut] = Field(default_factory=list)


class WarehouseShiftDetail(WarehouseShiftSummary):
    metrics: dict[str, Any] = Field(default_factory=dict)


class ShiftReportDraftOut(BaseModel):
    id: UUID
    warehouse_shift_id: UUID
    title: str
    content_json: dict[str, Any]
    updated_at: datetime


class ShiftReportDraftUpdate(BaseModel):
    title: Optional[str] = None
    content_json: Optional[dict[str, Any]] = None


class ReportExportRequest(BaseModel):
    format: str = "pdf"
    html: str
    title: Optional[str] = None
