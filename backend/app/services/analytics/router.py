from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime, timedelta
from app.common.database import get_db
from app.common.models import (
    Order, OrderStatus, Inventory, Incident, Label, LabelStatus,
    StockMovement, KPISnapshot
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/kpis")
async def get_kpis(warehouse_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    # Orders processed today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0)
    orders_today = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= today)
    )
    # Total active incidents
    active_incidents = await db.execute(
        select(func.count(Incident.id)).where(Incident.is_resolved == False)
    )
    # Label accuracy
    total_labels = await db.execute(select(func.count(Label.id)))
    valid_labels = await db.execute(
        select(func.count(Label.id)).where(Label.validation_status == LabelStatus.valid)
    )
    total_l = total_labels.scalar() or 1
    valid_l = valid_labels.scalar() or 0

    # Inventory utilization
    total_inv = await db.execute(select(func.sum(Inventory.quantity)))
    reserved_inv = await db.execute(select(func.sum(Inventory.reserved_quantity)))

    # Orders by status
    status_counts = await db.execute(
        select(Order.status, func.count(Order.id)).group_by(Order.status)
    )

    return {
        "orders_today": orders_today.scalar() or 0,
        "active_incidents": active_incidents.scalar() or 0,
        "label_accuracy_pct": round((valid_l / total_l) * 100, 2),
        "total_inventory_units": total_inv.scalar() or 0,
        "reserved_inventory_units": reserved_inv.scalar() or 0,
        "orders_by_status": {row[0]: row[1] for row in status_counts.all()},
    }


@router.get("/order-trends")
async def order_trends(days: int = Query(30), db: AsyncSession = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("count"),
        )
        .where(Order.created_at >= since)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    return [{"date": str(row.date), "count": row.count} for row in result.all()]


@router.get("/stock-movements")
async def stock_movements(days: int = Query(7), db: AsyncSession = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(StockMovement.timestamp).label("date"),
            StockMovement.movement_type,
            func.sum(StockMovement.quantity).label("total"),
        )
        .where(StockMovement.timestamp >= since)
        .group_by(func.date(StockMovement.timestamp), StockMovement.movement_type)
        .order_by(func.date(StockMovement.timestamp))
    )
    return [{"date": str(r.date), "type": r.movement_type, "total": r.total} for r in result.all()]


@router.get("/incident-summary")
async def incident_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Incident.type, Incident.severity, func.count(Incident.id).label("count"))
        .group_by(Incident.type, Incident.severity)
        .order_by(Incident.type)
    )
    rows = result.all()

    # Pivot: one entry per incident type with severity breakdown
    pivoted: dict = {}
    for r in rows:
        t = r.type if isinstance(r.type, str) else r.type.value
        s = r.severity if isinstance(r.severity, str) else r.severity.value
        if t not in pivoted:
            pivoted[t] = {"type": t, "total": 0, "low": 0, "medium": 0, "high": 0, "critical": 0}
        pivoted[t][s] = pivoted[t].get(s, 0) + r.count
        pivoted[t]["total"] += r.count

    return sorted(pivoted.values(), key=lambda x: -x["total"])
