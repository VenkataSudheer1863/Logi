from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.common.models import ZoneType


class WarehouseCreate(BaseModel):
    name: str
    location: str
    country: Optional[str] = None
    capacity: float = 0


class WarehouseOut(WarehouseCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


class ZoneCreate(BaseModel):
    warehouse_id: int
    name: str
    type: ZoneType
    capacity: float = 0


class ZoneOut(ZoneCreate):
    id: int
    class Config:
        from_attributes = True


class BinCreate(BaseModel):
    zone_id: int
    code: str
    capacity: float = 100


class BinOut(BinCreate):
    id: int
    current_load: float
    class Config:
        from_attributes = True
