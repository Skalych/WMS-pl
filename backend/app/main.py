import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.routers import auth, users, inventory, orders, waves, inbound, dashboard, terminal, shift_ws, warehouse_shifts
from app.services import simulation_service
from app.services.simulation_service import warehouse_simulation

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as session:
        await simulation_service.init_simulation_state(session)
    logger.info(
        "Warehouse simulation is %s (APP_ENV=%s)",
        "ENABLED" if simulation_service.get_simulation_state() else "DISABLED",
        settings.APP_ENV,
    )
    # Start the simulation task (it no-ops per tick while the state is off,
    # so the admin toggle can enable/disable it at runtime).
    sim_task = asyncio.create_task(warehouse_simulation(AsyncSessionLocal))
    yield
    # Stop the simulation task
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="WMS API for Wave Batch Picking, Real-time Worker Monitoring, Inbound Receipts & Shift PDF Reporting.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
api_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(inventory.router, prefix=api_prefix)
app.include_router(orders.router, prefix=api_prefix)
app.include_router(waves.router, prefix=api_prefix)
app.include_router(inbound.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(terminal.router, prefix=api_prefix)
app.include_router(shift_ws.router, prefix=api_prefix)
app.include_router(warehouse_shifts.router, prefix=api_prefix)


@app.get("/")
async def root():
    return {
        "message": "WMS Nexus API is online",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}
