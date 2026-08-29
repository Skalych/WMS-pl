from typing import Optional

from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.enums import UserRole
from app.models.users import User
from app.services import container_service

router = APIRouter(prefix="/packer", tags=["Packer API"])

PACKER_ACCESS = require_roles(
    UserRole.PACKER_DISPATCHER,
    UserRole.ADMIN_MANAGER,
)


class GenerateContainersRequest(BaseModel):
    count: int = Field(..., ge=1, le=100)


class ContainerBarcodeResponse(BaseModel):
    barcode: str
    status: str


class GenerateContainersResponse(BaseModel):
    count: int
    from_barcode: str
    to_barcode: str
    labels: list[ContainerBarcodeResponse]


class BufferEntryResponse(BaseModel):
    buffer: Optional[str]
    container_barcode: str
    picker_name: Optional[str]
    task_number: Optional[str]


@router.post("/containers/generate", response_model=GenerateContainersResponse)
async def generate_containers(
    data: GenerateContainersRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PACKER_ACCESS),
):
    batch = await container_service.generate_label_batch(
        db, count=data.count, issued_by_user=current_user
    )
    labels = [
        ContainerBarcodeResponse(barcode=label.barcode, status=label.status.value)
        for label in batch.labels
    ]
    return GenerateContainersResponse(
        count=batch.count,
        from_barcode=batch.from_barcode,
        to_barcode=batch.to_barcode,
        labels=labels,
    )


@router.get("/buffers", response_model=list[BufferEntryResponse])
async def list_buffers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PACKER_ACCESS),
):
    rows = await container_service.list_buffers(db)
    return [BufferEntryResponse(**row) for row in rows]
