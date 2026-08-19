from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.schemas.inventory import (
    InventoryItemResponse,
    InventoryStatsResponse,
    PaginatedInventoryResponse,
    InventoryTransactionResponse,
    PaginatedTransactionsResponse,
)
from app.services import inventory_service
from app.models.users import User
from app.models.enums import UserRole
from typing import Optional

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/", response_model=PaginatedInventoryResponse)
async def get_inventory(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    skip = (page - 1) * size
    items, total = await inventory_service.get_inventory_items(
        db, skip=skip, limit=size, search=search, category=category, status=status, sort_by=sort_by
    )
    
    response_items = [
        InventoryItemResponse(
            id=item.id,
            sku=item.product.sku,
            product_name=item.product.name,
            category=item.product.category.name if item.product.category else None,
            location=item.location.code,
            quantity=item.quantity,
            reserved_quantity=item.reserved_quantity,
            status=inventory_service.compute_stock_status(item.quantity, item.reserved_quantity),
        )
        for item in items
    ]
    
    return PaginatedInventoryResponse(
        items=response_items,
        total=total,
        page=page,
        size=size
    )


@router.get("/stats", response_model=InventoryStatsResponse)
async def inventory_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stats = await inventory_service.get_inventory_stats(db)
    return stats


@router.get("/transactions", response_model=PaginatedTransactionsResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN_MANAGER, UserRole.INBOUND_OPERATOR)),
):
    skip = (page - 1) * size
    transactions, total = await inventory_service.get_transactions(db, skip=skip, limit=size)
    return PaginatedTransactionsResponse(
        items=[
            InventoryTransactionResponse(
                id=tx.id,
                product_sku=tx.product.sku if tx.product else "",
                quantity=tx.quantity,
                transaction_type=tx.transaction_type.value,
                source_location=tx.source_location.code if tx.source_location else None,
                target_location=tx.target_location.code if tx.target_location else None,
                created_at=tx.created_at,
            )
            for tx in transactions
        ],
        total=total,
        page=page,
        size=size,
    )
