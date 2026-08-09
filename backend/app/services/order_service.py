from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.orders import Order, OrderItem, MacroOrder
from app.models.waves import WaveOrder, Wave
from app.models.enums import OrderStatus, OrderPriority


async def get_orders(db: AsyncSession, status: Optional[OrderStatus] = None):
    query = select(Order).options(joinedload(Order.items), joinedload(Order.wave_orders).joinedload(WaveOrder.wave))
    if status:
        query = query.where(Order.status == status)
    result = await db.execute(query.order_by(Order.created_at.desc()))
    return result.unique().scalars().all()


async def get_order_by_id(db: AsyncSession, order_id: uuid.UUID):
    result = await db.execute(
        select(Order).options(joinedload(Order.items), joinedload(Order.wave_orders).joinedload(WaveOrder.wave)).where(Order.id == order_id)
    )
    return result.unique().scalar_one_or_none()


async def create_order(db: AsyncSession, customer_name: str, shipping_address: str, priority: OrderPriority, items_data: list, macro_order_id: Optional[uuid.UUID] = None):
    count_result = await db.execute(select(func.count()).select_from(Order))
    count = count_result.scalar_one()
    order_number = f"ORD-{datetime.now(timezone.utc).year}-{count + 1:04d}"

    order = Order(
        id=uuid.uuid4(),
        order_number=order_number,
        customer_name=customer_name,
        shipping_address=shipping_address,
        priority=priority,
        status=OrderStatus.PENDING,
        macro_order_id=macro_order_id,
    )
    db.add(order)
    await db.flush()

    for item_data in items_data:
        item = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_id=item_data.product_id,
            requested_quantity=item_data.quantity,
        )
        db.add(item)

    await db.commit()
    await db.refresh(order)
    return await get_order_by_id(db, order.id)


async def update_order_status(db: AsyncSession, order_id: uuid.UUID, status: OrderStatus):
    order = await get_order_by_id(db, order_id)
    if not order:
        return None
    order.status = status
    await db.commit()
    await db.refresh(order)
    return order


async def count_active_orders(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(Order).where(
            Order.status.not_in([OrderStatus.SHIPPED, OrderStatus.CANCELLED])
        )
    )
    return result.scalar_one()


async def count_shipped_today(db: AsyncSession) -> int:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count()).select_from(Order).where(
            Order.status == OrderStatus.SHIPPED,
            Order.updated_at >= today_start,
        )
    )
    return result.scalar_one()

import random
from app.models.catalog import Product

async def create_macro_order(db: AsyncSession, size: str):
    # Determine scale
    if size == "small":
        num_orders = 5
        min_items, max_items = 1, 3
    elif size == "medium":
        num_orders = 20
        min_items, max_items = 2, 5
    else:  # large
        num_orders = 50
        min_items, max_items = 5, 10

    # Get some products
    products = await db.execute(select(Product))
    products = products.scalars().all()
    if not products:
        raise ValueError("No products found in DB to generate an order.")

    count_result = await db.execute(select(func.count()).select_from(MacroOrder))
    count = count_result.scalar_one()
    macro_number = f"MACRO-{datetime.now(timezone.utc).year}-{count + 1:04d}"

    macro_order = MacroOrder(
        id=uuid.uuid4(),
        reference_number=macro_number,
        status=OrderStatus.PENDING,
    )
    db.add(macro_order)
    await db.flush()

    customers = ["Amazon", "Rozetka", "NovaPoshta", "Silpo", "ATB", "Epicentr", "Allo", "Comfy"]

    for _ in range(num_orders):
        customer = f"{random.choice(customers)} Store #{random.randint(1, 999)}"
        items_count = random.randint(min_items, max_items)
        
        class TempItem:
            pass
            
        items_data = []
        sampled_products = random.sample(products, min(items_count, len(products)))
        for p in sampled_products:
            item = TempItem()
            item.product_id = p.id
            item.quantity = random.randint(1, 20)
            items_data.append(item)
            
        await create_order(
            db=db, 
            customer_name=customer, 
            shipping_address=f"Store {customer}", 
            priority=random.choice(list(OrderPriority)), 
            items_data=items_data,
            macro_order_id=macro_order.id
        )

    await db.commit()
    await db.refresh(macro_order)
    macro_order.orders_count_hint = num_orders
    return macro_order

async def get_macro_orders(db: AsyncSession):
    result = await db.execute(
        select(MacroOrder)
        .options(joinedload(MacroOrder.orders))
        .order_by(MacroOrder.created_at.desc())
    )
    return result.unique().scalars().all()
