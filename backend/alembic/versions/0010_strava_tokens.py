"""strava OAuth token columns on users.

Revision ID: 0010_strava_tokens
Revises: 0009_phase_features
Create Date: 2026-05-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_strava_tokens"
down_revision: str | None = "0009_phase_features"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("strava_athlete_id", sa.BigInteger(), nullable=True)
    )
    op.add_column(
        "users", sa.Column("strava_access_token", sa.String(255), nullable=True)
    )
    op.add_column(
        "users", sa.Column("strava_refresh_token", sa.String(255), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("strava_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "strava_expires_at")
    op.drop_column("users", "strava_refresh_token")
    op.drop_column("users", "strava_access_token")
    op.drop_column("users", "strava_athlete_id")
