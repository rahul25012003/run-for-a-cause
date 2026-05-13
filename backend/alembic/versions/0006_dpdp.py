"""DPDP compliance: user soft-delete + digest preference + organisation DPO

Revision ID: 0006_dpdp
Revises: 0005_newsletter
Create Date: 2026-05-07
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_dpdp"
down_revision: str | None = "0005_newsletter"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- users ---
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "purge_scheduled_at", sa.DateTime(timezone=True), nullable=True
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "digest_frequency",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'instant'"),
        ),
    )

    # --- organisations: DPO contact (DPDP Act 2023) ---
    op.add_column(
        "organisations",
        sa.Column("dpo_name", sa.String(255), nullable=True),
    )
    op.add_column(
        "organisations",
        sa.Column("dpo_email", sa.String(255), nullable=True),
    )
    op.add_column(
        "organisations",
        sa.Column("dpo_phone", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organisations", "dpo_phone")
    op.drop_column("organisations", "dpo_email")
    op.drop_column("organisations", "dpo_name")
    op.drop_column("users", "digest_frequency")
    op.drop_column("users", "purge_scheduled_at")
    op.drop_column("users", "deleted_at")
