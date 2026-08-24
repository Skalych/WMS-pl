"""Tests for JWT token_version invalidation."""
import pytest

from app.core.security import create_access_token
from app.services import user_service


@pytest.mark.asyncio
async def test_token_invalid_after_password_change(client, seeded_db, db_session):
    admin = seeded_db["admin"]
    old_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': str(admin.id), 'role': admin.role.value, 'tv': admin.token_version})}"
    }

    response = await client.get("/api/v1/users/me", headers=old_headers)
    assert response.status_code == 200

    await user_service.change_password(db_session, admin.id, "newpassword456")
    await db_session.refresh(admin)

    response = await client.get("/api/v1/users/me", headers=old_headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_missing_version_rejected(client, seeded_db):
    admin = seeded_db["admin"]
    headers = {
        "Authorization": f"Bearer {create_access_token({'sub': str(admin.id), 'role': admin.role.value})}"
    }
    response = await client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401
