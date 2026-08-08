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
    created_at: datetime

    model_config = {"from_attributes": True}

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
