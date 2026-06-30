"""
ERP-level SQLAlchemy ORM models for Maersk WMS
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    Boolean, Text, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from app.common.database import Base
import enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    worker = "worker"
    driver = "driver"

class ZoneType(str, enum.Enum):
    receiving = "receiving"
    storage = "storage"
    picking = "picking"
    dispatch = "dispatch"
    returns = "returns"

class InventoryStatus(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    damaged = "damaged"
    in_transit = "in_transit"

class OrderStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    picking = "picking"
    packed = "packed"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

class ContainerStatus(str, enum.Enum):
    in_transit = "in_transit"
    arrived = "arrived"
    unloading = "unloading"
    cleared = "cleared"

class ShipmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    arrived = "arrived"
    processing = "processing"
    completed = "completed"

class LabelStatus(str, enum.Enum):
    pending = "pending"
    valid = "valid"
    invalid = "invalid"
    reprint_required = "reprint_required"

class IncidentSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class IncidentType(str, enum.Enum):
    damage = "damage"
    theft = "theft"
    fire = "fire"
    spill = "spill"
    equipment_failure = "equipment_failure"
    safety_violation = "safety_violation"
    stock_discrepancy = "stock_discrepancy"


# ─── Master Tables ─────────────────────────────────────────────────────────────

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(SAEnum(RoleEnum), unique=True, nullable=False)
    permissions = Column(JSON, default={})
    users = relationship("User", back_populates="role")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    location = Column(String(300))
    country = Column(String(100))
    capacity = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    zones = relationship("Zone", back_populates="warehouse")
    users = relationship("User", back_populates="warehouse")
    inventory = relationship("Inventory", back_populates="warehouse")
    shipments = relationship("Shipment", back_populates="warehouse")


class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(SAEnum(ZoneType), nullable=False)
    capacity = Column(Float, default=0)
    warehouse = relationship("Warehouse", back_populates="zones")
    bins = relationship("Bin", back_populates="zone")


class Bin(Base):
    __tablename__ = "bins"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    capacity = Column(Float, default=100)
    current_load = Column(Float, default=0)
    zone = relationship("Zone", back_populates="bins")
    inventory = relationship("Inventory", back_populates="bin")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(300), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    role = relationship("Role", back_populates="users")
    warehouse = relationship("Warehouse", back_populates="users")


# ─── Inventory Tables ──────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(300), nullable=False)
    category = Column(String(100))
    description = Column(Text)
    expiry_date = Column(DateTime, nullable=True)
    weight = Column(Float, default=0)
    length = Column(Float, default=0)
    width = Column(Float, default=0)
    height = Column(Float, default=0)
    unit_price = Column(Float, default=0)
    reorder_point = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    inventory = relationship("Inventory", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    status = Column(SAEnum(InventoryStatus), default=InventoryStatus.available)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    product = relationship("Product", back_populates="inventory")
    warehouse = relationship("Warehouse", back_populates="inventory")
    bin = relationship("Bin", back_populates="inventory")


class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    from_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    to_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    movement_type = Column(String(50))  # inbound, outbound, transfer, adjustment
    reference_id = Column(String(100))
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


# ─── Logistics Tables ──────────────────────────────────────────────────────────

class Container(Base):
    __tablename__ = "containers"
    id = Column(Integer, primary_key=True, index=True)
    container_no = Column(String(50), unique=True, nullable=False, index=True)
    origin_port = Column(String(100))
    destination_port = Column(String(100))
    eta = Column(DateTime)
    actual_arrival = Column(DateTime, nullable=True)
    status = Column(SAEnum(ContainerStatus), default=ContainerStatus.in_transit)
    cargo_weight = Column(Float, default=0)
    assigned_dock = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    shipments = relationship("Shipment", back_populates="container")


class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(Integer, ForeignKey("containers.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    status = Column(SAEnum(ShipmentStatus), default=ShipmentStatus.scheduled)
    arrival_time = Column(DateTime, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    container = relationship("Container", back_populates="shipments")
    warehouse = relationship("Warehouse", back_populates="shipments")


class Truck(Base):
    __tablename__ = "trucks"
    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(50), unique=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="available")
    location = Column(String(200))
    capacity_kg = Column(Float, default=20000)
    last_updated = Column(DateTime, default=datetime.utcnow)


# ─── Orders ────────────────────────────────────────────────────────────────────

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(String(100))
    customer_name = Column(String(200))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.pending)
    priority = Column(Integer, default=3)  # 1=critical, 2=high, 3=normal, 4=low
    shipping_address = Column(Text)
    destination_port = Column(String(100))
    total_value = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    items = relationship("OrderItem", back_populates="order")
    labels = relationship("Label", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, default=0)
    picked_quantity = Column(Integer, default=0)
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


# ─── Labels ────────────────────────────────────────────────────────────────────

class Label(Base):
    __tablename__ = "labels"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    sku = Column(String(100))
    destination = Column(String(200))
    barcode = Column(String(100))
    validation_status = Column(SAEnum(LabelStatus), default=LabelStatus.pending)
    ocr_text = Column(Text, nullable=True)
    ai_reasoning = Column(Text, nullable=True)
    image_path = Column(String(300), nullable=True)
    validated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    order = relationship("Order", back_populates="labels")


# ─── Incidents ─────────────────────────────────────────────────────────────────

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(SAEnum(IncidentType), nullable=False)
    severity = Column(SAEnum(IncidentSeverity), nullable=False)
    location = Column(String(200))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    description = Column(Text)
    ai_analysis = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_resolved = Column(Boolean, default=False)


# ─── KPI Snapshots ─────────────────────────────────────────────────────────────

class KPISnapshot(Base):
    __tablename__ = "kpi_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    snapshot_date = Column(DateTime, default=datetime.utcnow)
    turnaround_time_avg = Column(Float, default=0)
    label_accuracy_pct = Column(Float, default=0)
    incident_count = Column(Integer, default=0)
    orders_processed = Column(Integer, default=0)
    inventory_utilization_pct = Column(Float, default=0)
    on_time_delivery_pct = Column(Float, default=0)
