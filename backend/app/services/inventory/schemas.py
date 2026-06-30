from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.common.models import InventoryStatus


class ProductCreate(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    weight: float = 0
    length: float = 0
    width: float = 0
    height: float = 0
    unit_price: float = 0
    reorder_point: int = 10
    expiry_date: Optional[datetime] = None


class ProductOut(ProductCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


class InventoryCreate(BaseModel):
    product_id: int
    warehouse_id: int
    bin_id: Optional[int] = None
    quantity: int
    status: InventoryStatus = InventoryStatus.available


class InventoryOut(BaseModel):
    id: int
    product_id: int
    warehouse_id: int
    bin_id: Optional[int]
    quantity: int
    reserved_quantity: int
    status: InventoryStatus
    last_updated: datetime
    class Config:
        from_attributes = True


class InventoryMoveRequest(BaseModel):
    product_id: int
    from_bin_id: int
    to_bin_id: int
    quantity: int


class StockAdjustment(BaseModel):
    product_id: int
    warehouse_id: int
    quantity_delta: int
    reason: str
