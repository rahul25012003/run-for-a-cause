"""corporate match-funding sponsors

Revision ID: 0008_corporate_sponsors
Revises: 0007_volunteers
Create Date: 2026-05-07
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_corporate_sponsors"
down_revision: str | None = "0007_volunteers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "corporate_sponsors",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "multiplier",
            sa.Numeric(4, 2),
            nullable=False,
            server_default=sa.text("2.0"),
        ),
        sa.Column("cap_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "total_matched",
            sa.Numeric(12, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_corporate_sponsors_event_id", "corporate_sponsors", ["event_id"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_corporate_sponsors_event_id", table_name="corporate_sponsors"
    )
    op.drop_table("corporate_sponsors")
