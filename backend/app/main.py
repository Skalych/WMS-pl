from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, users, inventory, orders, waves, inbound, dashboard

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="WMS API for Wave Batch Picking, Real-time Worker Monitoring, Inbound Receipts & Shift PDF Reporting.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
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
