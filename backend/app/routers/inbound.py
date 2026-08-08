import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.inbound import InboundCreate, InboundResponse
from app.services import inbound_service

router = APIRouter(prefix="/inbound", tags=["Inbound"])


@router.get("", response_model=list[InboundResponse])
async def list_shipments(db: AsyncSession = Depends(get_db)):
    shipments = await inbound_service.get_shipments(db)
    return [
        InboundResponse(
            id=s.id,
            shipment_number=s.shipment_number,
            supplier_name=s.supplier_name,
            status=s.status,
            dock_number=s.dock_number,
            items_count=len(s.items) if s.items else 0,
            created_at=s.created_at,
        )
        for s in shipments
    ]


@router.post("", response_model=InboundResponse, status_code=201)
async def create_shipment(data: InboundCreate, db: AsyncSession = Depends(get_db)):
    # TODO: get user from JWT token
    shipment = await inbound_service.create_shipment(
        db, data.supplier_name, data.dock_number, data.items, uuid.uuid4()
    )
    return InboundResponse(
        id=shipment.id,
        shipment_number=shipment.shipment_number,
        supplier_name=shipment.supplier_name,
        status=shipment.status,
        dock_number=shipment.dock_number,
        items_count=len(shipment.items) if shipment.items else 0,
        created_at=shipment.created_at,
    )
