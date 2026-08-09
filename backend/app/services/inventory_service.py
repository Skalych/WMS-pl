from __future__ import annotations

from typing import Optional
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.inventory import InventoryBalance
from app.models.catalog import Product, Category
from app.models.topology import Location

LOW_STOCK_THRESHOLD = 10


async def get_inventory_items(db: AsyncSession, skip: int = 0, limit: int = 50, search: Optional[str] = None):
    query = (
        select(InventoryBalance)
        .options(
            joinedload(InventoryBalance.product).joinedload(Product.category),
            joinedload(InventoryBalance.location),
        )
    )
    if search:
        query = query.join(InventoryBalance.product).where(
            Product.sku.ilike(f"%{search}%") | Product.name.ilike(f"%{search}%")
        )
        
    # Get total count first
    count_query = select(func.count()).select_from(query.subquery())
    total_count = await db.scalar(count_query)
    
    # Get paginated items
    result = await db.execute(query.order_by(InventoryBalance.updated_at.desc()).offset(skip).limit(limit))
    items = result.unique().scalars().all()
    
    return items, total_count


def compute_stock_status(quantity: int, reserved: int) -> str:
    available = quantity - reserved
    if available <= 0:
        return "out_of_stock"
    elif available <= LOW_STOCK_THRESHOLD:
        return "low_stock"
    return "in_stock"


async def get_inventory_stats(db: AsyncSession):
    # Optimized SQL aggregation so we don't pull all inventory rows into Python memory
    query = select(
        func.count(InventoryBalance.id).label("total"),
        func.sum(
            case(
                (InventoryBalance.quantity - InventoryBalance.reserved_quantity > LOW_STOCK_THRESHOLD, 1),
                else_=0
            )
        ).label("in_stock"),
        func.sum(
            case(
                ((InventoryBalance.quantity - InventoryBalance.reserved_quantity <= LOW_STOCK_THRESHOLD) & (InventoryBalance.quantity - InventoryBalance.reserved_quantity > 0), 1),
                else_=0
            )
        ).label("low_stock"),
        func.sum(
            case(
                (InventoryBalance.quantity - InventoryBalance.reserved_quantity <= 0, 1),
                else_=0
            )
        ).label("out_of_stock")
    )
    result = await db.execute(query)
    row = result.fetchone()
    
    return {
        "total_skus": row.total or 0 if row else 0,
        "in_stock": row.in_stock or 0 if row else 0,
        "low_stock": row.low_stock or 0 if row else 0,
        "out_of_stock": row.out_of_stock or 0 if row else 0
    }
