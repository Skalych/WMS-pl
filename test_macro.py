import asyncio
from app.core.database import AsyncSessionLocal
from app.services.order_service import create_macro_order

async def test():
    async with AsyncSessionLocal() as db:
        await create_macro_order(db, "large")

asyncio.run(test())
