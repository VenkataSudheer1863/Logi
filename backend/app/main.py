"""
Maersk WMS — FastAPI Application Entry Point
"""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.common.database import init_db
from app.common.logger import logger
from app.common.config import get_settings

# Routers
from app.services.auth.router import router as auth_router
from app.services.inventory.router import router as inventory_router
from app.services.orders.router import router as orders_router
from app.services.warehouse.router import router as warehouse_router
from app.services.inbound.router import router as inbound_router
from app.services.incidents.router import router as incidents_router
from app.services.analytics.router import router as analytics_router
from app.ai_agents.router import router as ai_router
from app.api.websocket import ws_endpoint

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚢 Maersk WMS starting up...")
    os.makedirs("logs", exist_ok=True)
    os.makedirs("data/labels", exist_ok=True)
    os.makedirs("data/uploads", exist_ok=True)
    await init_db()
    logger.info("✅ Database initialized")

    # Validate Groq config
    from app.common.config import get_settings
    s = get_settings()
    if s.groq_api_key:
        logger.info(f"🤖 Groq configured: model={s.groq_model}")
    else:
        logger.warning("⚠️  GROQ_API_KEY not set — AI agents will use rule-based fallback")

    # Start live order + inventory simulator
    from app.services.simulation.live_simulator import start_simulator, stop_simulator
    sim_task = start_simulator()

    yield

    # Shutdown
    stop_simulator()
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass
    logger.info("🛑 Maersk WMS shutting down...")


app = FastAPI(
    title="Maersk WMS — AI-Native ERP Warehouse Management System",
    description="Enterprise-grade WMS with Agentic AI, real-time operations, and supply chain intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(inventory_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(warehouse_router, prefix="/api/v1")
app.include_router(inbound_router, prefix="/api/v1")
app.include_router(incidents_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")


# WebSocket
@app.websocket("/ws/{channel}")
async def websocket_route(websocket: WebSocket, channel: str):
    await ws_endpoint(websocket, channel)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Maersk WMS", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "message": "Maersk AI-Native WMS API",
        "docs": "/docs",
        "health": "/health",
    }
