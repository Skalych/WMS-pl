from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from jose import JWTError

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.services.shift_live_service import build_shift_live_snapshot_json
from app.services.ws_manager import shift_ws_manager
from app.services import user_service

router = APIRouter(tags=["WebSocket"])


async def _validate_ws_token(token: Optional[str]) -> bool:
    if not token:
        return False
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return False
        async with AsyncSessionLocal() as db:
            user = await user_service.get_user_by_id(db, uuid.UUID(str(user_id)))
            return user is not None
    except (JWTError, ValueError):
        return False


@router.websocket("/ws/shift-live")
async def shift_live_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    if not await _validate_ws_token(token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await shift_ws_manager.connect(websocket)
    try:
        async with AsyncSessionLocal() as db:
            snapshot = await build_shift_live_snapshot_json(db)
        await websocket.send_json({"type": "shift_live", "payload": snapshot})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        await shift_ws_manager.disconnect(websocket)
