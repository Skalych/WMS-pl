import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.enums import UserRole
from app.models.users import User
from app.schemas.warehouse_shifts import (
    WarehouseShiftSummary,
    WarehouseShiftDetail,
    ShiftReportDraftOut,
    ShiftReportDraftUpdate,
    ReportExportRequest,
)
from app.services import warehouse_shift_service
from app.services.report_export_service import export_report

router = APIRouter(prefix="/warehouse-shifts", tags=["Warehouse Shifts & Reports"])


@router.get("", response_model=list[WarehouseShiftSummary])
async def list_warehouse_shifts(
    date_from: Optional[date] = Query(None, alias="from"),
    date_to: Optional[date] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    rows = await warehouse_shift_service.list_warehouse_shifts(db, date_from=date_from, date_to=date_to)
    return rows


@router.get("/{shift_id}", response_model=WarehouseShiftDetail)
async def get_warehouse_shift(
    shift_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    detail = await warehouse_shift_service.get_warehouse_shift_detail(db, shift_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Warehouse shift not found")
    return detail


@router.get("/{shift_id}/report", response_model=ShiftReportDraftOut)
async def get_report_draft(
    shift_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    draft = await warehouse_shift_service.get_or_create_report_draft(db, shift_id, user_id=current_user.id)
    if not draft:
        raise HTTPException(status_code=404, detail="Warehouse shift not found")
    return draft


@router.put("/{shift_id}/report", response_model=ShiftReportDraftOut)
async def update_report_draft(
    shift_id: uuid.UUID,
    data: ShiftReportDraftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    draft = await warehouse_shift_service.update_report_draft(
        db,
        shift_id,
        title=data.title,
        content_json=data.content_json,
        user_id=current_user.id,
    )
    if not draft:
        raise HTTPException(status_code=404, detail="Warehouse shift not found")
    return draft


@router.post("/{shift_id}/report/reset", response_model=ShiftReportDraftOut)
async def reset_report_draft(
    shift_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    draft = await warehouse_shift_service.reset_report_draft(db, shift_id, user_id=current_user.id)
    if not draft:
        raise HTTPException(status_code=404, detail="Warehouse shift not found")
    return draft


@router.post("/{shift_id}/report/export")
async def export_report_draft(
    shift_id: uuid.UUID,
    data: ReportExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    draft = await warehouse_shift_service.get_or_create_report_draft(db, shift_id, user_id=current_user.id)
    if not draft:
        raise HTTPException(status_code=404, detail="Warehouse shift not found")

    fmt = (data.format or "pdf").lower()
    if fmt not in ("pdf", "docx", "html"):
        raise HTTPException(status_code=400, detail="format must be pdf, docx, or html")

    title = data.title or draft.title
    content, media_type, filename = export_report(data.html, title, fmt)  # type: ignore[arg-type]
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
