"""Tests for shift and user management."""
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.enums import ShiftEventType, UserRole, WorkerStatus
from app.models.users import Shift, ShiftEvent
from app.services import user_service
from app.services.user_service import BREAK_LIMIT_MINUTES, compute_break_summary


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


@pytest.mark.asyncio
async def test_team_members_normalize_stale_status(seeded_db, db_session):
    picker = seeded_db["picker"]
    picker.status = WorkerStatus.PICKING
    await db_session.commit()

    members = await user_service.get_team_members(db_session)
    picker_row = next(m for m in members if m.id == picker.id)
    assert picker_row.has_active_shift is False
    assert picker_row.status == WorkerStatus.OFFLINE

    refreshed = await user_service.get_user_by_id(db_session, picker.id)
    assert refreshed.status == WorkerStatus.OFFLINE


def _event(event_type: ShiftEventType, at: datetime) -> ShiftEvent:
    return ShiftEvent(id=__import__("uuid").uuid4(), shift_id=__import__("uuid").uuid4(), event_type=event_type, timestamp=at)


def test_compute_break_summary_no_breaks():
    now = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    summary = compute_break_summary([], now=now)
    assert summary.break_count == 0
    assert summary.break_minutes == 0
    assert summary.over_limit is False
    assert summary.current_break_started_at is None


def test_compute_break_summary_completed_session():
    start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    end = start + timedelta(minutes=10)
    events = [_event(ShiftEventType.BREAK_START, start), _event(ShiftEventType.BREAK_END, end)]
    summary = compute_break_summary(events, now=end)
    assert summary.break_count == 1
    assert summary.break_minutes == 10
    assert summary.over_limit is False
    assert summary.sessions[0].duration_seconds == 600


def test_compute_break_summary_active_break():
    start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    now = start + timedelta(minutes=5, seconds=30)
    events = [_event(ShiftEventType.BREAK_START, start)]
    summary = compute_break_summary(events, now=now)
    assert summary.break_count == 1
    assert summary.break_minutes == 5
    assert summary.current_break_started_at == start
    assert summary.sessions[0].ended_at is None


def test_compute_break_summary_over_limit():
    start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    end = start + timedelta(minutes=BREAK_LIMIT_MINUTES)
    events = [_event(ShiftEventType.BREAK_START, start), _event(ShiftEventType.BREAK_END, end)]
    summary = compute_break_summary(events, now=end)
    assert summary.break_minutes == BREAK_LIMIT_MINUTES
    assert summary.over_limit is True


@pytest.mark.asyncio
async def test_start_shift_sets_role_floor_status(seeded_db, db_session):
    inbound_id = seeded_db["inbound_op"].id
    await user_service.start_shift(db_session, inbound_id)
    inbound = await user_service.get_user_by_id(db_session, inbound_id)
    assert inbound.status == WorkerStatus.RECEIVING

    await user_service.start_break(db_session, inbound_id)
    await user_service.end_break(db_session, inbound_id)
    inbound_after_break = await user_service.get_user_by_id(db_session, inbound_id)
    assert inbound_after_break.status == WorkerStatus.RECEIVING


@pytest.mark.asyncio
async def test_build_shift_response_includes_break_summary(seeded_db, db_session):
    picker_id = seeded_db["picker"].id
    await user_service.start_shift(db_session, picker_id)
    await user_service.start_break(db_session, picker_id)
    shift = await _get_shift_with_events(db_session, picker_id)
    response = user_service.build_shift_response(shift)
    assert response.break_summary.break_count == 1
    assert response.break_summary.current_break_started_at is not None
