from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.common.models import IncidentType, IncidentSeverity


class IncidentCreate(BaseModel):
    type: IncidentType
    severity: IncidentSeverity
    location: str
    warehouse_id: Optional[int] = None
    description: str


class IncidentOut(IncidentCreate):
    id: int
    ai_analysis: Optional[str]
    detected_at: datetime
    resolved_at: Optional[datetime]
    is_resolved: bool
    class Config:
        from_attributes = True


class IncidentResolve(BaseModel):
    resolved_by: int
    resolution_notes: Optional[str] = None
