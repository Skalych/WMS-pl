"""Tests for inventory locks, commit_pick errors, and terminal claim."""
import uuid

import pytest
from sqlalchemy import select

from app.models.enums import OrderPriority, OrderStatus, TaskStatus
from app.models.inventory import InventoryBalance
from app.models.orders import Order, OrderItem
from app.models.waves import MicroTask
from app.services import inventory_service, terminal_service, wave_service


@pytest.mark.asyncio
async def test_commit_pick_fails_without_balance(seeded_db, db_session):
    with pytest.raises(inventory_service.BalanceNotFoundError):
        await inventory_service.commit_pick(
            db_session,
            product_id=seeded_db["product_small"].id,
            location_id=uuid.uuid4(),
            quantity=1,
            reference_id=uuid.uuid4(),
            user_id=seeded_db["admin"].id,
        )


@pytest.mark.asyncio
async def test_commit_pick_fails_without_reserved(seeded_db, db_session):
    balance = await db_session.scalar(
        select(InventoryBalance).where(
            InventoryBalance.product_id == seeded_db["product_small"].id,
            InventoryBalance.location_id == seeded_db["storage_loc"].id,
        )
    )
    balance.reserved_quantity = 0
    await db_session.commit()

    with pytest.raises(inventory_service.InsufficientReservedError):
        await inventory_service.commit_pick(
            db_session,
            product_id=seeded_db["product_small"].id,
            location_id=seeded_db["storage_loc"].id,
            quantity=1,
            reference_id=uuid.uuid4(),
            user_id=seeded_db["admin"].id,
        )


@pytest.mark.asyncio
async def test_create_wave_then_terminal_claim(seeded_db, db_session):
    data = seeded_db
    await wave_service.create_wave(
        db_session,
        order_ids=[data["order"].id],
        created_by_user_id=data["admin"].id,
    )

    task_info = await terminal_service.get_next_task(db_session, data["picker"])
    assert task_info is not None
    assert task_info["task_type"] == "BATCH_PICK"

    task = await db_session.get(MicroTask, task_info["task_id"])
    assert task.status == TaskStatus.IN_PROGRESS
    assert task.assigned_user_id == data["picker"].id


@pytest.mark.asyncio
async def test_terminal_scan_after_wave_reserve(picker_client, seeded_db, db_session):
    data = seeded_db
    data["micro_task"].status = TaskStatus.COMPLETED
    await db_session.commit()

    order = Order(
        id=uuid.uuid4(),
        order_number="ORD-PICK",
        status=OrderStatus.PENDING,
        priority=OrderPriority.MEDIUM,
        customer_name="Pick Test",
        shipping_address="Addr",
    )
    item = OrderItem(
        id=uuid.uuid4(),
        order_id=order.id,
        product_id=data["product_small"].id,
        requested_quantity=3,
    )
    db_session.add_all([order, item])
    await db_session.commit()

    admin = data["admin"]
    await wave_service.create_wave(
        db_session,
        order_ids=[order.id],
        created_by_user_id=admin.id,
    )

    next_resp = await picker_client.get("/api/v1/terminal/tasks/next")
    assert next_resp.status_code == 200
    task = next_resp.json()
    assert task is not None

    balance = await db_session.scalar(
        select(InventoryBalance).where(
            InventoryBalance.product_id == data["product_small"].id,
            InventoryBalance.location_id == data["storage_loc"].id,
        )
    )
    qty_before = balance.quantity
    reserved_before = balance.reserved_quantity

    scan_resp = await picker_client.post(
        f"/api/v1/terminal/tasks/{task['task_id']}/scan",
        json={"barcode": data["product_small"].sku, "quantity": 2},
    )
    assert scan_resp.status_code == 200

    await db_session.refresh(balance)
    assert balance.quantity == qty_before - 2
    assert balance.reserved_quantity == reserved_before - 2
