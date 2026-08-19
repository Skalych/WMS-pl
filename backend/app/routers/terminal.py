import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.enums import UserRole
from app.models.users import User
from app.schemas.users import TokenResponse
from app.services import terminal_service

router = APIRouter(prefix="/terminal", tags=["Terminal API"])

TERMINAL_ACCESS = require_roles(
    UserRole.PICKER,
    UserRole.PACKER_DISPATCHER,
    UserRole.ADMIN_MANAGER,
)


class TerminalLogin(BaseModel):
    email: str
    pin: str = Field(..., min_length=1)


class NextTaskResponse(BaseModel):
    task_id: uuid.UUID
    task_type: str
    location_code: str
    product_sku: str
    quantity_required: int
    cart_id: Optional[str] = None


class ScanRequest(BaseModel):
    barcode: str
    quantity: int = 1


@router.post("/login", response_model=TokenResponse)
async def terminal_login(data: TerminalLogin, db: AsyncSession = Depends(get_db)):
    return await terminal_service.terminal_login(db, data.email, data.pin)


@router.get("/tasks/next", response_model=Optional[NextTaskResponse])
async def get_next_task(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    task = await terminal_service.get_next_task(db, current_user)
    if not task:
        return None
    return NextTaskResponse(**task)


@router.post("/tasks/{task_id}/scan")
async def process_scan(
    task_id: uuid.UUID,
    data: ScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await terminal_service.process_scan(db, task_id, data.barcode, data.quantity, current_user)
