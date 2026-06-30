from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.common.database import get_db
from app.common.models import Container, Shipment, ContainerStatus
from app.services.inbound.schemas import (
    ContainerCreate, ContainerOut, ContainerUpdate, ShipmentCreate, ShipmentOut
)

router = APIRouter(prefix="/inbound", tags=["Inbound Logistics"])


@router.get("/containers", response_model=List[ContainerOut])
async def list_containers(
    status: Optional[ContainerStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Container)
    if status:
        q = q.where(Container.status == status)
    result = await db.execute(q.order_by(Container.eta))
    return result.scalars().all()


@router.post("/containers", response_model=ContainerOut)
async def create_container(payload: ContainerCreate, db: AsyncSession = Depends(get_db)):
    container = Container(**payload.model_dump())
    db.add(container)
    await db.flush()
    await db.refresh(container)
    return container


@router.patch("/containers/{container_id}", response_model=ContainerOut)
async def update_container(container_id: int, payload: ContainerUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Container).where(Container.id == container_id))
    container = result.scalar_one_or_none()
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(container, k, v)
    await db.flush()
    await db.refresh(container)
    return container


@router.get("/shipments", response_model=List[ShipmentOut])
async def list_shipments(warehouse_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    q = select(Shipment)
    if warehouse_id:
        q = q.where(Shipment.warehouse_id == warehouse_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/shipments", response_model=ShipmentOut)
async def create_shipment(payload: ShipmentCreate, db: AsyncSession = Depends(get_db)):
    shipment = Shipment(**payload.model_dump())
    db.add(shipment)
    await db.flush()
    await db.refresh(shipment)
    return shipment
