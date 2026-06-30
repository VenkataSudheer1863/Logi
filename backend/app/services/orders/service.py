import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
from app.common.models import Order, OrderItem, OrderStatus
from app.services.orders.schemas import OrderCreate


def _gen_order_number() -> str:
    return f"ORD-{uuid.uuid4().hex[:8].upper()}"


async def create_order(db: AsyncSession, payload: OrderCreate) -> Order:
    total = sum(i.quantity * i.unit_price for i in payload.items)
    order = Order(
        order_number=_gen_order_number(),
        customer_id=payload.customer_id,
        customer_name=payload.customer_name,
        warehouse_id=payload.warehouse_id,
        priority=payload.priority,
        shipping_address=payload.shipping_address,
        destination_port=payload.destination_port,
        total_value=total,
    )
    db.add(order)
    await db.flush()
    for item_data in payload.items:
        item = OrderItem(order_id=order.id, **item_data.model_dump())
        db.add(item)
    await db.flush()
    await db.refresh(order)
    return order


async def get_order(db: AsyncSession, order_id: int) -> Optional[Order]:
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    return result.scalar_one_or_none()


async def list_orders(db: AsyncSession, status: Optional[OrderStatus] = None, skip: int = 0, limit: int = 100):
    q = select(Order).options(selectinload(Order.items))
    if status:
        q = q.where(Order.status == status)
    q = q.order_by(Order.priority, Order.created_at).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


async def update_order_status(db: AsyncSession, order_id: int, new_status: OrderStatus) -> Optional[Order]:
    order = await get_order(db, order_id)
    if not order:
        return None
    order.status = new_status
    await db.flush()
    return order
