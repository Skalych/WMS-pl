"""add_app_settings

Revision ID: e1f2a3b4c5d6
Revises: d4e8f1a2b3c4
Create Date: 2026-08-22 13:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d4e8f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=500), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.execute(
        sa.text(
            "INSERT INTO app_settings (key, value) VALUES ('simulation_active', 'true')"
        )
    )


def downgrade() -> None:
    op.drop_table("app_settings")
