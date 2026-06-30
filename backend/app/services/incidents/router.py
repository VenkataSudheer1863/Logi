from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from app.common.database import get_db
from app.common.models import Incident
from app.services.incidents.schemas import IncidentCreate, IncidentOut, IncidentResolve

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("/", response_model=List[IncidentOut])
async def list_incidents(
    warehouse_id: Optional[int] = Query(None),
    is_resolved: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Incident).order_by(Incident.detected_at.desc())
    if warehouse_id:
        q = q.where(Incident.warehouse_id == warehouse_id)
    if is_resolved is not None:
        q = q.where(Incident.is_resolved == is_resolved)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=IncidentOut)
async def report_incident(
    payload: IncidentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    incident = Incident(**payload.model_dump())
    db.add(incident)
    await db.flush()
    await db.refresh(incident)
    # Trigger AI analysis in background
    background_tasks.add_task(_analyze_incident_bg, incident.id)
    return incident


@router.patch("/{incident_id}/resolve", response_model=IncidentOut)
async def resolve_incident(incident_id: int, payload: IncidentResolve, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.is_resolved = True
    incident.resolved_at = datetime.utcnow()
    incident.resolved_by = payload.resolved_by
    await db.flush()
    await db.refresh(incident)
    return incident


async def _analyze_incident_bg(incident_id: int):
    """Background task placeholder - AI agent handles this via /ai endpoints"""
    pass
