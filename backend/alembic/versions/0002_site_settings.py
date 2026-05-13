"""add site_settings table

Revision ID: 0002_site_settings
Revises: 0001_initial
Create Date: 2026-05-06
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_site_settings"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    setting_type = postgresql.ENUM(
        "text", "longtext", "url", "image", "json",
        name="setting_type",
        create_type=False,
    )
    setting_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "site_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("key", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("value", sa.Text, nullable=False, server_default=""),
        sa.Column("value_type", setting_type, nullable=False, server_default="text"),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("group", sa.String(50), nullable=False, server_default="general"),
        sa.Column("description", sa.String(500)),
        sa.Column("is_public", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("site_settings")
    op.execute("DROP TYPE IF EXISTS setting_type")
