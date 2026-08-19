"""Tests for wave batch picking logic."""
import uuid

import pytest
from sqlalchemy import select

from app.models.enums import OrderStatus, TaskType
from app.models.orders import Order
from app.models.waves import MicroTask, MicroTaskItem
from app.services import wave_service


@pytest.mark.asyncio
async def test_create_wave_assigns_orders_and_micro_tasks(seeded_db, db_session):
    data = seeded_db
    wave = await wave_service.create_wave(
        db_session,
        order_ids=[data["order"].id],
        created_by_user_id=data["admin"].id,
    )

    assert wave is not None
    assert wave.wave_number.startswith("WAVE-")
    assert len(wave.wave_orders) == 1
    assert len(wave.micro_tasks) >= 1

    order = await db_session.get(Order, data["order"].id)
    assert order.status == OrderStatus.IN_WAVE

    for task in wave.micro_tasks:
        assert task.type == TaskType.BATCH_PICK
        assert len(task.items) >= 1


@pytest.mark.asyncio
async def test_create_wave_splits_by_volume(seeded_db, db_session):
    """Large-volume items should produce multiple micro-tasks."""
    data = seeded_db
    wave = await wave_service.create_wave(
        db_session,
        order_ids=[data["order"].id],
        created_by_user_id=data["admin"].id,
    )

    # 3 × 50_000 cm³ = 150_000 > MAX_VOLUME_PER_TASK (100_000)
    result = await db_session.execute(
        select(MicroTask).where(MicroTask.wave_id == wave.id)
    )
    tasks = result.scalars().all()
    assert len(tasks) >= 2

    items_result = await db_session.execute(
        select(MicroTaskItem).join(MicroTask).where(MicroTask.wave_id == wave.id)
    )
    all_items = items_result.scalars().all()
    total_qty = sum(i.quantity_to_pick for i in all_items)
    assert total_qty == 13  # 10 small + 3 large


@pytest.mark.asyncio
async def test_count_active_waves(seeded_db, db_session):
    count_before = await wave_service.count_active_waves(db_session)
    await wave_service.create_wave(
        db_session,
        order_ids=[seeded_db["order"].id],
        created_by_user_id=seeded_db["admin"].id,
    )
    count = await wave_service.count_active_waves(db_session)
    assert count == count_before + 1
