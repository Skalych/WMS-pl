"""Shared fixtures for WMS backend tests (in-memory SQLite)."""
from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.models.catalog import Category, Product
from app.models.enums import LocationType, OrderStatus, OrderPriority, UserRole, WorkerStatus
from app.models.inventory import InventoryBalance
from app.models.orders import MacroOrder, Order, OrderItem
from app.models.topology import Location, Zone
from app.models.users import Shift, ShiftEvent, User
from app.models.inbound import InboundShipment, InboundItem
from app.models.waves import Wave, WaveOrder, MicroTask, MicroTaskItem
from app.models.sorting import SortingStation, SortingBin
from app.core.security import hash_password
from fastapi import FastAPI
from app.routers import auth, users, inventory, orders, waves, dashboard

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
    """Minimal warehouse dataset: 1 user, 2 products, 1 order, locations."""
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

    db_session.add_all(
        [
            zone,
            storage_loc,
            staging_loc,
            category,
            product_small,
            product_large,
            admin,
            picker,
            order,
            *order_items,
            *balances,
        ]
    )
    await db_session.commit()

    return {
        "admin": admin,
        "picker": picker,
        "order": order,
        "storage_loc": storage_loc,
        "staging_loc": staging_loc,
        "product_small": product_small,
        "product_large": product_large,
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
