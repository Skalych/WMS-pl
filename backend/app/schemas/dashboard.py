from pydantic import BaseModel

class DashboardStatsResponse(BaseModel):
    active_orders: int
    employees_online: int
    total_employees: int
    inventory_accuracy: float
    orders_shipped_today: int
    inbound_pending: int
    active_waves: int
