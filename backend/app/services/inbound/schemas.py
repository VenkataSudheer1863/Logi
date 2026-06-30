from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.common.models import ContainerStatus, ShipmentStatus


class ContainerCreate(BaseModel):
    container_no: str
    origin_port: str
    destination_port: str
    eta: datetime
    cargo_weight: float = 0


class ContainerOut(ContainerCreate):
    id: int
    status: ContainerStatus
    actual_arrival: Optional[datetime]
    assigned_dock: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


class ContainerUpdate(BaseModel):
    status: Optional[ContainerStatus] = None
    actual_arrival: Optional[datetime] = None
    assigned_dock: Optional[str] = None


class ShipmentCreate(BaseModel):
    container_id: Optional[int] = None
    warehouse_id: int
    arrival_time: Optional[datetime] = None
    notes: Optional[str] = None


class ShipmentOut(ShipmentCreate):
    id: int
    status: ShipmentStatus
    processed_at: Optional[datetime]
    class Config:
        from_attributes = True
