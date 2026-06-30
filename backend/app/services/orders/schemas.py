from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.common.models import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float = 0


class OrderCreate(BaseModel):
    customer_id: str
    customer_name: str
    warehouse_id: Optional[int] = None
    priority: int = 3
    shipping_address: Optional[str] = None
    destination_port: Optional[str] = None
    items: List[OrderItemCreate]


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    picked_quantity: int
    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    order_number: str
    customer_id: str
    customer_name: str
    warehouse_id: Optional[int]
    status: OrderStatus
    priority: int
    shipping_address: Optional[str]
    destination_port: Optional[str]
    total_value: float
    created_at: datetime
    items: List[OrderItemOut] = []
    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
