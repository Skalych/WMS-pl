"""Floor operations: partial waves, inventory locks, task claim."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PARTIALLY_IN_WAVE'")

    op.add_column(
        "order_items",
        sa.Column("allocated_quantity", sa.Integer(), server_default="0", nullable=False),
    )

    op.add_column(
        "micro_task_items",
        sa.Column("order_item_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_micro_task_items_order_item_id",
        "micro_task_items",
        "order_items",
        ["order_item_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_check_constraint(
        "ck_inventory_quantity_nonneg",
        "inventory_balances",
        "quantity >= 0",
    )
    op.create_check_constraint(
        "ck_inventory_reserved_nonneg",
        "inventory_balances",
        "reserved_quantity >= 0",
    )
    op.create_check_constraint(
        "ck_inventory_reserved_lte_quantity",
        "inventory_balances",
        "reserved_quantity <= quantity",
    )


def downgrade() -> None:
    op.drop_constraint("ck_inventory_reserved_lte_quantity", "inventory_balances", type_="check")
    op.drop_constraint("ck_inventory_reserved_nonneg", "inventory_balances", type_="check")
    op.drop_constraint("ck_inventory_quantity_nonneg", "inventory_balances", type_="check")
    op.drop_constraint("fk_micro_task_items_order_item_id", "micro_task_items", type_="foreignkey")
    op.drop_column("micro_task_items", "order_item_id")
    op.drop_column("order_items", "allocated_quantity")
