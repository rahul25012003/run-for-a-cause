"""add gallery_urls to event_runners

Revision ID: 0004_runner_gallery
Revises: 0003_achievements
Create Date: 2026-05-07
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_runner_gallery"
down_revision: str | None = "0003_achievements"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event_runners",
        sa.Column("gallery_urls", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("event_runners", "gallery_urls")
