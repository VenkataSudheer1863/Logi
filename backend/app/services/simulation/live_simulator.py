"""
Live Warehouse Simulator
Runs as a background asyncio task from app startup.

Every 30 seconds:
  1. Places 1 realistic order (random customer, 1-4 items, random warehouse)
  2. Deducts ordered quantities from inventory (outbound stock movement)
  3. Triggers an inventory replenishment top-up for any bin that drops below
     its product's reorder_point (inbound stock movement)
  4. Broadcasts a WebSocket event so the frontend updates in real-time
"""
import asyncio
import random
import uuid
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.database import AsyncSessionLocal
from app.common.logger import logger
from app.common.models import (
    Product, Inventory, Order, OrderItem, Label,
    StockMovement, Warehouse,
    OrderStatus, InventoryStatus, LabelStatus,
)

# ── constants ──────────────────────────────────────────────────────────────────
INTERVAL_SECONDS = 600
PORTS = ["DEHAM", "SGSIN", "CNSHA", "USLAX", "NLRTM", "AEDXB", "JPYOK"]
CUSTOMERS = [
    "Maersk Line Ltd", "Hapag-Lloyd AG", "MSC Geneva", "CMA CGM Group",
    "Evergreen Marine", "COSCO Shipping", "ONE Network", "Yang Ming Marine",
    "Hyundai Merchant", "PIL Pacific",
]
ADDRESSES = [
    "Port of Hamburg, Gate 7, Hamburg, Germany",
    "Jurong Port, Berth 12, Singapore",
    "Yangshan Deep-Water Port, Shanghai, China",
    "Port of Los Angeles, Terminal B, USA",
    "Rotterdam Europoort, Dock 44, Netherlands",
]

_running = False


async def _place_order_and_update_inventory(db: AsyncSession) -> dict:
    """Core simulation tick — one order + inventory update."""

    # ── 1. Pick a random warehouse ─────────────────────────────────────────────
    wh_result = await db.execute(select(Warehouse.id))
    wh_ids = [r[0] for r in wh_result.all()]
    if not wh_ids:
        return {"error": "no warehouses"}
    warehouse_id = random.choice(wh_ids)

    # ── 2. Pick 1-4 products that have stock in this warehouse ─────────────────
    inv_result = await db.execute(
        select(Inventory)
        .where(
            Inventory.warehouse_id == warehouse_id,
            Inventory.quantity > 0,
            Inventory.status == InventoryStatus.available,
        )
        .order_by(func.random())
        .limit(4)
    )
    inv_rows = inv_result.scalars().all()
    if not inv_rows:
        return {"error": "no available inventory in warehouse"}

    # ── 3. Create the order ────────────────────────────────────────────────────
    customer = random.choice(CUSTOMERS)
    dest_port = random.choice(PORTS)
    order_items_data = []
    total_value = 0.0

    for inv in inv_rows:
        qty = random.randint(1, min(10, inv.quantity))
        # Fetch unit price
        prod_result = await db.execute(select(Product).where(Product.id == inv.product_id))
        product = prod_result.scalar_one_or_none()
        if not product:
            continue
        unit_price = product.unit_price or round(random.uniform(50, 500), 2)
        order_items_data.append({
            "inventory": inv,
            "product": product,
            "quantity": qty,
            "unit_price": unit_price,
        })
        total_value += qty * unit_price

    if not order_items_data:
        return {"error": "no valid items"}

    order = Order(
        order_number=f"SIM-{uuid.uuid4().hex[:8].upper()}",
        customer_id=f"CUST-{random.randint(1000, 9999)}",
        customer_name=customer,
        warehouse_id=warehouse_id,
        priority=random.choices([1, 2, 3, 4], weights=[5, 15, 60, 20])[0],
        shipping_address=random.choice(ADDRESSES),
        destination_port=dest_port,
        status=OrderStatus.pending,
        total_value=round(total_value, 2),
        created_at=datetime.utcnow(),
    )
    db.add(order)
    await db.flush()  # get order.id

    # ── 4. Create order items + deduct inventory ───────────────────────────────
    replenished = []
    for item_data in order_items_data:
        inv = item_data["inventory"]
        product = item_data["product"]
        qty = item_data["quantity"]

        # Order item
        oi = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=qty,
            unit_price=item_data["unit_price"],
        )
        db.add(oi)

        # Label
        label = Label(
            order_id=order.id,
            sku=product.sku,
            destination=dest_port,
            validation_status=LabelStatus.valid,
        )
        db.add(label)

        # Deduct from inventory (outbound)
        inv.quantity = max(0, inv.quantity - qty)
        inv.last_updated = datetime.utcnow()

        # Outbound stock movement
        db.add(StockMovement(
            product_id=product.id,
            from_bin_id=inv.bin_id,
            quantity=qty,
            movement_type="outbound",
            reference_id=order.order_number,
            timestamp=datetime.utcnow(),
        ))

        # ── 5. Replenishment: if stock drops below reorder_point, top up ───────
        if inv.quantity <= product.reorder_point:
            replen_qty = product.reorder_point * 3 + random.randint(20, 80)
            inv.quantity += replen_qty
            inv.last_updated = datetime.utcnow()

            db.add(StockMovement(
                product_id=product.id,
                to_bin_id=inv.bin_id,
                quantity=replen_qty,
                movement_type="inbound",
                reference_id=f"REPLEN-{order.order_number}",
                timestamp=datetime.utcnow(),
            ))
            replenished.append({"sku": product.sku, "qty": replen_qty})

    await db.commit()

    return {
        "order_number": order.order_number,
        "customer": customer,
        "warehouse_id": warehouse_id,
        "items": len(order_items_data),
        "total_value": round(total_value, 2),
        "replenishments": replenished,
    }


async def simulation_loop():
    """Infinite loop — runs every INTERVAL_SECONDS."""
    global _running
    _running = True
    logger.info(f"🔄 Live simulator started — placing 1 order every {INTERVAL_SECONDS}s")

    # Small initial delay so DB is fully ready
    await asyncio.sleep(5)

    while _running:
        try:
            async with AsyncSessionLocal() as db:
                result = await _place_order_and_update_inventory(db)

            if "error" not in result:
                logger.info(
                    f"🛒 SIM order {result['order_number']} | "
                    f"{result['items']} items | "
                    f"${result['total_value']:,.2f} | "
                    f"WH-{result['warehouse_id']} | "
                    f"replenished: {len(result['replenishments'])} SKUs"
                )
                # Broadcast to WebSocket clients
                from app.api.websocket import manager
                await manager.broadcast("general", {
                    "type": "new_order",
                    "message": f"New order {result['order_number']} placed — {result['items']} items, ${result['total_value']:,.2f}",
                    "data": result,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            else:
                logger.debug(f"SIM tick skipped: {result['error']}")

        except Exception as e:
            logger.error(f"Simulation tick error: {e}")

        await asyncio.sleep(INTERVAL_SECONDS)


def start_simulator() -> asyncio.Task:
    """Schedule the simulation loop as a background task."""
    return asyncio.create_task(simulation_loop())


def stop_simulator():
    global _running
    _running = False
    logger.info("🛑 Live simulator stopped")
