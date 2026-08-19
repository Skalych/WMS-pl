from __future__ import annotations

import uuid
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.inventory import InventoryBalance, InventoryTransaction
from app.models.catalog import Product, Category
from app.models.enums import TransactionType

LOW_STOCK_THRESHOLD = 10


class InsufficientStockError(Exception):
    def __init__(self, product_id: uuid.UUID, requested: int, available: int):
        self.product_id = product_id
        self.requested = requested
        self.available = available
        super().__init__(f"Insufficient stock for product {product_id}: need {requested}, available {available}")


async def record_transaction(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
    quantity: int,
    transaction_type: TransactionType,
    user_id: uuid.UUID,
    source_location_id: Optional[uuid.UUID] = None,
    target_location_id: Optional[uuid.UUID] = None,
    reference_id: Optional[uuid.UUID] = None,
) -> InventoryTransaction:
    tx = InventoryTransaction(
        id=uuid.uuid4(),
        product_id=product_id,
        source_location_id=source_location_id,
        target_location_id=target_location_id,
        quantity=quantity,
        transaction_type=transaction_type,
        reference_id=reference_id,
        user_id=user_id,
    )
    db.add(tx)
    return tx


async def get_balance_at_location(
    db: AsyncSession, product_id: uuid.UUID, location_id: uuid.UUID
) -> Optional[InventoryBalance]:
    result = await db.execute(
        select(InventoryBalance).where(
            InventoryBalance.product_id == product_id,
            InventoryBalance.location_id == location_id,
        )
    )
    return result.scalar_one_or_none()


async def reserve_stock(
    db: AsyncSession,
    product_id: uuid.UUID,
    location_id: uuid.UUID,
    quantity: int,
    reference_id: uuid.UUID,
    user_id: uuid.UUID,
) -> InventoryBalance:
    balance = await get_balance_at_location(db, product_id, location_id)
    if not balance:
        raise InsufficientStockError(product_id, quantity, 0)
    available = balance.quantity - balance.reserved_quantity
    if available < quantity:
        raise InsufficientStockError(product_id, quantity, available)
    balance.reserved_quantity += quantity
    await record_transaction(
        db,
        product_id=product_id,
        quantity=quantity,
        transaction_type=TransactionType.WAVE_PICK_BATCH,
        user_id=user_id,
        source_location_id=location_id,
        reference_id=reference_id,
    )
    return balance


async def commit_pick(
    db: AsyncSession,
    product_id: uuid.UUID,
    location_id: uuid.UUID,
    quantity: int,
    reference_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    balance = await get_balance_at_location(db, product_id, location_id)
    if not balance:
        return
    balance.quantity = max(0, balance.quantity - quantity)
    balance.reserved_quantity = max(0, balance.reserved_quantity - quantity)
    await record_transaction(
        db,
        product_id=product_id,
        quantity=quantity,
        transaction_type=TransactionType.WAVE_PICK_BATCH,
        user_id=user_id,
        source_location_id=location_id,
        reference_id=reference_id,
    )


async def receive_stock(
    db: AsyncSession,
    product_id: uuid.UUID,
    location_id: uuid.UUID,
    quantity: int,
    reference_id: uuid.UUID,
    user_id: uuid.UUID,
) -> InventoryBalance:
    balance = await get_balance_at_location(db, product_id, location_id)
    if balance:
        balance.quantity += quantity
    else:
        balance = InventoryBalance(
            id=uuid.uuid4(),
            product_id=product_id,
            location_id=location_id,
            quantity=quantity,
            reserved_quantity=0,
        )
        db.add(balance)
    await record_transaction(
        db,
        product_id=product_id,
        quantity=quantity,
        transaction_type=TransactionType.RECEIPT,
        user_id=user_id,
        target_location_id=location_id,
        reference_id=reference_id,
    )
    return balance


async def get_transactions(db: AsyncSession, skip: int = 0, limit: int = 50):
    count = await db.scalar(select(func.count()).select_from(InventoryTransaction))
    result = await db.execute(
        select(InventoryTransaction)
        .options(
            joinedload(InventoryTransaction.product),
            joinedload(InventoryTransaction.source_location),
            joinedload(InventoryTransaction.target_location),
        )
        .order_by(InventoryTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.unique().scalars().all(), count or 0


async def find_best_balance(balances: list[InventoryBalance], quantity: int) -> Optional[InventoryBalance]:
    for balance in balances:
        available = balance.quantity - balance.reserved_quantity
        if available >= quantity:
            return balance
    for balance in balances:
        if balance.quantity - balance.reserved_quantity > 0:
            return balance
    return balances[0] if balances else None


async def get_inventory_items(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None
):
    query = (
        select(InventoryBalance)
        .options(
            joinedload(InventoryBalance.product).joinedload(Product.category),
            joinedload(InventoryBalance.location),
        )
    )
    
    # Needs join for search or category filtering
    if search or category:
        query = query.join(InventoryBalance.product)
        if category:
            query = query.join(Product.category).where(Category.name == category)
        if search:
            query = query.where(
                Product.sku.ilike(f"%{search}%") | Product.name.ilike(f"%{search}%")
            )
            
    if status:
        available_expr = InventoryBalance.quantity - InventoryBalance.reserved_quantity
        if status == 'out_of_stock':
            query = query.where(available_expr <= 0)
        elif status == 'low_stock':
            query = query.where((available_expr > 0) & (available_expr <= LOW_STOCK_THRESHOLD))
        elif status == 'in_stock':
            query = query.where(available_expr > LOW_STOCK_THRESHOLD)
        
    # Get total count first
    count_query = select(func.count()).select_from(query.subquery())
    total_count = await db.scalar(count_query)
    # Handle sorting
    order_clause = [InventoryBalance.updated_at.desc(), InventoryBalance.id.asc()]
    if sort_by == 'qty_desc':
        order_clause = [InventoryBalance.quantity.desc(), InventoryBalance.id.asc()]
    elif sort_by == 'qty_asc':
        order_clause = [InventoryBalance.quantity.asc(), InventoryBalance.id.asc()]
    elif sort_by == 'sku_asc':
        order_clause = [Product.sku.asc(), InventoryBalance.id.asc()]

    # Get paginated items
    result = await db.execute(
        query.order_by(*order_clause)
        .offset(skip).limit(limit)
    )
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
