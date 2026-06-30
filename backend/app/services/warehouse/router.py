from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.common.database import get_db
from app.common.models import Warehouse, Zone, Bin
from app.services.warehouse.schemas import (
    WarehouseCreate, WarehouseOut, ZoneCreate, ZoneOut, BinCreate, BinOut
)

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


@router.get("/", response_model=List[WarehouseOut])
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Warehouse))
    return result.scalars().all()


@router.post("/", response_model=WarehouseOut)
async def create_warehouse(payload: WarehouseCreate, db: AsyncSession = Depends(get_db)):
    wh = Warehouse(**payload.model_dump())
    db.add(wh)
    await db.flush()
    await db.refresh(wh)
    return wh


@router.get("/{warehouse_id}", response_model=WarehouseOut)
async def get_warehouse(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return wh


@router.get("/{warehouse_id}/zones", response_model=List[ZoneOut])
async def get_zones(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Zone).where(Zone.warehouse_id == warehouse_id))
    return result.scalars().all()


@router.post("/zones", response_model=ZoneOut)
async def create_zone(payload: ZoneCreate, db: AsyncSession = Depends(get_db)):
    zone = Zone(**payload.model_dump())
    db.add(zone)
    await db.flush()
    await db.refresh(zone)
    return zone


@router.get("/zones/{zone_id}/bins", response_model=List[BinOut])
async def get_bins(zone_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bin).where(Bin.zone_id == zone_id))
    return result.scalars().all()


@router.post("/bins", response_model=BinOut)
async def create_bin(payload: BinCreate, db: AsyncSession = Depends(get_db)):
    b = Bin(**payload.model_dump())
    db.add(b)
    await db.flush()
    await db.refresh(b)
    return b
