"""add_total_units_received_to_shift

Revision ID: d4e8f1a2b3c4
Revises: bb58ae9ed22c
Create Date: 2026-08-20 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e8f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "bb58ae9ed22c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "shifts",
        sa.Column("total_units_received", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("shifts", "total_units_received")
