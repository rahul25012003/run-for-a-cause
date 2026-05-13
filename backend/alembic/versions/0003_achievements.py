"""add achievements table

Revision ID: 0003_achievements
Revises: 0002_site_settings
Create Date: 2026-05-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_achievements"
down_revision: str | None = "0002_site_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    achievement_type = postgresql.ENUM(
        "first_km",
        "quarter_distance",
        "halfway",
        "goal_reached",
        "first_donor",
        "fundraising_10k",
        "fundraising_25k",
        "fundraising_50k",
        "fundraising_1l",
        name="achievement_type",
        create_type=False,
    )
    achievement_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "achievements",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "event_runner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("event_runners.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("type", achievement_type, nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255)),
        sa.Column("icon", sa.String(50)),
        sa.Column(
            "unlocked_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "event_runner_id", "type", name="uq_achievements_runner_type"
        ),
    )


def downgrade() -> None:
    op.drop_table("achievements")
    op.execute("DROP TYPE IF EXISTS achievement_type")
