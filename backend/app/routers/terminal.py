import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.models.users import User
from app.models.enums import WorkerStatus, TaskStatus
from app.models.waves import MicroTask, MicroTaskItem

router = APIRouter(prefix="/terminal", tags=["Terminal API"])

class TerminalLogin(BaseModel):
    pin: str # Simplified login for terminal

class NextTaskResponse(BaseModel):
    task_id: uuid.UUID
    task_type: str
    location_code: str
    product_sku: str
    quantity_required: int
    cart_id: Optional[str] = None

class ScanRequest(BaseModel):
    barcode: str # SKU or Location barcode
    quantity: int = 1

@router.post("/login")
async def terminal_login(data: TerminalLogin, db: AsyncSession = Depends(get_db)):
    # Placeholder for PIN-based login for floor workers
    return {"status": "success", "token": "dummy-token-for-now"}

@router.get("/tasks/next", response_model=Optional[NextTaskResponse])
async def get_next_task(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Returns the next micro-task assigned to this worker, or assigns them a new one from an active wave.
    """
    # 1. Check if user already has an IN_PROGRESS task
    task_query = await db.execute(
        select(MicroTask)
        .where(MicroTask.assigned_to_user_id == user_id)
        .where(MicroTask.status == TaskStatus.IN_PROGRESS)
        .limit(1)
    )
    task = task_query.scalar_one_or_none()

    if not task:
        # 2. If no active task, assign a PENDING task
        pending_query = await db.execute(
            select(MicroTask)
            .where(MicroTask.status == TaskStatus.PENDING)
            .limit(1)
        )
        task = pending_query.scalar_one_or_none()
        
        if not task:
            return None # No tasks available
            
        task.status = TaskStatus.IN_PROGRESS
        task.assigned_to_user_id = user_id
        await db.commit()

    # Load item details
    await db.refresh(task, ["items"])
    if not task.items:
        return None
        
    first_item = task.items[0]

    return NextTaskResponse(
        task_id=task.id,
        task_type=task.task_type.value,
        location_code=first_item.location_id.hex, # simplified for now, should map to actual location code
        product_sku=first_item.product_id.hex, # simplified for now
        quantity_required=first_item.quantity
    )

@router.post("/tasks/{task_id}/scan")
async def process_scan(task_id: uuid.UUID, data: ScanRequest, db: AsyncSession = Depends(get_db)):
    """
    Process a barcode scan (Location or Product) for the active task.
    """
    task = await db.get(MicroTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # In a real implementation:
    # 1. Validate barcode matches the expected location or product
    # 2. Decrement remaining quantity
    # 3. If quantity == 0, mark task as COMPLETED
    # 4. Update Worker Location & Cart Status
    
    return {"status": "accepted", "message": "Scan processed successfully"}
