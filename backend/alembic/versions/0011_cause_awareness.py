"""causes.awareness_blocks for the public 'why this cause matters' section.

Stores an array of fact blocks: [{title, body, source_url}].

Revision ID: 0011_cause_awareness
Revises: 0010_strava_tokens
Create Date: 2026-05-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_cause_awareness"
down_revision: str | None = "0010_strava_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "causes",
        sa.Column(
            "awareness_blocks",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("causes", "awareness_blocks")
