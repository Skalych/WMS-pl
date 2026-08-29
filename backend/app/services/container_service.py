from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.containers import Container, IssuedContainerLabel
from app.models.enums import ContainerStatus, IssuedLabelStatus
from app.models.users import User

MAX_CONTAINER_BARCODE = 99_999_999
BARCODE_WIDTH = 8


@dataclass
class GeneratedLabelBatch:
    count: int
    from_barcode: str
    to_barcode: str
    labels: list[IssuedContainerLabel]


def format_container_barcode(value: int) -> str:
    if value < 1 or value > MAX_CONTAINER_BARCODE:
        raise ValueError(f"Container barcode must be between 1 and {MAX_CONTAINER_BARCODE}")
    return str(value).zfill(BARCODE_WIDTH)


def normalize_container_barcode(raw: str) -> str:
    stripped = raw.strip()
    if not stripped.isdigit():
        raise HTTPException(status_code=400, detail="Container barcode must be numeric")
    value = int(stripped)
    return format_container_barcode(value)


async def _next_barcode_value(db: AsyncSession) -> int:
    issued_max = await db.scalar(select(func.max(IssuedContainerLabel.barcode)))
    container_max = await db.scalar(select(func.max(Container.barcode)))
    values = [int(v) for v in (issued_max, container_max) if v is not None]
    return (max(values) if values else 0) + 1


async def generate_label_batch(
    db: AsyncSession,
    *,
    count: int,
    issued_by_user: User,
) -> GeneratedLabelBatch:
    if count < 1 or count > 100:
        raise HTTPException(status_code=400, detail="count must be between 1 and 100")

    start_value = await _next_barcode_value(db)
    if start_value + count - 1 > MAX_CONTAINER_BARCODE:
        raise HTTPException(status_code=409, detail="Container barcode range exhausted")

    labels: list[IssuedContainerLabel] = []
    for offset in range(count):
        barcode = format_container_barcode(start_value + offset)
        label = IssuedContainerLabel(
            id=uuid.uuid4(),
            barcode=barcode,
            status=IssuedLabelStatus.ISSUED,
            issued_by_user_id=issued_by_user.id,
        )
        db.add(label)
        labels.append(label)

    await db.commit()
    for label in labels:
        await db.refresh(label)

    return GeneratedLabelBatch(
        count=len(labels),
        from_barcode=labels[0].barcode,
        to_barcode=labels[-1].barcode,
        labels=labels,
    )


async def get_container_by_barcode(db: AsyncSession, barcode: str) -> Container | None:
    normalized = normalize_container_barcode(barcode)
    result = await db.execute(select(Container).where(Container.barcode == normalized))
    return result.scalar_one_or_none()


async def activate_container_on_scan(
    db: AsyncSession,
    *,
    barcode: str,
    picker_user: User,
    micro_task_id: uuid.UUID,
) -> Container:
    normalized = normalize_container_barcode(barcode)

    existing = await get_container_by_barcode(db, normalized)
    if existing:
        raise HTTPException(status_code=409, detail="Container barcode already used")

    result = await db.execute(
        select(IssuedContainerLabel).where(IssuedContainerLabel.barcode == normalized)
    )
    issued = result.scalar_one_or_none()
    if not issued:
        raise HTTPException(status_code=404, detail="Unknown container label")
    if issued.status == IssuedLabelStatus.CONSUMED:
        raise HTTPException(status_code=409, detail="Container barcode already used")

    container = Container(
        id=uuid.uuid4(),
        barcode=normalized,
        status=ContainerStatus.IN_PICKING,
        micro_task_id=micro_task_id,
        picker_user_id=picker_user.id,
        created_by_user_id=issued.issued_by_user_id,
    )
    issued.status = IssuedLabelStatus.CONSUMED
    issued.consumed_at = datetime.now(timezone.utc)
    db.add(container)
    await db.flush()
    return container


async def list_buffers(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Container)
        .where(Container.status == ContainerStatus.AT_BUFFER)
        .order_by(Container.updated_at.desc())
    )
    containers = result.scalars().all()
    rows: list[dict] = []
    for container in containers:
        await db.refresh(container, ["picker_user", "micro_task"])
        rows.append(
            {
                "buffer": container.buffer_code,
                "container_barcode": container.barcode,
                "picker_name": container.picker_user.full_name if container.picker_user else None,
                "task_number": container.micro_task.task_number if container.micro_task else None,
            }
        )
    return rows
