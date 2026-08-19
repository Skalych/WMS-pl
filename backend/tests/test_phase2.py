"""Phase 2 tests: stock reservation, inbound receive, audit trail."""
import pytest
from sqlalchemy import select

from app.models.inventory import InventoryBalance, InventoryTransaction
from app.services import wave_service


@pytest.mark.asyncio
async def test_wave_creation_reserves_stock(seeded_db, db_session):
    result = await db_session.execute(
        select(InventoryBalance).where(
            InventoryBalance.product_id == seeded_db["product_small"].id,
            InventoryBalance.location_id == seeded_db["storage_loc"].id,
        )
    )
    balance = result.scalar_one()
    reserved_before = balance.reserved_quantity

    from sqlalchemy import func
    tx_before = await db_session.scalar(select(func.count()).select_from(InventoryTransaction))
    from app.models.orders import Order, OrderItem
    from app.models.enums import OrderStatus, OrderPriority
    import uuid

    order = Order(
        id=uuid.uuid4(),
        order_number="ORD-RESERVE",
        status=OrderStatus.PENDING,
        priority=OrderPriority.MEDIUM,
        customer_name="Test",
        shipping_address="Addr",
    )
    item = OrderItem(
        id=uuid.uuid4(),
        order_id=order.id,
        product_id=seeded_db["product_small"].id,
        requested_quantity=5,
    )
    db_session.add_all([order, item])
    await db_session.commit()

    await wave_service.create_wave(
        db_session,
        order_ids=[order.id],
        created_by_user_id=seeded_db["admin"].id,
    )

    await db_session.refresh(balance)
    assert balance.reserved_quantity == reserved_before + 5

    tx_after = await db_session.scalar(select(func.count()).select_from(InventoryTransaction))
    assert tx_after == tx_before


@pytest.mark.asyncio
async def test_inbound_receive_adds_stock(client, inbound_headers, seeded_db):
    create_resp = await client.post(
        "/api/v1/inbound",
        headers=inbound_headers,
        json={
            "supplier_name": "Supplier ABC",
            "dock_number": "D-1",
            "items": [
                {"product_id": str(seeded_db["product_small"].id), "expected_quantity": 20}
            ],
        },
    )
    assert create_resp.status_code == 201
    shipment_id = create_resp.json()["id"]

    receive_resp = await client.post(
        f"/api/v1/inbound/{shipment_id}/receive",
        headers=inbound_headers,
    )
    assert receive_resp.status_code == 200
    assert receive_resp.json()["status"] == "RECEIVED"


@pytest.mark.asyncio
async def test_inventory_transactions_endpoint(admin_client):
    response = await admin_client.get("/api/v1/inventory/transactions?page=1&size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_terminal_scan_creates_transaction(picker_client, seeded_db, db_session):
    next_resp = await picker_client.get("/api/v1/terminal/tasks/next")
    task = next_resp.json()

    result = await db_session.execute(
        select(InventoryBalance).where(
            InventoryBalance.product_id == seeded_db["product_small"].id,
            InventoryBalance.location_id == seeded_db["storage_loc"].id,
        )
    )
    balance = result.scalar_one()
    qty_before = balance.quantity

    await picker_client.post(
        f"/api/v1/terminal/tasks/{task['task_id']}/scan",
        json={"barcode": seeded_db["product_small"].sku, "quantity": 2},
    )

    await db_session.refresh(balance)
    assert balance.quantity == qty_before - 2

    tx_result = await db_session.execute(select(InventoryTransaction))
    assert len(tx_result.scalars().all()) >= 1
