from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.inventory import InventoryItemResponse, InventoryStatsResponse, PaginatedInventoryResponse
from app.services import inventory_service
from typing import Optional

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/", response_model=PaginatedInventoryResponse)
async def get_inventory(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    skip = (page - 1) * size
    items, total = await inventory_service.get_inventory_items(
        db, skip=skip, limit=size, search=search, category=category, status=status, sort_by=sort_by
    )
    
    response_items = [
        InventoryItemResponse(
            id=item.id,
            sku=item.product.sku,
            product_name=item.product.name,
            category=item.product.category.name if item.product.category else None,
            location=item.location.code,
            quantity=item.quantity,
            reserved_quantity=item.reserved_quantity,
            status=inventory_service.compute_stock_status(item.quantity, item.reserved_quantity),
        )
        for item in items
    ]
    
    return PaginatedInventoryResponse(
        items=response_items,
        total=total,
        page=page,
        size=size
    )


@router.get("/stats", response_model=InventoryStatsResponse)
async def inventory_stats(db: AsyncSession = Depends(get_db)):
    stats = await inventory_service.get_inventory_stats(db)
    return stats
