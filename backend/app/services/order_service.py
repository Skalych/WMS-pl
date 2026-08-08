from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.orders import Order, OrderItem
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


async def create_order(db: AsyncSession, customer_name: str, shipping_address: str, priority: OrderPriority, items_data: list):
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
