import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.waves import WaveCreate, WaveResponse
from app.services import wave_service

router = APIRouter(prefix="/waves", tags=["Waves"])


@router.get("", response_model=list[WaveResponse])
async def list_waves(db: AsyncSession = Depends(get_db)):
    waves = await wave_service.get_waves(db)
    return [
        WaveResponse(
            id=w.id,
            wave_number=w.wave_number,
            status=w.status,
            total_orders_count=w.total_orders_count,
            progress=0.0,
            created_at=w.created_at,
        )
        for w in waves
    ]


@router.post("", response_model=WaveResponse, status_code=201)
async def create_wave(data: WaveCreate, db: AsyncSession = Depends(get_db)):
    # TODO: get user from JWT token
    wave = await wave_service.create_wave(db, data.order_ids, uuid.uuid4())
    return WaveResponse(
        id=wave.id,
        wave_number=wave.wave_number,
        status=wave.status,
        total_orders_count=wave.total_orders_count,
        progress=0.0,
        created_at=wave.created_at,
    )


@router.get("/{wave_id}", response_model=WaveResponse)
async def get_wave(wave_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    wave = await wave_service.get_wave_by_id(db, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    return WaveResponse(
        id=wave.id,
        wave_number=wave.wave_number,
        status=wave.status,
        total_orders_count=wave.total_orders_count,
        progress=0.0,
        created_at=wave.created_at,
    )
