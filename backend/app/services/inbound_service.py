from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.inbound import InboundShipment, InboundItem
from app.models.enums import InboundStatus


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


async def count_pending_inbound(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(InboundShipment).where(
            InboundShipment.status == InboundStatus.PENDING
        )
    )
    return result.scalar_one()
