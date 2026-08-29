"""issued container labels — print-only until picker scan

Revision ID: h9i0j1k2l3m4
Revises: g8h9i0j1k2l3
Create Date: 2026-08-29 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h9i0j1k2l3m4"
down_revision: Union[str, Sequence[str], None] = "g8h9i0j1k2l3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "issued_container_labels",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("barcode", sa.String(length=8), nullable=False),
        sa.Column(
            "status",
            sa.Enum("ISSUED", "CONSUMED", name="issuedlabelstatus"),
            nullable=False,
        ),
        sa.Column("issued_by_user_id", sa.UUID(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["issued_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("barcode"),
    )
    op.create_index(op.f("ix_issued_container_labels_barcode"), "issued_container_labels", ["barcode"], unique=True)

    # Pre-created AVAILABLE containers were never scanned — remove from live inventory.
    op.execute("DELETE FROM containers WHERE status = 'AVAILABLE'")


def downgrade() -> None:
    op.drop_index(op.f("ix_issued_container_labels_barcode"), table_name="issued_container_labels")
    op.drop_table("issued_container_labels")
    op.execute("DROP TYPE IF EXISTS issuedlabelstatus")
