"""
Seed script: generates realistic Maersk WMS data
- 10 warehouses, 1000 products, 50k inventory records, 10k orders, 500 containers
"""
import asyncio
import random
from datetime import datetime, timedelta
from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.database import AsyncSessionLocal, init_db
from app.common.models import (
    Role, Warehouse, Zone, Bin, User, Product, Inventory,
    Container, Shipment, Order, OrderItem, Label, Incident,
    RoleEnum, ZoneType, InventoryStatus, ContainerStatus,
    OrderStatus, LabelStatus, IncidentType, IncidentSeverity
)
from app.services.auth.service import hash_password

fake = Faker()
random.seed(42)

PORTS = ["DEHAM", "SGSIN", "CNSHA", "USLAX", "NLRTM", "GBFXT", "AEDXB", "JPYOK", "KRPUS", "BEANR"]
CATEGORIES = ["Electronics", "Automotive", "Chemicals", "Food & Beverage", "Textiles", "Machinery", "Pharmaceuticals", "Consumer Goods"]


async def seed(db: AsyncSession):
    print("🌱 Seeding Maersk WMS database...")

    # Roles
    roles = {}
    for role_name in RoleEnum:
        r = Role(role_name=role_name, permissions={})
        db.add(r)
        await db.flush()
        roles[role_name] = r
    print(f"  ✅ {len(roles)} roles created")

    # Warehouses (10)
    warehouses = []
    wh_data = [
        ("Hamburg Gateway", "Hamburg, Germany", "Germany"),
        ("Singapore Hub", "Singapore", "Singapore"),
        ("Shanghai Logistics Center", "Shanghai, China", "China"),
        ("Los Angeles Port", "Los Angeles, USA", "USA"),
        ("Rotterdam Distribution", "Rotterdam, Netherlands", "Netherlands"),
        ("Dubai Logistics Hub", "Dubai, UAE", "UAE"),
        ("Yokohama Terminal", "Yokohama, Japan", "Japan"),
        ("Busan Container Port", "Busan, South Korea", "South Korea"),
        ("Antwerp Gateway", "Antwerp, Belgium", "Belgium"),
        ("Felixstowe UK Hub", "Felixstowe, UK", "UK"),
    ]
    for name, location, country in wh_data:
        wh = Warehouse(name=name, location=location, country=country, capacity=random.uniform(50000, 200000))
        db.add(wh)
        await db.flush()
        warehouses.append(wh)
    print(f"  ✅ {len(warehouses)} warehouses created")

    # Zones & Bins per warehouse
    all_bins = []
    for wh in warehouses:
        for zone_type in ZoneType:
            zone = Zone(warehouse_id=wh.id, name=f"{zone_type.value.title()} Zone", type=zone_type, capacity=random.uniform(5000, 20000))
            db.add(zone)
            await db.flush()
            for b in range(20):
                bin_ = Bin(zone_id=zone.id, code=f"{wh.id}-{zone_type.value[:3].upper()}-{b+1:03d}", capacity=100)
                db.add(bin_)
                await db.flush()
                all_bins.append(bin_)
    print(f"  ✅ Zones and {len(all_bins)} bins created")

    # Users
    admin = User(
        name="Admin User", email="admin@maersk.com",
        hashed_password=hash_password("admin123"),
        role_id=roles[RoleEnum.admin].id, status="active"
    )
    db.add(admin)
    for _ in range(50):
        role = random.choice(list(roles.values()))
        wh = random.choice(warehouses)
        u = User(
            name=fake.name(), email=fake.unique.email(),
            hashed_password=hash_password("password123"),
            role_id=role.id, warehouse_id=wh.id, status="active"
        )
        db.add(u)
    await db.flush()
    print("  ✅ Users created (admin@maersk.com / admin123)")

    # Products (1000)
    products = []
    for i in range(1000):
        p = Product(
            sku=f"MSK-{i+1:06d}",
            name=fake.catch_phrase(),
            category=random.choice(CATEGORIES),
            weight=round(random.uniform(0.1, 500), 2),
            length=round(random.uniform(5, 200), 1),
            width=round(random.uniform(5, 200), 1),
            height=round(random.uniform(5, 200), 1),
            unit_price=round(random.uniform(10, 5000), 2),
            reorder_point=random.randint(5, 50),
        )
        db.add(p)
        products.append(p)
    await db.flush()
    print(f"  ✅ {len(products)} products created")

    # Inventory (50,000 records — batched)
    storage_bins = [b for b in all_bins if "STO" in b.code]
    batch_size = 500
    inv_count = 0
    for batch_start in range(0, 50000, batch_size):
        for _ in range(batch_size):
            product = random.choice(products)
            wh = random.choice(warehouses)
            bin_ = random.choice(storage_bins) if storage_bins else None
            inv = Inventory(
                product_id=product.id,
                warehouse_id=wh.id,
                bin_id=bin_.id if bin_ else None,
                quantity=random.randint(0, 500),
                reserved_quantity=random.randint(0, 10),
                status=random.choice(list(InventoryStatus)),
            )
            db.add(inv)
            inv_count += 1
        await db.flush()
        if batch_start % 5000 == 0:
            print(f"    ... {inv_count} inventory records")
    print(f"  ✅ {inv_count} inventory records created")

    # Containers (500)
    containers = []
    for i in range(500):
        origin = random.choice(PORTS)
        dest = random.choice([p for p in PORTS if p != origin])
        eta = datetime.utcnow() + timedelta(days=random.randint(-10, 30))
        c = Container(
            container_no=f"MSCU{random.randint(1000000, 9999999)}",
            origin_port=origin,
            destination_port=dest,
            eta=eta,
            cargo_weight=random.uniform(5000, 28000),
            status=random.choice(list(ContainerStatus)),
        )
        db.add(c)
        containers.append(c)
    await db.flush()
    print(f"  ✅ {len(containers)} containers created")

    # Shipments
    for c in random.sample(containers, 200):
        wh = random.choice(warehouses)
        s = Shipment(container_id=c.id, warehouse_id=wh.id, arrival_time=c.eta)
        db.add(s)
    await db.flush()

    # Orders (10,000 — batched)
    order_count = 0
    for batch_start in range(0, 10000, 200):
        for _ in range(200):
            wh = random.choice(warehouses)
            import uuid
            order = Order(
                order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
                customer_id=f"CUST-{random.randint(1000, 9999)}",
                customer_name=fake.company(),
                warehouse_id=wh.id,
                priority=random.randint(1, 4),
                shipping_address=fake.address(),
                destination_port=random.choice(PORTS),
                status=random.choice(list(OrderStatus)),
                total_value=round(random.uniform(100, 50000), 2),
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 90)),
            )
            db.add(order)
            await db.flush()
            # 1-5 items per order
            for _ in range(random.randint(1, 5)):
                product = random.choice(products)
                qty = random.randint(1, 50)
                item = OrderItem(order_id=order.id, product_id=product.id, quantity=qty, unit_price=product.unit_price)
                db.add(item)
                # Label for each item
                label = Label(
                    order_id=order.id, sku=product.sku,
                    destination=order.destination_port or "DEHAM",
                    validation_status=random.choice(list(LabelStatus)),
                )
                db.add(label)
            order_count += 1
        await db.flush()
        if batch_start % 2000 == 0:
            print(f"    ... {order_count} orders")
    print(f"  ✅ {order_count} orders created")

    # Incidents (100)
    for _ in range(100):
        wh = random.choice(warehouses)
        inc = Incident(
            type=random.choice(list(IncidentType)),
            severity=random.choice(list(IncidentSeverity)),
            location=f"Zone {random.randint(1, 10)}, Bin {random.randint(1, 50)}",
            warehouse_id=wh.id,
            description=fake.sentence(nb_words=15),
            detected_at=datetime.utcnow() - timedelta(hours=random.randint(0, 720)),
            is_resolved=random.choice([True, False]),
        )
        db.add(inc)
    await db.flush()
    print("  ✅ 100 incidents created")

    print("\n🎉 Seed complete! Login: admin@maersk.com / admin123")


async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed(db)
        await db.commit()


if __name__ == "__main__":
    asyncio.run(main())
