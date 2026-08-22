import pytest

from app.services import simulation_service


@pytest.mark.anyio
async def test_get_simulation_status(admin_client):
    response = await admin_client.get("/api/v1/dashboard/simulation")
    assert response.status_code == 200
    assert "simulation_active" in response.json()


@pytest.mark.anyio
async def test_toggle_simulation_persists(admin_client):
    off_response = await admin_client.post(
        "/api/v1/dashboard/simulation/toggle",
        json={"active": False},
    )
    assert off_response.status_code == 200
    assert off_response.json()["simulation_active"] is False

    get_response = await admin_client.get("/api/v1/dashboard/simulation")
    assert get_response.status_code == 200
    assert get_response.json()["simulation_active"] is False
    assert simulation_service.get_simulation_state() is False

    on_response = await admin_client.post(
        "/api/v1/dashboard/simulation/toggle",
        json={"active": True},
    )
    assert on_response.status_code == 200
    assert on_response.json()["simulation_active"] is True


@pytest.mark.anyio
async def test_simulation_rejects_non_admin(picker_client):
    response = await picker_client.get("/api/v1/dashboard/simulation")
    assert response.status_code == 403
