from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import AppSetting

SIMULATION_ACTIVE_KEY = "simulation_active"


async def get_simulation_active(session: AsyncSession) -> bool:
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == SIMULATION_ACTIVE_KEY)
    )
    setting = result.scalar_one_or_none()
    if setting is None:
        return True
    return setting.value.lower() == "true"


async def set_simulation_active(session: AsyncSession, active: bool) -> None:
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == SIMULATION_ACTIVE_KEY)
    )
    setting = result.scalar_one_or_none()
    value = "true" if active else "false"
    if setting is None:
        session.add(AppSetting(key=SIMULATION_ACTIVE_KEY, value=value))
    else:
        setting.value = value
