"""
WMS Nexus — Seed Script
Наповнює базу даних тестовими даними для розробки.
Запуск: ALLOW_SEED=1 python -m app.seed
"""
import asyncio
import uuid
from datetime import datetime, timezone, date, timedelta

from app.core.config import settings
from app.core.seed_guard import check_seed_allowed
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import hash_password
from app.models.enums import (
    UserRole, WorkerStatus, LocationType, OrderStatus,
    OrderPriority, WaveStatus, InboundStatus, TaskStatus, TaskType,
)
from app.models.users import User, Shift
from app.models.topology import Zone, Location
from app.models.catalog import Category, Product
from app.models.inventory import InventoryBalance
from app.models.inbound import InboundShipment, InboundItem
from app.models.orders import Order, OrderItem, MacroOrder
from app.models.waves import Wave, WaveOrder, MicroTask, MicroTaskItem
from app.models.sorting import SortingStation, SortingBin


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Zones ──────────────────────────────────────────────
        zones_data = [
            ("ZONE-A", "Zone A — Storage", "Main storage area, aisles 1-5"),
            ("ZONE-B", "Zone B — Storage", "Secondary storage area, aisles 6-10"),
            ("ZONE-RCV", "Receiving Dock", "Inbound receiving area with docks"),
            ("ZONE-STG", "Staging & Sorting", "Put-Wall sorting tables"),
            ("ZONE-SHP", "Shipping", "Outbound shipping ramps"),
        ]
        zones = {}
        for code, name, desc in zones_data:
            z = Zone(id=uuid.uuid4(), code=code, name=name, description=desc)
            db.add(z)
            zones[code] = z
        await db.flush()

        # ── Locations ──────────────────────────────────────────
        locations = {}
        # Storage locations in Zone A
        # 50 Aisles, 60 Sections (Racks), 5 Shelves
        for aisle in range(1, 51):
            for rack in range(1, 61):
                for shelf in range(1, 6):
                    code = f"{aisle:02d}-{rack:02d}-{shelf}"
                    loc = Location(
                        id=uuid.uuid4(), zone_id=zones["ZONE-A"].id,
                        code=code, aisle=aisle, rack=rack, shelf=shelf, position=1,
                        type=LocationType.STORAGE, max_weight_kg=200.0, max_volume_m3=1.5,
                    )
                    db.add(loc)
                    locations[code] = loc

        # Receiving docks
        for i in range(1, 4):
            code = f"DOCK-{i:02d}"
            loc = Location(
                id=uuid.uuid4(), zone_id=zones["ZONE-RCV"].id,
                code=code, aisle=1, rack=i, shelf=1, position=1,
                type=LocationType.RECEIVING,
            )
            db.add(loc)
            locations[code] = loc

        # Staging/Sorting
        for i in range(1, 3):
            code = f"PUT-WALL-{i:02d}"
            loc = Location(
                id=uuid.uuid4(), zone_id=zones["ZONE-STG"].id,
                code=code, aisle=1, rack=i, shelf=1, position=1,
                type=LocationType.STAGING_SORTING,
            )
            db.add(loc)
            locations[code] = loc

        # Shipping ramps
        for i in range(1, 3):
            code = f"RAMP-{i:02d}"
            loc = Location(
                id=uuid.uuid4(), zone_id=zones["ZONE-SHP"].id,
                code=code, aisle=1, rack=i, shelf=1, position=1,
                type=LocationType.SHIPPING,
            )
            db.add(loc)
            locations[code] = loc

        await db.flush()

        # ── Categories & Products ──────────────────────────────
        cats = {}
        for name in ["Apparel", "Footwear", "Accessories", "Outerwear", "Sportswear"]:
            c = Category(id=uuid.uuid4(), name=name)
            db.add(c)
            cats[name] = c
        await db.flush()

        products_data = [
            ("SKU-APP-001", "8901234567890", "Classic T-Shirt White", "Apparel", 0.2),
            ("SKU-APP-002", "8901234567891", "Slim Fit Jeans Blue", "Apparel", 0.8),
            ("SKU-APP-003", "8901234567892", "Cotton Hoodie Grey", "Apparel", 0.6),
            ("SKU-FTW-001", "8901234567893", "Running Shoes Pro", "Footwear", 0.9),
            ("SKU-FTW-002", "8901234567894", "Leather Chelsea Boots", "Footwear", 1.2),
            ("SKU-ACC-001", "8901234567895", "Canvas Belt Black", "Accessories", 0.15),
            ("SKU-ACC-002", "8901234567896", "Wool Beanie Navy", "Accessories", 0.1),
            ("SKU-ACC-003", "8901234567897", "Aviator Sunglasses", "Accessories", 0.05),
            ("SKU-OUT-001", "8901234567898", "Down Puffer Jacket", "Outerwear", 1.1),
            ("SKU-OUT-002", "8901234567899", "Waterproof Windbreaker", "Outerwear", 0.7),
            ("SKU-SPR-001", "8901234567900", "Compression Leggings", "Sportswear", 0.3),
            ("SKU-SPR-002", "8901234567901", "Mesh Training Tank", "Sportswear", 0.15),
            ("SKU-APP-004", "8901234567902", "Linen Shirt Beige", "Apparel", 0.25),
            ("SKU-FTW-003", "8901234567903", "Trail Hiking Boots", "Footwear", 1.4),
            ("SKU-ACC-004", "8901234567904", "Leather Wallet Brown", "Accessories", 0.12),
        ]
        products = {}
        for sku, barcode, name, cat_name, weight in products_data:
            volume = weight * 1500 # Just a rough estimate for seed data
            p = Product(
                id=uuid.uuid4(), sku=sku, barcode=barcode, name=name,
                category_id=cats[cat_name].id, unit="PCS", weight_kg=weight,
                volume_cm3=volume
            )
            db.add(p)
            products[sku] = p
        await db.flush()

        # ── Inventory Balances ─────────────────────────────────
        import random
        loc_codes = [c for c in locations if c[0].isdigit()]
        
        # Populate EVERY location with a random product
        for i, loc_code in enumerate(loc_codes):
            product_sku = random.choice(list(products.keys()))
            product = products[product_sku]
            
            qty = random.randint(10, 200)
            reserved = min(qty // 4, 20)
            ib = InventoryBalance(
                id=uuid.uuid4(),
                product_id=product.id,
                location_id=locations[loc_code].id,
                quantity=qty,
                reserved_quantity=reserved,
                lot_number=f"LOT-2026-{i+1:05d}",
            )
            db.add(ib)
        await db.flush()

        # ── Users ──────────────────────────────────────────────
        users_data = [
            ("admin@wms.local", "Admin Nexus", UserRole.ADMIN_MANAGER, WorkerStatus.IDLE),
            ("ivan.p@wms.local", "Іван Петренко", UserRole.PICKER, WorkerStatus.PICKING),
            ("maria.k@wms.local", "Марія Ковальчук", UserRole.PICKER, WorkerStatus.PICKING),
            ("oleg.d@wms.local", "Олег Демченко", UserRole.INBOUND_OPERATOR, WorkerStatus.PUTAWAY),
            ("anna.s@wms.local", "Анна Шевченко", UserRole.PACKER_DISPATCHER, WorkerStatus.SORTING),
            ("dmytro.b@wms.local", "Дмитро Бондаренко", UserRole.INBOUND_OPERATOR, WorkerStatus.RECEIVING),
            ("viktor.t@wms.local", "Віктор Ткаченко", UserRole.PACKER_DISPATCHER, WorkerStatus.DISPATCHING),
            ("olena.kr@wms.local", "Олена Кравчук", UserRole.PICKER, WorkerStatus.BREAK),
            ("serhiy.m@wms.local", "Сергій Мороз", UserRole.PICKER, WorkerStatus.IDLE),
            ("natalia.v@wms.local", "Наталія Власенко", UserRole.ADMIN_MANAGER, WorkerStatus.OFFLINE),
        ]
        users = {}
        for email, name, role, status in users_data:
            u = User(
                id=uuid.uuid4(), email=email, password_hash=hash_password("password123"),
                full_name=name, role=role, status=status,
            )
            db.add(u)
            users[email] = u
        await db.flush()

        # ── Macro Order ────────────────────────────────────────
        macro_order = MacroOrder(
            id=uuid.uuid4(),
            reference_number="MACRO-2026-SEED1",
            status=OrderStatus.PENDING,
        )
        db.add(macro_order)
        await db.flush()

        # ── Orders ─────────────────────────────────────────────
        orders_data = [
            ("Олександр Коваленко", "вул. Хрещатик 1, Київ", OrderPriority.HIGH, OrderStatus.IN_WAVE, [("SKU-APP-001", 3), ("SKU-FTW-001", 1)]),
            ("Ірина Мельник", "вул. Шевченка 15, Львів", OrderPriority.MEDIUM, OrderStatus.PENDING, [("SKU-ACC-001", 2), ("SKU-APP-002", 1)]),
            ("Петро Сидоренко", "вул. Соборна 7, Одеса", OrderPriority.URGENT, OrderStatus.SORTED, [("SKU-OUT-001", 1), ("SKU-ACC-002", 1), ("SKU-SPR-001", 2)]),
            ("Тетяна Бойко", "пр. Перемоги 42, Харків", OrderPriority.LOW, OrderStatus.SHIPPED, [("SKU-APP-003", 2)]),
            ("Василь Ткач", "вул. Грушевського 3, Дніпро", OrderPriority.MEDIUM, OrderStatus.PENDING, [("SKU-FTW-002", 1), ("SKU-ACC-003", 1)]),
            ("Оксана Лисенко", "вул. Франка 22, Вінниця", OrderPriority.HIGH, OrderStatus.PACKED, [("SKU-SPR-002", 3), ("SKU-APP-004", 1)]),
        ]
        orders = {}
        for i, (cust, addr, prio, status, items) in enumerate(orders_data):
            o = Order(
                id=uuid.uuid4(),
                order_number=f"ORD-2026-{i+1:04d}",
                customer_name=cust,
                shipping_address=addr,
                priority=prio,
                status=status,
                macro_order_id=macro_order.id,
            )
            db.add(o)
            orders[o.order_number] = o
            await db.flush()
            for sku, qty in items:
                oi = OrderItem(
                    id=uuid.uuid4(), order_id=o.id,
                    product_id=products[sku].id, requested_quantity=qty,
                )
                db.add(oi)
        await db.flush()

        # ── Wave ───────────────────────────────────────────────
        admin = users["admin@wms.local"]
        wave = Wave(
            id=uuid.uuid4(), wave_number="WAVE-2026-001",
            status=WaveStatus.IN_PROGRESS, total_orders_count=1,
            created_by_user_id=admin.id,
        )
        db.add(wave)
        await db.flush()

        wo = WaveOrder(id=uuid.uuid4(), wave_id=wave.id, order_id=orders["ORD-2026-0001"].id)
        db.add(wo)

        task = MicroTask(
            id=uuid.uuid4(), wave_id=wave.id,
            task_number="TASK-W1-001", type=TaskType.BATCH_PICK,
            assigned_user_id=users["ivan.p@wms.local"].id,
            status=TaskStatus.IN_PROGRESS,
            started_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        db.add(task)
        await db.flush()

        task_item = MicroTaskItem(
            id=uuid.uuid4(), micro_task_id=task.id,
            product_id=products["SKU-APP-001"].id,
            source_location_id=locations["01-01-1"].id,
            target_location_id=locations["PUT-WALL-01"].id,
            quantity_to_pick=3, quantity_picked=2,
            status=TaskStatus.IN_PROGRESS,
        )
        db.add(task_item)

        # ── Inbound Shipments ──────────────────────────────────
        inb1 = InboundShipment(
            id=uuid.uuid4(), shipment_number="INB-2026-001",
            supplier_name="Fashion Wholesale UA",
            status=InboundStatus.COMPLETED,
            dock_number="DOCK-01",
            created_by_user_id=admin.id,
        )
        db.add(inb1)
        await db.flush()
        db.add(InboundItem(
            id=uuid.uuid4(), shipment_id=inb1.id,
            product_id=products["SKU-APP-001"].id,
            expected_quantity=200, received_quantity=200,
        ))

        inb2 = InboundShipment(
            id=uuid.uuid4(), shipment_number="INB-2026-002",
            supplier_name="SportGear International",
            status=InboundStatus.IN_RECEIVING,
            dock_number="DOCK-02",
            created_by_user_id=users["dmytro.b@wms.local"].id,
        )
        db.add(inb2)
        await db.flush()
        db.add(InboundItem(
            id=uuid.uuid4(), shipment_id=inb2.id,
            product_id=products["SKU-SPR-001"].id,
            expected_quantity=150, received_quantity=45,
        ))
        db.add(InboundItem(
            id=uuid.uuid4(), shipment_id=inb2.id,
            product_id=products["SKU-FTW-003"].id,
            expected_quantity=80, received_quantity=0,
        ))

        # ── Sorting Stations ───────────────────────────────────
        for i in range(1, 3):
            station = SortingStation(
                id=uuid.uuid4(), station_code=f"PUT-WALL-{i:02d}",
                location_id=locations[f"PUT-WALL-{i:02d}"].id,
                is_active=True,
            )
            db.add(station)
            await db.flush()
            for j in range(1, 7):
                sbin = SortingBin(
                    id=uuid.uuid4(), station_id=station.id,
                    bin_code=f"BIN-{j:02d}",
                )
                db.add(sbin)

        # ── Shifts ─────────────────────────────────────────────
        for email in ["ivan.p@wms.local", "maria.k@wms.local", "anna.s@wms.local"]:
            shift = Shift(
                id=uuid.uuid4(), user_id=users[email].id,
                start_time=datetime.now(timezone.utc) - timedelta(hours=6),
                total_tasks_completed=12, total_items_picked=247,
            )
            db.add(shift)

        await db.commit()
        print("✅ Seed data inserted successfully!")
        print(f"   • {len(zones)} zones, {len(locations)} locations")
        print(f"   • {len(cats)} categories, {len(products)} products")
        print(f"   • {len(users)} users")
        print(f"   • {len(orders)} orders, 1 wave, 2 inbound shipments")


if __name__ == "__main__":
    check_seed_allowed(app_env=settings.APP_ENV, allow_seed=settings.ALLOW_SEED)
    asyncio.run(seed())
