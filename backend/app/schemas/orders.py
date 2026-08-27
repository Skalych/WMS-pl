from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.enums import OrderStatus, OrderPriority

class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)

class OrderCreate(BaseModel):
    customer_name: str = Field(..., max_length=150)
    shipping_address: str
    priority: OrderPriority = OrderPriority.MEDIUM
    items: List[OrderItemCreate]
    macro_order_id: Optional[UUID] = None

class MacroOrderCreate(BaseModel):
    size: str = Field(..., description="small, medium, or large")

class MacroOrderResponse(BaseModel):
    id: UUID
    reference_number: str
    status: OrderStatus
    created_at: datetime
    orders_count: int = 0
    progress: int = 0

    model_config = {"from_attributes": True}

class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    requested_quantity: int
    sorted_quantity: int

    model_config = {"from_attributes": True}

class OrderResponse(BaseModel):
    id: UUID
    order_number: str
    status: OrderStatus
    priority: OrderPriority
    customer_name: str
    shipping_address: str
    item_count: int = 0
    total_requested: int = 0
    total_allocated: int = 0
    wave_number: Optional[str] = None
    macro_order_id: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
