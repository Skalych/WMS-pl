"""Shared fixtures for WMS backend tests (in-memory SQLite)."""
from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.models.catalog import Category, Product
from app.models.enums import LocationType, OrderStatus, OrderPriority, TaskStatus, TaskType, UserRole, WaveStatus, WorkerStatus
from app.models.inventory import InventoryBalance
from app.models.orders import Order, OrderItem
from app.models.topology import Location, Zone
from app.models.users import Shift, ShiftEvent, User
from app.models.inbound import InboundShipment, InboundItem
from app.models.waves import Wave, WaveOrder, MicroTask, MicroTaskItem
from app.models.sorting import SortingStation, SortingBin
from app.core.security import hash_password, create_access_token
from fastapi import FastAPI
from app.routers import auth, users, inventory, orders, waves, dashboard, terminal, inbound

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def seeded_db(db_session: AsyncSession):
    """Minimal warehouse dataset: admin, picker, products, order, locations."""
    zone = Zone(id=uuid.uuid4(), code="Z-A", name="Zone A")
    storage_loc = Location(
        id=uuid.uuid4(),
        zone_id=zone.id,
        code="A-01-01-01",
        aisle=1,
        rack=1,
        shelf=1,
        position=1,
        type=LocationType.STORAGE,
    )
    staging_loc = Location(
        id=uuid.uuid4(),
        zone_id=zone.id,
        code="STG-01",
        aisle=0,
        rack=0,
        shelf=0,
        position=1,
        type=LocationType.STAGING_SORTING,
    )
    receiving_loc = Location(
        id=uuid.uuid4(),
        zone_id=zone.id,
        code="RCV-01",
        aisle=0,
        rack=0,
        shelf=0,
        position=2,
        type=LocationType.RECEIVING,
    )
    category = Category(id=uuid.uuid4(), name="Electronics")

    product_small = Product(
        id=uuid.uuid4(),
        sku="SKU-SMALL",
        barcode="1111111111111",
        name="Small Widget",
        category_id=category.id,
        volume_cm3=500.0,
    )
    product_large = Product(
        id=uuid.uuid4(),
        sku="SKU-LARGE",
        barcode="2222222222222",
        name="Large Widget",
        category_id=category.id,
        volume_cm3=50_000.0,
    )

    admin = User(
        id=uuid.uuid4(),
        email="admin@test.local",
        password_hash=hash_password("password123"),
        full_name="Test Admin",
        role=UserRole.ADMIN_MANAGER,
        status=WorkerStatus.OFFLINE,
    )
    inbound_op = User(
        id=uuid.uuid4(),
        email="inbound@test.local",
        password_hash=hash_password("password123"),
        full_name="Test Inbound",
        role=UserRole.INBOUND_OPERATOR,
        status=WorkerStatus.OFFLINE,
    )
    picker = User(
        id=uuid.uuid4(),
        email="picker@test.local",
        password_hash=hash_password("password123"),
        full_name="Test Picker",
        role=UserRole.PICKER,
        status=WorkerStatus.OFFLINE,
    )

    order = Order(
        id=uuid.uuid4(),
        order_number="ORD-001",
        status=OrderStatus.PENDING,
        priority=OrderPriority.MEDIUM,
        customer_name="Acme Corp",
        shipping_address="123 Test St",
    )
    order_items = [
        OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_id=product_small.id,
            requested_quantity=10,
        ),
        OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_id=product_large.id,
            requested_quantity=3,
        ),
    ]

    balances = [
        InventoryBalance(
            id=uuid.uuid4(),
            product_id=product_small.id,
            location_id=storage_loc.id,
            quantity=100,
        ),
        InventoryBalance(
            id=uuid.uuid4(),
            product_id=product_large.id,
            location_id=storage_loc.id,
            quantity=50,
        ),
    ]

    wave = Wave(
        id=uuid.uuid4(),
        wave_number="WAVE-TEST-001",
        status=WaveStatus.IN_PROGRESS,
        total_orders_count=1,
        created_by_user_id=admin.id,
    )
    micro_task = MicroTask(
        id=uuid.uuid4(),
        wave_id=wave.id,
        task_number="TASK-TEST-001",
        type=TaskType.BATCH_PICK,
        status=TaskStatus.PENDING,
    )
    micro_task_item = MicroTaskItem(
        id=uuid.uuid4(),
        micro_task_id=micro_task.id,
        product_id=product_small.id,
        source_location_id=storage_loc.id,
        target_location_id=staging_loc.id,
        quantity_to_pick=5,
        quantity_picked=0,
        status=TaskStatus.PENDING,
    )

    db_session.add_all(
        [
            zone,
            storage_loc,
            staging_loc,
            receiving_loc,
            category,
            product_small,
            product_large,
            admin,
            inbound_op,
            picker,
            order,
            *order_items,
            *balances,
            wave,
            micro_task,
            micro_task_item,
        ]
    )
    await db_session.commit()

    return {
        "admin": admin,
        "inbound_op": inbound_op,
        "picker": picker,
        "order": order,
        "storage_loc": storage_loc,
        "staging_loc": staging_loc,
        "receiving_loc": receiving_loc,
        "product_small": product_small,
        "product_large": product_large,
        "wave": wave,
        "micro_task": micro_task,
        "micro_task_item": micro_task_item,
    }


@pytest.fixture
async def test_app(db_engine):
    """FastAPI app without background simulation."""
    app = FastAPI(title="WMS Test")
    api_prefix = "/api/v1"
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(users.router, prefix=api_prefix)
    app.include_router(inventory.router, prefix=api_prefix)
    app.include_router(orders.router, prefix=api_prefix)
    app.include_router(waves.router, prefix=api_prefix)
    app.include_router(dashboard.router, prefix=api_prefix)
    app.include_router(terminal.router, prefix=api_prefix)
    app.include_router(inbound.router, prefix=api_prefix)

    session_factory = async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    yield app
    app.dependency_overrides.clear()


@pytest.fixture
async def client(test_app, seeded_db) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def auth_headers_for(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(seeded_db) -> dict[str, str]:
    return auth_headers_for(seeded_db["admin"])


@pytest.fixture
def picker_headers(seeded_db) -> dict[str, str]:
    return auth_headers_for(seeded_db["picker"])


@pytest.fixture
def inbound_headers(seeded_db) -> dict[str, str]:
    return auth_headers_for(seeded_db["inbound_op"])


@pytest.fixture
async def admin_client(test_app, seeded_db) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=test_app)
    headers = auth_headers_for(seeded_db["admin"])
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        yield ac


@pytest.fixture
async def picker_client(test_app, seeded_db) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=test_app)
    headers = auth_headers_for(seeded_db["picker"])
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        yield ac
