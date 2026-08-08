from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.inventory import InventoryItemResponse, InventoryStatsResponse
from app.services import inventory_service
from typing import Optional

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=list[InventoryItemResponse])
async def list_inventory(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    items = await inventory_service.get_inventory_items(db, search=search)
    return [
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


@router.get("/stats", response_model=InventoryStatsResponse)
async def inventory_stats(db: AsyncSession = Depends(get_db)):
    stats = await inventory_service.get_inventory_stats(db)
    return stats
