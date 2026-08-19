from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.schemas.dashboard import DashboardStatsResponse
from app.services import user_service, order_service, inventory_service, wave_service, inbound_service
from app.services import simulation_service
from app.models.enums import UserRole
from app.models.users import User
from pydantic import BaseModel

class SimulationToggleRequest(BaseModel):
    active: bool

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.post("/simulation/toggle")
async def toggle_simulation(
    req: SimulationToggleRequest,
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER)),
):
    simulation_service.set_simulation_state(req.active)
    return {"status": "success", "simulation_active": req.active}


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    active_orders = await order_service.count_active_orders(db)
    employees_online = await user_service.count_online_users(db)
    total_employees = await user_service.count_total_users(db)
    inv_stats = await inventory_service.get_inventory_stats(db)
    shipped_today = await order_service.count_shipped_today(db)
    pending_inbound = await inbound_service.count_pending_inbound(db)
    active_waves = await wave_service.count_active_waves(db)

    total_items = inv_stats["total_skus"]
    in_stock = inv_stats["in_stock"]
    accuracy = (in_stock / total_items * 100) if total_items > 0 else 100.0

    return DashboardStatsResponse(
        active_orders=active_orders,
        employees_online=employees_online,
        total_employees=total_employees,
        inventory_accuracy=round(accuracy, 1),
        orders_shipped_today=shipped_today,
        inbound_pending=pending_inbound,
        active_waves=active_waves,
    )
