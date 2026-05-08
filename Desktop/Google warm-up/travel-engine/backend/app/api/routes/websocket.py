from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.realtime import connect, disconnect, broadcast

router = APIRouter(tags=["realtime"])


@router.websocket("/ws/trips/{trip_id}")
async def trip_websocket(trip_id: str, websocket: WebSocket):
    await websocket.accept()
    await connect(trip_id, websocket)
    try:
        while True:
            # Client can send pings or commands; we just keep connection alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await disconnect(trip_id, websocket)
