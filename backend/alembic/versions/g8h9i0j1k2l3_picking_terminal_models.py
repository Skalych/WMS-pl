"""picking terminal models

Revision ID: g8h9i0j1k2l3
Revises: e1f2a3b4c5d6
Create Date: 2026-08-29 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g8h9i0j1k2l3"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "micro_task_items",
        "quantity_to_pick",
        existing_type=sa.Integer(),
        type_=sa.Numeric(10, 1),
        existing_nullable=False,
    )
    op.alter_column(
        "micro_task_items",
        "quantity_picked",
        existing_type=sa.Integer(),
        type_=sa.Numeric(10, 1),
        existing_nullable=False,
        server_default="0",
    )

    op.create_table(
        "containers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("barcode", sa.String(length=8), nullable=False),
        sa.Column(
            "status",
            sa.Enum("AVAILABLE", "IN_PICKING", "AT_BUFFER", "CLOSED", name="containerstatus"),
            nullable=False,
        ),
        sa.Column("micro_task_id", sa.UUID(), nullable=True),
        sa.Column("picker_user_id", sa.UUID(), nullable=True),
        sa.Column("buffer_code", sa.String(length=20), nullable=True),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["micro_task_id"], ["micro_tasks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["picker_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("barcode"),
    )
    op.create_index(op.f("ix_containers_barcode"), "containers", ["barcode"], unique=True)

    op.create_table(
        "pick_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("micro_task_id", sa.UUID(), nullable=False),
        sa.Column("container_id", sa.UUID(), nullable=True),
        sa.Column("current_item_id", sa.UUID(), nullable=True),
        sa.Column(
            "step",
            sa.Enum(
                "CONTAINER_SCAN",
                "GO_TO_LOCATION",
                "LOCATION_VERIFY",
                "SKU_SCAN",
                "QUANTITY_CONFIRM",
                "BUFFER_SCAN",
                "COMPLETED",
                name="pickstep",
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["container_id"], ["containers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["current_item_id"], ["micro_task_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["micro_task_id"], ["micro_tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pick_sessions_user_id"), "pick_sessions", ["user_id"], unique=False)

    op.execute(
        "ALTER TYPE shifteventtype ADD VALUE IF NOT EXISTS 'SHIFT_CLOCK_IN'"
    )
    op.execute(
        "ALTER TYPE shifteventtype ADD VALUE IF NOT EXISTS 'SHIFT_CLOCK_OUT'"
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_pick_sessions_user_id"), table_name="pick_sessions")
    op.drop_table("pick_sessions")
    op.drop_index(op.f("ix_containers_barcode"), table_name="containers")
    op.drop_table("containers")
    op.execute("DROP TYPE IF EXISTS pickstep")
    op.execute("DROP TYPE IF EXISTS containerstatus")

    op.alter_column(
        "micro_task_items",
        "quantity_picked",
        existing_type=sa.Numeric(10, 1),
        type_=sa.Integer(),
        existing_nullable=False,
    )
    op.alter_column(
        "micro_task_items",
        "quantity_to_pick",
        existing_type=sa.Numeric(10, 1),
        type_=sa.Integer(),
        existing_nullable=False,
    )
