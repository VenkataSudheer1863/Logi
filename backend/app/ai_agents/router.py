"""
AI Agent API Router — exposes all agent endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from app.common.database import get_db
from app.common.models import Label, LabelStatus, Incident
from app.ai_agents import (
    label_validation_agent,
    inbound_orchestrator_agent,
    inventory_optimization_agent,
    incident_detection_agent,
    disruption_agent,
)
from datetime import datetime

router = APIRouter(prefix="/ai", tags=["AI Agents"])


# ─── Label Validation ─────────────────────────────────────────────────────────

class LabelValidateRequest(BaseModel):
    order_id: int
    sku: str
    destination: str
    simulate_ocr_text: Optional[str] = None  # for testing without real image


@router.post("/label-validate")
async def validate_label(
    payload: LabelValidateRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await label_validation_agent.validate_label(
        order_id=payload.order_id,
        order_sku=payload.sku,
        order_destination=payload.destination,
    )
    # Persist result to DB
    label_result = await db.execute(
        select(Label).where(Label.order_id == payload.order_id, Label.sku == payload.sku)
    )
    label = label_result.scalar_one_or_none()
    if label:
        label.validation_status = LabelStatus.valid if result["validation_result"] == "valid" else LabelStatus.invalid
        label.ai_reasoning = result["reasoning"]
        label.ocr_text = result["ocr_text"]
        label.validated_at = datetime.utcnow()
    return result


@router.post("/label-validate/upload")
async def validate_label_image(
    order_id: int = Form(...),
    sku: str = Form(...),
    destination: str = Form(...),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await image.read()
    result = await label_validation_agent.validate_label(
        order_id=order_id,
        order_sku=sku,
        order_destination=destination,
        image_bytes=image_bytes,
    )
    return result


# ─── Inbound Planning ─────────────────────────────────────────────────────────

class InboundPlanRequest(BaseModel):
    container_no: str
    origin_port: str
    destination_port: str
    eta: str
    cargo_weight: float
    available_docks: List[str] = ["DOCK-A", "DOCK-B", "DOCK-C"]
    available_trucks: int = 5
    warehouse_capacity_pct: float = 70.0


@router.post("/inbound-plan")
async def inbound_plan(payload: InboundPlanRequest):
    return await inbound_orchestrator_agent.plan_inbound(
        container_no=payload.container_no,
        origin_port=payload.origin_port,
        destination_port=payload.destination_port,
        eta=payload.eta,
        cargo_weight=payload.cargo_weight,
        available_docks=payload.available_docks,
        available_trucks=payload.available_trucks,
        warehouse_capacity_pct=payload.warehouse_capacity_pct,
    )


# ─── Inventory Optimization ───────────────────────────────────────────────────

class OptimizeSlottingRequest(BaseModel):
    warehouse_id: int


@router.post("/optimize-slotting")
async def optimize_slotting(payload: OptimizeSlottingRequest, db: AsyncSession = Depends(get_db)):
    from app.services.inventory.service import get_low_stock_products
    low_stock = await get_low_stock_products(db)

    # Mock high velocity items (in production: query stock_movements)
    high_velocity = [
        {"sku": f"SKU-{i:04d}", "movement_count": 100 - i * 5}
        for i in range(10)
    ]

    return await inventory_optimization_agent.optimize_inventory(
        warehouse_id=payload.warehouse_id,
        low_stock_items=low_stock,
        high_velocity_items=high_velocity,
        bin_utilization=[],
    )


# ─── Incident Analysis ────────────────────────────────────────────────────────

class IncidentAnalysisRequest(BaseModel):
    incident_id: int


@router.post("/analyze-incident")
async def analyze_incident(payload: IncidentAnalysisRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == payload.incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    analysis = await incident_detection_agent.analyze_incident(
        incident_id=incident.id,
        incident_type=incident.type,
        severity=incident.severity,
        location=incident.location,
        description=incident.description or "",
        warehouse_id=incident.warehouse_id,
    )

    # Persist AI analysis
    incident.ai_analysis = analysis["ai_analysis"]
    await db.flush()

    return analysis


# ─── Disruption Management ────────────────────────────────────────────────────

class DisruptionRequest(BaseModel):
    disruption_type: str
    affected_port: str
    affected_containers: List[str]
    severity_score: float
    estimated_delay_hours: float


@router.post("/disruption-analysis")
async def disruption_analysis(payload: DisruptionRequest):
    return await disruption_agent.handle_disruption(
        disruption_type=payload.disruption_type,
        affected_port=payload.affected_port,
        affected_containers=payload.affected_containers,
        severity_score=payload.severity_score,
        estimated_delay_hours=payload.estimated_delay_hours,
    )


# ─── General AI Chat (Warehouse Assistant) ────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


@router.post("/chat")
async def warehouse_chat(payload: ChatRequest):
    from app.ai_agents.llm_client import get_llm
    from langchain_core.messages import HumanMessage, SystemMessage
    llm = get_llm()

    system = """You are an expert AI assistant for Maersk's Warehouse Management System (LogiFlow WMS).
You help warehouse managers, workers, and logistics coordinators with inventory decisions, order processing, incident response, supply chain optimisation, and operational best practices.

RESPONSE FORMAT RULES — always follow these:
- Use **bold** for key terms, numbers, and action items
- Use numbered lists (1. 2. 3.) for sequential steps or ranked items
- Use bullet points (- ) for non-sequential lists
- Use ### headings to separate major sections when the answer has multiple parts
- Keep paragraphs short (2-3 sentences max)
- Lead with the most important point first
- End with a clear "**Bottom line:**" summary if the answer is complex
- Never write walls of text — structure everything visually"""

    messages = [SystemMessage(content=system)]
    if payload.context:
        messages.append(HumanMessage(content=f"Context: {payload.context}"))
    messages.append(HumanMessage(content=payload.message))

    try:
        response = llm.invoke(messages)
        content = (response.content or "").strip()
        if not content:
            raise ValueError("Empty response from LLM")
        return {"response": content}
    except Exception as e:
        logger.error(f"Chat LLM error: {e}")
        return {
            "response": (
                "I'm currently running in offline mode — the Groq API could not be reached. "
                "Please verify that GROQ_API_KEY is set correctly in your .env file. "
                "All other WMS features (inventory, orders, incidents, analytics) are fully operational."
            )
        }
