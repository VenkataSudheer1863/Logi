"""
WebSocket manager for real-time warehouse updates
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
from app.common.logger import logger


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        logger.info(f"WS connected: channel={channel}, total={len(self.active_connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].remove(websocket)

    async def broadcast(self, channel: str, message: dict):
        if channel not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[channel]:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections[channel].remove(ws)

    async def broadcast_all(self, message: dict):
        for channel in list(self.active_connections.keys()):
            await self.broadcast(channel, message)


manager = ConnectionManager()


async def ws_endpoint(websocket: WebSocket, channel: str = "general"):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            import datetime
            msg = {}
            try:
                msg = json.loads(data)
            except Exception:
                pass
            # Respond to ping with pong (keeps connection alive through proxies)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                }))
            else:
                await websocket.send_text(json.dumps({
                    "type": "ack",
                    "channel": channel,
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                }))
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
        logger.info(f"WS disconnected: channel={channel}")
