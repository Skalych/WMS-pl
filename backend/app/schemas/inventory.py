from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class InventoryItemResponse(BaseModel):
    id: UUID
    sku: str
    product_name: str
    category: Optional[str] = None
    location: str
    quantity: int
    reserved_quantity: int
    status: str  # 'in_stock', 'low_stock', 'out_of_stock'

    model_config = {"from_attributes": True}

class InventoryStatsResponse(BaseModel):
    total_skus: int
    in_stock: int
    low_stock: int
    out_of_stock: int
