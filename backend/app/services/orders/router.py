from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.common.database import get_db
from app.common.models import OrderStatus
from app.services.orders import schemas, service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/create", response_model=schemas.OrderOut)
async def create_order(payload: schemas.OrderCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_order(db, payload)


@router.get("/", response_model=List[schemas.OrderOut])
async def list_orders(
    status: Optional[OrderStatus] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    return await service.list_orders(db, status, skip, limit)


@router.get("/{order_id}", response_model=schemas.OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=schemas.OrderOut)
async def update_status(order_id: int, payload: schemas.OrderStatusUpdate, db: AsyncSession = Depends(get_db)):
    order = await service.update_order_status(db, order_id, payload.status)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
