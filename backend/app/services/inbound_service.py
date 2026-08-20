from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.inbound import InboundShipment, InboundItem
from app.models.enums import InboundStatus, LocationType
from app.models.topology import Location
from app.services import inventory_service, user_service


async def get_shipments(db: AsyncSession):
    result = await db.execute(
        select(InboundShipment)
        .options(joinedload(InboundShipment.items))
        .order_by(InboundShipment.created_at.desc())
    )
    return result.unique().scalars().all()


async def get_shipment_by_id(db: AsyncSession, shipment_id: uuid.UUID):
    result = await db.execute(
        select(InboundShipment)
        .options(joinedload(InboundShipment.items))
        .where(InboundShipment.id == shipment_id)
    )
    return result.unique().scalar_one_or_none()


async def create_shipment(db: AsyncSession, supplier_name: str, dock_number: Optional[str], items_data: list, created_by_user_id: uuid.UUID):
    count_result = await db.execute(select(func.count()).select_from(InboundShipment))
    count = count_result.scalar_one()
    shipment_number = f"INB-{datetime.now(timezone.utc).year}-{count + 1:03d}"

    shipment = InboundShipment(
        id=uuid.uuid4(),
        shipment_number=shipment_number,
        supplier_name=supplier_name,
        dock_number=dock_number,
        status=InboundStatus.PENDING,
        created_by_user_id=created_by_user_id,
    )
    db.add(shipment)
    await db.flush()

    for item_data in items_data:
        item = InboundItem(
            id=uuid.uuid4(),
            shipment_id=shipment.id,
            product_id=item_data.product_id,
            expected_quantity=item_data.expected_quantity,
            lot_number=item_data.lot_number,
            expiration_date=item_data.expiration_date,
        )
        db.add(item)

    await db.commit()
    await db.refresh(shipment)
    return await get_shipment_by_id(db, shipment.id)


async def receive_shipment(db: AsyncSession, shipment_id: uuid.UUID, user_id: uuid.UUID):
    shipment = await get_shipment_by_id(db, shipment_id)
    if not shipment:
        return None
    if shipment.status in [InboundStatus.COMPLETED, InboundStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Shipment already finalized")

    receiving_loc = await db.scalar(
        select(Location).where(Location.type == LocationType.RECEIVING).limit(1)
    )
    if not receiving_loc:
        receiving_loc = await db.scalar(select(Location).limit(1))
    if not receiving_loc:
        raise HTTPException(status_code=500, detail="No location available for receiving")

    received_total = 0
    for item in shipment.items:
        qty = item.expected_quantity - item.received_quantity
        if qty <= 0:
            continue
        await inventory_service.receive_stock(
            db,
            product_id=item.product_id,
            location_id=receiving_loc.id,
            quantity=qty,
            reference_id=shipment.id,
            user_id=user_id,
        )
        item.received_quantity += qty
        received_total += qty

    if received_total > 0:
        await user_service.increment_shift_receive(db, user_id, received_total)

    shipment.status = InboundStatus.RECEIVED
    await db.commit()
    result = await get_shipment_by_id(db, shipment.id)

    from app.services.shift_live_service import publish_shift_live_update
    await publish_shift_live_update(db)

    return result


async def count_pending_inbound(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(InboundShipment).where(
            InboundShipment.status == InboundStatus.PENDING
        )
    )
    return result.scalar_one()
