"""volunteer roles and signups

Revision ID: 0007_volunteers
Revises: 0006_dpdp
Create Date: 2026-05-07
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_volunteers"
down_revision: str | None = "0006_dpdp"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "volunteer_roles",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "capacity", sa.Integer(), nullable=False, server_default=sa.text("1")
        ),
        sa.Column("shift", sa.String(255), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
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
        "ix_volunteer_roles_event_id", "volunteer_roles", ["event_id"]
    )

    volunteer_status = postgresql.ENUM(
        "pending",
        "confirmed",
        "declined",
        "cancelled",
        name="volunteer_status",
        create_type=False,
    )
    volunteer_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "volunteers",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "role_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("volunteer_roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "status",
            volunteer_status,
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "decided_by",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_volunteers_role_id", "volunteers", ["role_id"])


def downgrade() -> None:
    op.drop_index("ix_volunteers_role_id", table_name="volunteers")
    op.drop_table("volunteers")
    op.execute("DROP TYPE IF EXISTS volunteer_status")
    op.drop_index("ix_volunteer_roles_event_id", table_name="volunteer_roles")
    op.drop_table("volunteer_roles")
