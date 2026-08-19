"""Tests for shift and user management."""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.enums import ShiftEventType, UserRole, WorkerStatus
from app.models.users import Shift
from app.services import user_service


async def _get_shift_with_events(db_session, user_id):
    result = await db_session.execute(
        select(Shift)
        .options(joinedload(Shift.events))
        .where(Shift.user_id == user_id, Shift.end_time.is_(None))
        .execution_options(populate_existing=True)
    )
    return result.unique().scalar_one_or_none()


@pytest.mark.asyncio
async def test_create_and_get_user(db_session):
    user = await user_service.create_user(
        db_session,
        email="new@test.local",
        password="pass123",
        full_name="New User",
        role=UserRole.PICKER,
    )
    found = await user_service.get_user_by_email(db_session, "new@test.local")
    assert found is not None
    assert found.id == user.id
    assert found.role == UserRole.PICKER


@pytest.mark.asyncio
async def test_start_and_end_shift(seeded_db, db_session):
    picker_id = seeded_db["picker"].id

    shift = await user_service.start_shift(db_session, picker_id)
    assert shift is not None
    assert shift.end_time is None

    current = await user_service.get_current_shift(db_session, picker_id)
    assert current is not None
    assert current.id == shift.id

    picker = await user_service.get_user_by_id(db_session, picker_id)
    assert picker.status == WorkerStatus.IDLE

    ended = await user_service.end_shift(db_session, picker_id)
    assert ended is not None

    past = await user_service.get_past_shifts(db_session, picker_id)
    assert len(past) == 1
    assert past[0].end_time is not None

    current_after = await user_service.get_current_shift(db_session, picker_id)
    assert current_after is None

    picker_after = await user_service.get_user_by_id(db_session, picker_id)
    assert picker_after.status == WorkerStatus.OFFLINE


@pytest.mark.asyncio
async def test_break_flow(seeded_db, db_session):
    picker_id = seeded_db["picker"].id
    await user_service.start_shift(db_session, picker_id)

    shift = await user_service.start_break(db_session, picker_id)
    assert shift is not None

    shift_with_events = await _get_shift_with_events(db_session, picker_id)
    event_types = {e.event_type for e in shift_with_events.events}
    assert ShiftEventType.BREAK_START in event_types

    picker = await user_service.get_user_by_id(db_session, picker_id)
    assert picker.status == WorkerStatus.BREAK

    shift_after = await user_service.end_break(db_session, picker_id)
    assert shift_after is not None

    shift_with_events_after = await _get_shift_with_events(db_session, picker_id)
    event_types_after = {e.event_type for e in shift_with_events_after.events}
    assert ShiftEventType.BREAK_END in event_types_after

    picker_after = await user_service.get_user_by_id(db_session, picker_id)
    assert picker_after.status == WorkerStatus.IDLE


@pytest.mark.asyncio
async def test_count_online_users(seeded_db, db_session):
    assert await user_service.count_online_users(db_session) == 0
    await user_service.start_shift(db_session, seeded_db["picker"].id)
    assert await user_service.count_online_users(db_session) == 1
