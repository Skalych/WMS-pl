"""Tests for packer container generation."""
import pytest


@pytest.mark.asyncio
async def test_generate_creates_issued_labels_not_containers(packer_client, db_session):
    from sqlalchemy import func, select
    from app.models.containers import Container, IssuedContainerLabel

    before_containers = await db_session.scalar(select(func.count()).select_from(Container))
    response = await packer_client.post("/api/v1/packer/containers/generate", json={"count": 3})
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 3
    assert all(row["status"] == "ISSUED" for row in body["labels"])

    after_containers = await db_session.scalar(select(func.count()).select_from(Container))
    issued_count = await db_session.scalar(select(func.count()).select_from(IssuedContainerLabel))
    assert after_containers == before_containers
    assert issued_count >= 3


@pytest.mark.asyncio
async def test_generate_requires_packer_role(picker_client):
    response = await picker_client.post("/api/v1/packer/containers/generate", json={"count": 1})
    assert response.status_code == 403
