from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.common.database import get_db
from app.common.models import Product, Inventory
from app.services.inventory import schemas, service

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/", response_model=List[schemas.InventoryOut])
async def list_inventory(
    warehouse_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    return await service.get_inventory(db, warehouse_id, skip, limit)


@router.post("/add", response_model=schemas.InventoryOut)
async def add_inventory(payload: schemas.InventoryCreate, db: AsyncSession = Depends(get_db)):
    return await service.add_inventory(db, payload)


@router.post("/move")
async def move_inventory(payload: schemas.InventoryMoveRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await service.move_inventory(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/low-stock")
async def low_stock(db: AsyncSession = Depends(get_db)):
    return await service.get_low_stock_products(db)


@router.get("/summary/{warehouse_id}")
async def inventory_summary(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_inventory_summary(db, warehouse_id)


# Products CRUD
@router.get("/products", response_model=List[schemas.ProductOut])
async def list_products(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/products", response_model=schemas.ProductOut)
async def create_product(payload: schemas.ProductCreate, db: AsyncSession = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=schemas.ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
