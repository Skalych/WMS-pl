from __future__ import annotations

from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.inventory import InventoryBalance
from app.models.catalog import Product, Category
from app.models.topology import Location

LOW_STOCK_THRESHOLD = 10


async def get_inventory_items(db: AsyncSession, search: Optional[str] = None):
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
    result = await db.execute(query.order_by(InventoryBalance.updated_at.desc()))
    return result.unique().scalars().all()


def compute_stock_status(quantity: int, reserved: int) -> str:
    available = quantity - reserved
    if available <= 0:
        return "out_of_stock"
    elif available <= LOW_STOCK_THRESHOLD:
        return "low_stock"
    return "in_stock"


async def get_inventory_stats(db: AsyncSession):
    items = await get_inventory_items(db)
    total = len(items)
    in_stock = sum(1 for i in items if compute_stock_status(i.quantity, i.reserved_quantity) == "in_stock")
    low = sum(1 for i in items if compute_stock_status(i.quantity, i.reserved_quantity) == "low_stock")
    oos = sum(1 for i in items if compute_stock_status(i.quantity, i.reserved_quantity) == "out_of_stock")
    return {"total_skus": total, "in_stock": in_stock, "low_stock": low, "out_of_stock": oos}
