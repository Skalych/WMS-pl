"""Tests for issued label → container activation on picker scan."""
import pytest

from app.utils.location_barcode import encode_location_barcode_from_code


async def _start_pick_session(picker_client, packer_client, seeded_db):
    gen = await packer_client.post("/api/v1/packer/containers/generate", json={"count": 1})
    assert gen.status_code == 200
    barcode = gen.json()["labels"][0]["barcode"]

    task_id = (await picker_client.get("/api/v1/terminal/tasks/available")).json()[0]["task_id"]
    await picker_client.post(f"/api/v1/terminal/tasks/{task_id}/claim")
    return barcode, task_id


@pytest.mark.asyncio
async def test_full_pick_session_flow(picker_client, packer_client, seeded_db):
    barcode, _task_id = await _start_pick_session(picker_client, packer_client, seeded_db)

    scan_container = await picker_client.post(
        "/api/v1/terminal/session/scan", json={"barcode": barcode}
    )
    assert scan_container.status_code == 200
    assert scan_container.json()["step"] == "GO_TO_LOCATION"

    location_barcode = encode_location_barcode_from_code(seeded_db["storage_loc"].code)
    await picker_client.post("/api/v1/terminal/session/scan", json={"barcode": location_barcode})
    await picker_client.post(
        "/api/v1/terminal/session/scan", json={"barcode": seeded_db["product_small"].sku}
    )

    confirm = await picker_client.post(
        "/api/v1/terminal/session/confirm-quantity", json={"quantity": 5.0}
    )
    assert confirm.status_code == 200
    assert confirm.json()["step"] == "BUFFER_SCAN"

    scan_buffer = await picker_client.post(
        "/api/v1/terminal/session/scan", json={"barcode": "b-1-acc"}
    )
    assert scan_buffer.status_code == 200
    assert scan_buffer.json()["step"] == "COMPLETED"

    buffers = await packer_client.get("/api/v1/packer/buffers")
    assert any(row["container_barcode"] == barcode for row in buffers.json())


@pytest.mark.asyncio
async def test_partial_pick_stays_on_task(picker_client, packer_client, seeded_db):
    barcode, _ = await _start_pick_session(picker_client, packer_client, seeded_db)
    await picker_client.post("/api/v1/terminal/session/scan", json={"barcode": barcode})

    loc_barcode = encode_location_barcode_from_code(seeded_db["storage_loc"].code)
    await picker_client.post("/api/v1/terminal/session/scan", json={"barcode": loc_barcode})
    await picker_client.post(
        "/api/v1/terminal/session/scan", json={"barcode": seeded_db["product_small"].sku}
    )

    confirm = await picker_client.post(
        "/api/v1/terminal/session/confirm-quantity", json={"quantity": 2.0}
    )
    assert confirm.status_code == 200
    body = confirm.json()
    assert body["step"] == "GO_TO_LOCATION"
    assert body["quantity_remaining"] == 3.0


@pytest.mark.asyncio
async def test_invalid_location_scan_rejected(picker_client, packer_client, seeded_db):
    barcode, _ = await _start_pick_session(picker_client, packer_client, seeded_db)
    await picker_client.post("/api/v1/terminal/session/scan", json={"barcode": barcode})

    bad = await picker_client.post(
        "/api/v1/terminal/session/scan", json={"barcode": "99999999"}
    )
    assert bad.status_code == 400


@pytest.mark.asyncio
async def test_unknown_label_rejected(picker_client, packer_client, seeded_db):
    _, _ = await _start_pick_session(picker_client, packer_client, seeded_db)
    resp = await picker_client.post(
        "/api/v1/terminal/session/scan", json={"barcode": "00009999"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_used_label_rejected(picker_client, packer_client, seeded_db, db_session):
    from fastapi import HTTPException
    from app.services import container_service

    gen = await packer_client.post("/api/v1/packer/containers/generate", json={"count": 1})
    barcode = gen.json()["labels"][0]["barcode"]
    task_id = (await picker_client.get("/api/v1/terminal/tasks/available")).json()[0]["task_id"]
    await picker_client.post(f"/api/v1/terminal/tasks/{task_id}/claim")

    first = await picker_client.post(
        "/api/v1/terminal/session/scan", json={"barcode": barcode}
    )
    assert first.status_code == 200

    with pytest.raises(HTTPException) as exc:
        await container_service.activate_container_on_scan(
            db_session,
            barcode=barcode,
            picker_user=seeded_db["picker"],
            micro_task_id=seeded_db["micro_task"].id,
        )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_shift_clock_in_out(picker_client):
    clock_in = await picker_client.post("/api/v1/terminal/shift/clock-in")
    assert clock_in.status_code == 200
    assert clock_in.json()["event"] == "SHIFT_CLOCK_IN"

    clock_out = await picker_client.post("/api/v1/terminal/shift/clock-out")
    assert clock_out.status_code == 200
    assert clock_out.json()["event"] == "SHIFT_CLOCK_OUT"
