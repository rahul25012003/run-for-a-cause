"""add newsletter_subscribers table

Revision ID: 0005_newsletter
Revises: 0004_runner_gallery
Create Date: 2026-05-07
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_newsletter"
down_revision: str | None = "0004_runner_gallery"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column(
            "subscribed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("email", name="uq_newsletter_subscribers_email"),
    )
    op.create_index(
        "ix_newsletter_subscribers_email",
        "newsletter_subscribers",
        ["email"],
    )


def downgrade() -> None:
    op.drop_index("ix_newsletter_subscribers_email", table_name="newsletter_subscribers")
    op.drop_table("newsletter_subscribers")
