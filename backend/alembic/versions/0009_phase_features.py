"""phase A+D feature schema:
- event_runners: streak fields, qr check-in, team_id
- corporate_sponsors: match_type enum, match_value, time-boxed dates
- events: city, latitude, longitude (for India map)
- users: whatsapp_opted_in
- event_teams (new table)

Revision ID: 0009_phase_features
Revises: 0008_corporate_sponsors
Create Date: 2026-05-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_phase_features"
down_revision: str | None = "0008_corporate_sponsors"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ---- event_runners: streak + check-in + team membership ----
    op.add_column(
        "event_runners",
        sa.Column("consecutive_days", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "event_runners",
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "event_runners",
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ---- corporate_sponsors: match_type enum + value + time window ----
    sponsor_match = postgresql.ENUM(
        "multiply",
        "fixed_add",
        "percentage",
        name="sponsor_match_type",
        create_type=False,
    )
    sponsor_match.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "corporate_sponsors",
        sa.Column(
            "match_type",
            sponsor_match,
            nullable=False,
            server_default="multiply",
        ),
    )
    op.add_column(
        "corporate_sponsors",
        sa.Column(
            "match_value",
            sa.Numeric(8, 2),
            nullable=False,
            server_default="2.0",
        ),
    )
    # Backfill match_value from existing multiplier so behaviour is unchanged
    op.execute("UPDATE corporate_sponsors SET match_value = multiplier")
    op.add_column(
        "corporate_sponsors",
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "corporate_sponsors",
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ---- events: city + lat/lng for India map ----
    op.add_column("events", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("events", sa.Column("latitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("events", sa.Column("longitude", sa.Numeric(9, 6), nullable=True))

    # ---- users: whatsapp opt-in ----
    op.add_column(
        "users",
        sa.Column(
            "whatsapp_opted_in",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # ---- event_teams ----
    op.create_table(
        "event_teams",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column(
            "captain_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column(
            "total_raised",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_distance_km",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "member_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("event_id", "slug", name="uq_event_teams_event_slug"),
    )
    op.create_index("ix_event_teams_event_id", "event_teams", ["event_id"])

    op.add_column(
        "event_runners",
        sa.Column(
            "team_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("event_teams.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("event_runners", "team_id")
    op.drop_index("ix_event_teams_event_id", table_name="event_teams")
    op.drop_table("event_teams")
    op.drop_column("users", "whatsapp_opted_in")
    op.drop_column("events", "longitude")
    op.drop_column("events", "latitude")
    op.drop_column("events", "city")
    op.drop_column("corporate_sponsors", "ends_at")
    op.drop_column("corporate_sponsors", "starts_at")
    op.drop_column("corporate_sponsors", "match_value")
    op.drop_column("corporate_sponsors", "match_type")
    op.execute("DROP TYPE IF EXISTS sponsor_match_type")
    op.drop_column("event_runners", "checked_in_at")
    op.drop_column("event_runners", "longest_streak")
    op.drop_column("event_runners", "consecutive_days")
