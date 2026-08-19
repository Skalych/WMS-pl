from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

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

class PaginatedInventoryResponse(BaseModel):
    items: List[InventoryItemResponse]
    total: int
    page: int
    size: int

    model_config = {"from_attributes": True}

class InventoryStatsResponse(BaseModel):
    total_skus: int
    in_stock: int
    low_stock: int
    out_of_stock: int


class InventoryTransactionResponse(BaseModel):
    id: UUID
    product_sku: str
    quantity: int
    transaction_type: str
    source_location: Optional[str] = None
    target_location: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTransactionsResponse(BaseModel):
    items: List[InventoryTransactionResponse]
    total: int
    page: int
    size: int
