import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.schemas.orders import OrderCreate, OrderResponse, OrderStatusUpdate, MacroOrderCreate, MacroOrderResponse
from app.services import order_service
from app.models.enums import OrderStatus, UserRole
from app.models.users import User
from typing import Optional

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/macro", response_model=list[MacroOrderResponse])
async def list_macro_orders(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    macro_orders = await order_service.get_macro_orders(db)
    result = []
    for m in macro_orders:
        progress = 0
        if getattr(m, "orders", None) and len(m.orders) > 0:
            picked_or_completed = sum(1 for o in m.orders if o.status in [OrderStatus.SHIPPED, OrderStatus.PACKED, OrderStatus.SORTED])
            progress = int((picked_or_completed / len(m.orders)) * 100)
        
        result.append(MacroOrderResponse(
            id=m.id,
            reference_number=m.reference_number,
            status=m.status,
            created_at=m.created_at,
            orders_count=len(m.orders) if getattr(m, "orders", None) else 0,
            progress=progress
        ))
    return result

@router.post("/macro", response_model=MacroOrderResponse, status_code=201)
async def create_macro_order(
    data: MacroOrderCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    macro_order = await order_service.create_macro_order(db, data.size)
    return MacroOrderResponse(
        id=macro_order.id,
        reference_number=macro_order.reference_number,
        status=macro_order.status,
        created_at=macro_order.created_at,
        orders_count=getattr(macro_order, "orders_count_hint", 0),
        progress=0
    )


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    status: Optional[OrderStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    orders = await order_service.get_orders(db, status=status)
    return [
        OrderResponse(
            id=o.id,
            order_number=o.order_number,
            status=o.status,
            priority=o.priority,
            customer_name=o.customer_name,
            shipping_address=o.shipping_address,
            item_count=len(o.items) if o.items else 0,
            wave_number=o.wave_orders[0].wave.wave_number if getattr(o, "wave_orders", None) else None,
            created_at=o.created_at,
        )
        for o in orders
    ]


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    order = await order_service.create_order(
        db, data.customer_name, data.shipping_address, data.priority, data.items, data.macro_order_id
    )
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        status=order.status,
        priority=order.priority,
        customer_name=order.customer_name,
        shipping_address=order.shipping_address,
        item_count=len(order.items) if getattr(order, "items", None) else 0,
        wave_number=order.wave_orders[0].wave.wave_number if getattr(order, "wave_orders", None) else None,
        created_at=order.created_at,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = await order_service.get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        status=order.status,
        priority=order.priority,
        customer_name=order.customer_name,
        shipping_address=order.shipping_address,
        item_count=len(order.items) if getattr(order, "items", None) else 0,
        wave_number=order.wave_orders[0].wave.wave_number if getattr(order, "wave_orders", None) else None,
        created_at=order.created_at,
    )


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    order = await order_service.update_order_status(db, order_id, data.status)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        status=order.status,
        priority=order.priority,
        customer_name=order.customer_name,
        shipping_address=order.shipping_address,
        item_count=len(order.items) if getattr(order, "items", None) else 0,
        wave_number=order.wave_orders[0].wave.wave_number if getattr(order, "wave_orders", None) else None,
        created_at=order.created_at,
    )
