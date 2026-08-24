"""WebSocket router for real-time alert streaming."""

import asyncio
import json
import logging
from collections import deque
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

# Connected clients
_clients: list[WebSocket] = []
# Recent alerts buffer (circular)
_alert_buffer: deque[dict] = deque(maxlen=100)


async def broadcast_alert(alert: dict) -> None:
    """Broadcast an alert to all connected WebSocket clients."""
    _alert_buffer.append(alert)
    message = json.dumps({"type": "alert", "data": alert})
    disconnected = []
    for client in _clients:
        try:
            await client.send_text(message)
        except Exception:
            disconnected.append(client)
    for client in disconnected:
        _clients.remove(client)


@router.websocket("/ws/alerts")
async def alert_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time alerts."""
    await websocket.accept()
    _clients.append(websocket)
    logger.info(f"WebSocket client connected ({len(_clients)} total)")

    try:
        # Send recent alerts buffer on connect
        if _alert_buffer:
            await websocket.send_text(json.dumps({
                "type": "initial",
                "data": list(_alert_buffer),
            }))

        # Keep connection alive, listen for client messages
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                # Client can send commands like {"action": "ping"}
                data = json.loads(msg)
                if data.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send keepalive
                await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in _clients:
            _clients.remove(websocket)
        logger.info(f"WebSocket client disconnected ({len(_clients)} total)")
