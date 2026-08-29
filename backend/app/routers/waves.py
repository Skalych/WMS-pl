import uuid
from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.schemas.waves import WaveCreate, WaveResponse, WaveCreateResponse, WaveAllocationSummary
from app.services import wave_service
from app.services.wave_service import EmptyWaveError
from app.models.users import User
from app.models.enums import UserRole, TaskStatus
from app.models.waves import Wave, MicroTask
from app.schemas.waves import MicroTaskResponse

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


def calculate_micro_task_progress(task: MicroTask) -> float:
    total_qty = 0
    picked_qty = 0
    for item in getattr(task, "items", []):
        total_qty += item.quantity_to_pick
        picked_qty += item.quantity_picked
    if total_qty == 0:
        return 0.0
    return round((picked_qty / total_qty) * 100, 2)


_MICRO_TASK_STATUS_ORDER = {
    TaskStatus.IN_PROGRESS: 0,
    TaskStatus.ASSIGNED: 1,
    TaskStatus.PENDING: 2,
    TaskStatus.EXCEPTION: 3,
    TaskStatus.CANCELLED: 4,
    TaskStatus.COMPLETED: 5,
}


def _sort_micro_tasks(tasks: list[MicroTask]) -> list[MicroTask]:
    return sorted(
        tasks,
        key=lambda t: (_MICRO_TASK_STATUS_ORDER.get(t.status, 99), t.task_number),
    )


def _micro_task_response(task: MicroTask) -> MicroTaskResponse:
    user = getattr(task, "assigned_user", None)
    return MicroTaskResponse(
        id=task.id,
        task_number=task.task_number,
        status=task.status,
        progress=calculate_micro_task_progress(task),
        items_count=len(getattr(task, "items", [])),
        assigned_user_name=user.full_name if user else None,
    )


router = APIRouter(prefix="/waves", tags=["Waves"])


def _wave_response(
    wave: Wave, summary: Optional[WaveAllocationSummary] = None
) -> Union[WaveResponse, WaveCreateResponse]:
    micro_tasks_raw = getattr(wave, "micro_tasks", [])
    micro_tasks = [_micro_task_response(t) for t in _sort_micro_tasks(micro_tasks_raw)]
    base = {
        "id": wave.id,
        "wave_number": wave.wave_number,
        "status": wave.status,
        "total_orders_count": wave.total_orders_count,
        "progress": calculate_wave_progress(wave),
        "micro_tasks": micro_tasks,
        "micro_tasks_completed": sum(1 for t in micro_tasks_raw if t.status == TaskStatus.COMPLETED),
        "micro_tasks_total": len(micro_tasks_raw),
        "created_at": wave.created_at,
    }
    if summary is not None:
        return WaveCreateResponse(**base, allocation_summary=summary)
    return WaveResponse(**base)


@router.get("", response_model=list[WaveResponse])
async def list_waves(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    waves = await wave_service.get_waves(db)
    return [_wave_response(w) for w in waves]


@router.post("", response_model=WaveCreateResponse, status_code=201)
async def create_wave(
    data: WaveCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    try:
        result = await wave_service.create_wave(db, data.order_ids, current_user.id)
    except EmptyWaveError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    summary = WaveAllocationSummary(
        lines_fully_allocated=result.summary.lines_fully_allocated,
        lines_partially_allocated=result.summary.lines_partially_allocated,
        lines_skipped=result.summary.lines_skipped,
        total_units_allocated=result.summary.total_units_allocated,
    )
    return _wave_response(result.wave, summary=summary)


@router.get("/{wave_id}", response_model=WaveResponse)
async def get_wave(
    wave_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    wave = await wave_service.get_wave_by_id(db, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    return _wave_response(wave)
