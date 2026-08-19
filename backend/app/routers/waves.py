import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.schemas.waves import WaveCreate, WaveResponse
from app.services import wave_service
from app.models.users import User
from app.models.enums import UserRole
from app.models.waves import Wave

def calculate_wave_progress(wave: Wave) -> float:
    total_qty = 0
    picked_qty = 0
    for task in getattr(wave, "micro_tasks", []):
        for item in getattr(task, "items", []):
            total_qty += item.quantity_to_pick
            picked_qty += item.quantity_picked
    
    if total_qty == 0:
        return 0.0
    return round((picked_qty / total_qty) * 100, 2)

router = APIRouter(prefix="/waves", tags=["Waves"])


@router.get("", response_model=list[WaveResponse])
async def list_waves(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    waves = await wave_service.get_waves(db)
    return [
        WaveResponse(
            id=w.id,
            wave_number=w.wave_number,
            status=w.status,
            total_orders_count=w.total_orders_count,
            progress=calculate_wave_progress(w),
            created_at=w.created_at,
        )
        for w in waves
    ]


@router.post("", response_model=WaveResponse, status_code=201)
async def create_wave(
    data: WaveCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    wave = await wave_service.create_wave(db, data.order_ids, current_user.id)
    return WaveResponse(
        id=wave.id,
        wave_number=wave.wave_number,
        status=wave.status,
        total_orders_count=wave.total_orders_count,
        progress=calculate_wave_progress(wave),
        created_at=wave.created_at,
    )


@router.get("/{wave_id}", response_model=WaveResponse)
async def get_wave(
    wave_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    wave = await wave_service.get_wave_by_id(db, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    return WaveResponse(
        id=wave.id,
        wave_number=wave.wave_number,
        status=wave.status,
        total_orders_count=wave.total_orders_count,
        progress=calculate_wave_progress(wave),
        created_at=wave.created_at,
    )
