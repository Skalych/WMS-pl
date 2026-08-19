import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.schemas.inbound import InboundCreate, InboundResponse
from app.services import inbound_service
from app.models.enums import UserRole
from app.models.users import User

router = APIRouter(prefix="/inbound", tags=["Inbound"])


@router.get("", response_model=list[InboundResponse])
async def list_shipments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER, UserRole.INBOUND_OPERATOR)),
):
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
async def create_shipment(
    data: InboundCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER, UserRole.INBOUND_OPERATOR)),
):
    shipment = await inbound_service.create_shipment(
        db, data.supplier_name, data.dock_number, data.items, current_user.id
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
