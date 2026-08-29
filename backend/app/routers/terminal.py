import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.rate_limit import enforce_login_rate_limit
from app.models.enums import UserRole
from app.models.users import User
from app.schemas.users import TokenResponse
from app.services import pick_session_service, terminal_service

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
    quantity_required: float
    cart_id: Optional[str] = None


class ScanRequest(BaseModel):
    barcode: str
    quantity: int = 1


class SessionScanRequest(BaseModel):
    barcode: str


class ConfirmQuantityRequest(BaseModel):
    quantity: float = Field(..., gt=0)


class SphereResponse(BaseModel):
    id: str
    label: str


class AvailableTaskResponse(BaseModel):
    task_id: uuid.UUID
    task_number: str
    item_count: int
    total_quantity: float


class SessionResponse(BaseModel):
    session_id: Optional[uuid.UUID] = None
    step: str
    task_id: Optional[uuid.UUID] = None
    task_number: Optional[str] = None
    location_code: str = ""
    product_sku: str = ""
    quantity_to_pick: float = 0
    quantity_remaining: float = 0
    quantity_default: float = 0
    container_barcode: Optional[str] = None
    message: Optional[str] = None


@router.post("/login", response_model=TokenResponse)
async def terminal_login(
    data: TerminalLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(enforce_login_rate_limit),
):
    return await terminal_service.terminal_login(db, data.email, data.pin)


@router.post("/shift/clock-in")
async def shift_clock_in(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.clock_shift(db, current_user, clock_in=True)


@router.post("/shift/clock-out")
async def shift_clock_out(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.clock_shift(db, current_user, clock_in=False)


@router.get("/spheres", response_model=list[SphereResponse])
async def list_spheres(
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.list_spheres()


@router.get("/tasks/available", response_model=list[AvailableTaskResponse])
async def list_available_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.list_available_tasks(db, current_user)


@router.post("/tasks/{task_id}/claim", response_model=SessionResponse)
async def claim_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.claim_task(db, current_user, task_id)


@router.get("/session/current", response_model=Optional[SessionResponse])
async def get_current_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.get_current_session(db, current_user)


@router.post("/session/advance-location", response_model=SessionResponse)
async def advance_to_location(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.advance_to_location(db, current_user)


@router.post("/session/scan", response_model=SessionResponse)
async def session_scan(
    data: SessionScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.process_session_scan(db, current_user, data.barcode)


@router.post("/session/confirm-quantity", response_model=SessionResponse)
async def confirm_quantity(
    data: ConfirmQuantityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(TERMINAL_ACCESS),
):
    return await pick_session_service.confirm_quantity(db, current_user, data.quantity)


# Legacy endpoints (backward compatibility)
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
