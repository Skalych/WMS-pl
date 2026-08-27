"""Tests for wave batch picking logic."""
import uuid

import pytest
from sqlalchemy import select

from app.models.enums import OrderStatus, TaskStatus, TaskType
from app.models.inventory import InventoryBalance
from app.models.orders import Order, OrderItem
from app.models.waves import MicroTask, MicroTaskItem
from app.services import wave_service
from app.services.wave_service import EmptyWaveError


@pytest.mark.asyncio
async def test_create_wave_assigns_orders_and_micro_tasks(seeded_db, db_session):
    data = seeded_db
    result = await wave_service.create_wave(
        db_session,
        order_ids=[data["order"].id],
        created_by_user_id=data["admin"].id,
    )
    wave = result.wave

    assert wave is not None
    assert wave.wave_number.startswith("WAVE-")
    assert len(wave.wave_orders) == 1
    assert len(wave.micro_tasks) >= 1
    assert result.summary.total_units_allocated == 13

    order = await db_session.get(Order, data["order"].id)
    assert order.status == OrderStatus.IN_WAVE

    for task in wave.micro_tasks:
        assert task.type == TaskType.BATCH_PICK
        assert task.status == TaskStatus.PENDING
        assert len(task.items) >= 1


@pytest.mark.asyncio
async def test_create_wave_splits_by_volume(seeded_db, db_session):
    """Large-volume items should produce multiple micro-tasks."""
    data = seeded_db
    result = await wave_service.create_wave(
        db_session,
        order_ids=[data["order"].id],
        created_by_user_id=data["admin"].id,
    )
    wave = result.wave

    result_tasks = await db_session.execute(
        select(MicroTask).where(MicroTask.wave_id == wave.id)
    )
    tasks = result_tasks.scalars().all()
    assert len(tasks) >= 2

    items_result = await db_session.execute(
        select(MicroTaskItem).join(MicroTask).where(MicroTask.wave_id == wave.id)
    )
    all_items = items_result.scalars().all()
    total_qty = sum(i.quantity_to_pick for i in all_items)
    assert total_qty == 13


@pytest.mark.asyncio
async def test_count_active_waves(seeded_db, db_session):
    count_before = await wave_service.count_active_waves(db_session)
    await wave_service.create_wave(
        db_session,
        order_ids=[seeded_db["order"].id],
        created_by_user_id=seeded_db["admin"].id,
    )
    count = await wave_service.count_active_waves(db_session)
    assert count == count_before + 1


@pytest.mark.asyncio
async def test_partial_wave_and_second_wave(seeded_db, db_session):
    data = seeded_db
    order = data["order"]

    balance = await db_session.scalar(
        select(InventoryBalance).where(
            InventoryBalance.product_id == data["product_large"].id,
            InventoryBalance.location_id == data["storage_loc"].id,
        )
    )
    balance.quantity = 1
    balance.reserved_quantity = 0
    await db_session.commit()

    result = await wave_service.create_wave(
        db_session,
        order_ids=[order.id],
        created_by_user_id=data["admin"].id,
    )
    wave = result.wave

    await db_session.refresh(order)
    assert order.status == OrderStatus.PARTIALLY_IN_WAVE
    assert result.summary.lines_partially_allocated >= 1
    assert result.summary.total_units_allocated == 11  # 10 small + 1 large

    items_result = await db_session.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    order_items = items_result.scalars().all()
    large_item = next(i for i in order_items if i.product_id == data["product_large"].id)
    assert large_item.allocated_quantity == 1
    assert large_item.requested_quantity == 3

    balance.quantity = 50
    await db_session.commit()

    result2 = await wave_service.create_wave(
        db_session,
        order_ids=[order.id],
        created_by_user_id=data["admin"].id,
    )
    await db_session.refresh(order)
    assert order.status == OrderStatus.IN_WAVE

    items_result2 = await db_session.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    large_item = next(
        i for i in items_result2.scalars().all() if i.product_id == data["product_large"].id
    )
    assert large_item.allocated_quantity == 3
    assert result2.summary.total_units_allocated == 2


@pytest.mark.asyncio
async def test_empty_wave_rejected(seeded_db, db_session):
    data = seeded_db
    order = Order(
        id=uuid.uuid4(),
        order_number="ORD-EMPTY",
        status=OrderStatus.PENDING,
        priority=data["order"].priority,
        customer_name="Empty",
        shipping_address="Nowhere",
    )
    item = OrderItem(
        id=uuid.uuid4(),
        order_id=order.id,
        product_id=data["product_small"].id,
        requested_quantity=5,
    )
    db_session.add_all([order, item])
    await db_session.commit()

    balance = await db_session.scalar(
        select(InventoryBalance).where(
            InventoryBalance.product_id == data["product_small"].id,
            InventoryBalance.location_id == data["storage_loc"].id,
        )
    )
    balance.quantity = 0
    balance.reserved_quantity = 0
    await db_session.commit()

    with pytest.raises(EmptyWaveError):
        await wave_service.create_wave(
            db_session,
            order_ids=[order.id],
            created_by_user_id=data["admin"].id,
        )
