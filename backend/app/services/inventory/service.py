from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.common.models import Inventory, Product, Bin, StockMovement, InventoryStatus
from app.services.inventory.schemas import InventoryCreate, InventoryMoveRequest
from datetime import datetime


async def get_inventory(db: AsyncSession, warehouse_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    q = select(Inventory).options(selectinload(Inventory.product), selectinload(Inventory.bin))
    if warehouse_id:
        q = q.where(Inventory.warehouse_id == warehouse_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


async def add_inventory(db: AsyncSession, payload: InventoryCreate) -> Inventory:
    # Check if record exists
    existing = await db.execute(
        select(Inventory).where(
            Inventory.product_id == payload.product_id,
            Inventory.warehouse_id == payload.warehouse_id,
            Inventory.bin_id == payload.bin_id,
        )
    )
    inv = existing.scalar_one_or_none()
    if inv:
        inv.quantity += payload.quantity
        inv.last_updated = datetime.utcnow()
    else:
        inv = Inventory(**payload.model_dump())
        db.add(inv)
    await db.flush()
    await db.refresh(inv)
    # Log movement
    movement = StockMovement(
        product_id=payload.product_id,
        to_bin_id=payload.bin_id,
        quantity=payload.quantity,
        movement_type="inbound",
    )
    db.add(movement)
    return inv


async def move_inventory(db: AsyncSession, payload: InventoryMoveRequest) -> dict:
    # Deduct from source
    src = await db.execute(
        select(Inventory).where(
            Inventory.product_id == payload.product_id,
            Inventory.bin_id == payload.from_bin_id,
        )
    )
    src_inv = src.scalar_one_or_none()
    if not src_inv or src_inv.quantity < payload.quantity:
        raise ValueError("Insufficient stock in source bin")

    src_inv.quantity -= payload.quantity

    # Add to destination
    dst = await db.execute(
        select(Inventory).where(
            Inventory.product_id == payload.product_id,
            Inventory.bin_id == payload.to_bin_id,
        )
    )
    dst_inv = dst.scalar_one_or_none()
    if dst_inv:
        dst_inv.quantity += payload.quantity
    else:
        dst_inv = Inventory(
            product_id=payload.product_id,
            warehouse_id=src_inv.warehouse_id,
            bin_id=payload.to_bin_id,
            quantity=payload.quantity,
        )
        db.add(dst_inv)

    movement = StockMovement(
        product_id=payload.product_id,
        from_bin_id=payload.from_bin_id,
        to_bin_id=payload.to_bin_id,
        quantity=payload.quantity,
        movement_type="transfer",
    )
    db.add(movement)
    await db.flush()
    return {"status": "moved", "quantity": payload.quantity}


async def get_low_stock_products(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Inventory, Product)
        .join(Product, Inventory.product_id == Product.id)
        .where(Inventory.quantity <= Product.reorder_point)
    )
    rows = result.all()
    return [
        {"product_id": p.id, "sku": p.sku, "name": p.name, "quantity": i.quantity, "reorder_point": p.reorder_point}
        for i, p in rows
    ]


async def get_inventory_summary(db: AsyncSession, warehouse_id: int) -> dict:
    total_result = await db.execute(
        select(func.sum(Inventory.quantity)).where(Inventory.warehouse_id == warehouse_id)
    )
    reserved_result = await db.execute(
        select(func.sum(Inventory.reserved_quantity)).where(Inventory.warehouse_id == warehouse_id)
    )
    total = total_result.scalar() or 0
    reserved = reserved_result.scalar() or 0
    return {
        "total_units": total,
        "reserved_units": reserved,
        "available_units": total - reserved,
    }
