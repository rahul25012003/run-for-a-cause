"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-01

This migration creates the entire initial schema in one shot. ENUM types use
`create_type=False` so SQLAlchemy does not auto-create them on table create;
each is created explicitly with `checkfirst=True` so the migration is
idempotent and survives a partial previous run.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _enum(*values: str, name: str) -> postgresql.ENUM:
    """Build a postgres ENUM that won't auto-create on table operations."""
    return postgresql.ENUM(*values, name=name, create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    user_role = _enum(
        "super_admin", "event_manager", "runner", "donor",
        name="user_role",
    )
    kyc_status = _enum(
        "pending", "submitted", "under_review", "verified", "rejected",
        name="kyc_status",
    )
    cause_category = _enum(
        "health", "education", "environment", "animal_welfare",
        "disaster_relief", "poverty", "women_empowerment", "other",
        name="cause_category",
    )
    event_format = _enum(
        "virtual", "in_person", "hybrid", name="event_format"
    )
    event_status = _enum(
        "draft", "pending_approval", "approved", "live",
        "distance_lock", "settling", "settled", "completed",
        "cancelled", "archived",
        name="event_status",
    )
    run_type = _enum(
        "cumulative", "daily", "single_day", name="run_type"
    )
    participation_type = _enum(
        "individual", "team", "both", name="participation_type"
    )
    runner_status = _enum(
        "pending", "approved", "active", "completed",
        "withdrawn", "rejected", name="runner_status",
    )
    distance_proof_source = _enum(
        "strava", "apple_health", "garmin", "fitbit",
        "nike_run", "google_fit", "manual",
        name="distance_proof_source",
    )
    distance_status = _enum(
        "submitted", "under_review", "approved", "rejected", "locked",
        name="distance_status",
    )
    donation_type = _enum(
        "per_km", "fixed", name="donation_type"
    )
    donation_status = _enum(
        "initiated", "pledged", "authorisation_pending", "captured",
        "settled", "refunded", "partially_refunded", "failed", "disputed",
        name="donation_status",
    )
    payout_status = _enum(
        "requested", "approval_pending", "approved", "processing",
        "completed", "failed", "rejected",
        name="payout_status",
    )

    for enum in (
        user_role, kyc_status, cause_category, event_format, event_status,
        run_type, participation_type, runner_status, distance_proof_source,
        distance_status, donation_type, donation_status, payout_status,
    ):
        enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("hashed_password", sa.String(255)),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20)),
        sa.Column("role", user_role, nullable=False, server_default="runner"),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("bio", sa.String(1000)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("email_verified_at", sa.DateTime(timezone=True)),
        sa.Column("totp_secret", sa.String(64)),
        sa.Column("totp_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "organisations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("website", sa.String(500)),
        sa.Column("pan_number", sa.String(20)),
        sa.Column("gstin", sa.String(20)),
        sa.Column("reg_80g_number", sa.String(100)),
        sa.Column("is_80g_eligible", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("bank_account_no", sa.String(50)),
        sa.Column("bank_ifsc", sa.String(20)),
        sa.Column("bank_name", sa.String(100)),
        sa.Column("bank_account_holder", sa.String(255)),
        sa.Column("kyc_status", kyc_status, nullable=False, server_default="pending"),
        sa.Column("kyc_docs", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("kyc_verified_at", sa.DateTime(timezone=True)),
        sa.Column("kyc_verified_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("kyc_rejection_reason", sa.Text),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "causes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("summary", sa.String(500), nullable=False),
        sa.Column("story", sa.Text),
        sa.Column("cover_image_url", sa.String(500)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("total_raised_lifetime", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_events_hosted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cause_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("causes.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("cause_summary", sa.String(500), nullable=False),
        sa.Column("cause_category", cause_category, nullable=False, server_default="other"),
        sa.Column("cover_image_url", sa.String(500)),
        sa.Column("gallery_urls", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("format", event_format, nullable=False, server_default="virtual"),
        sa.Column("participation", participation_type, nullable=False, server_default="both"),
        sa.Column("run_type", run_type, nullable=False, server_default="cumulative"),
        sa.Column("fundraising_goal", sa.Numeric(12, 2), nullable=False),
        sa.Column("distance_goal_km", sa.Numeric(8, 2)),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("registration_deadline", sa.Date),
        sa.Column("status", event_status, nullable=False, server_default="draft"),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("platform_fee_pct", sa.Numeric(4, 2), nullable=False, server_default="3.00"),
        sa.Column("max_runners", sa.Integer),
        sa.Column("is_featured", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("impact_report_url", sa.String(500)),
        sa.Column("impact_report_published_at", sa.DateTime(timezone=True)),
        sa.Column("utilisation_summary", sa.Text),
        sa.Column("total_raised", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_distance_km", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_runners", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_donors", sa.Integer, nullable=False, server_default="0"),
        sa.Column("settings_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "event_runners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("runner_number", sa.String(20)),
        sa.Column("public_slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("personal_story", sa.Text),
        sa.Column("personal_goal_km", sa.Numeric(8, 2)),
        sa.Column("personal_goal_amount", sa.Numeric(10, 2)),
        sa.Column("team_name", sa.String(100)),
        sa.Column("profile_photo_url", sa.String(500)),
        sa.Column("cover_photo_url", sa.String(500)),
        sa.Column("status", runner_status, nullable=False, server_default="pending"),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("distance_completed_km", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("amount_raised", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("donor_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("event_id", "user_id", name="uq_event_runners_event_user"),
    )

    op.create_table(
        "distance_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_runner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event_runners.id", ondelete="CASCADE"), nullable=False),
        sa.Column("distance_km", sa.Numeric(6, 2), nullable=False),
        sa.Column("activity_date", sa.Date, nullable=False),
        sa.Column("proof_url", sa.String(500)),
        sa.Column("proof_source", distance_proof_source, nullable=False, server_default="manual"),
        sa.Column("gps_metadata", postgresql.JSONB),
        sa.Column("notes", sa.Text),
        sa.Column("status", distance_status, nullable=False, server_default="submitted"),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("rejection_reason", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "donations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_runner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event_runners.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("donor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("donor_name", sa.String(255), nullable=False),
        sa.Column("donor_email", sa.String(255), nullable=False, index=True),
        sa.Column("donor_phone", sa.String(20)),
        sa.Column("donor_pan", sa.String(20)),
        sa.Column("is_anonymous", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("donation_type", donation_type, nullable=False),
        sa.Column("amount_per_km", sa.Numeric(8, 2)),
        sa.Column("fixed_amount", sa.Numeric(10, 2)),
        sa.Column("max_cap_amount", sa.Numeric(10, 2)),
        sa.Column("estimated_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("final_amount", sa.Numeric(12, 2)),
        sa.Column("status", donation_status, nullable=False, server_default="initiated"),
        sa.Column("message", sa.Text),
        sa.Column("razorpay_order_id", sa.String(100), index=True),
        sa.Column("razorpay_payment_id", sa.String(100), index=True),
        sa.Column("razorpay_signature", sa.String(500)),
        sa.Column("payment_method", sa.String(50)),
        sa.Column("payment_captured_at", sa.DateTime(timezone=True)),
        sa.Column("platform_fee", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("gateway_fee", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("net_to_cause", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("refunded_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("is_80g_eligible", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("tax_receipt_url", sa.String(500)),
        sa.Column("tax_receipt_number", sa.String(100), unique=True),
        sa.Column("tax_receipt_sent_at", sa.DateTime(timezone=True)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("platform_fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("gateway_fee", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", payout_status, nullable=False, server_default="requested"),
        sa.Column("initiated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("razorpay_payout_id", sa.String(100)),
        sa.Column("razorpay_fund_account_id", sa.String(100)),
        sa.Column("bank_utr", sa.String(100)),
        sa.Column("failure_reason", sa.Text),
        sa.Column("notes", sa.Text),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_type", sa.String(50), nullable=False, index=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("actor_role", sa.String(50)),
        sa.Column("before_json", postgresql.JSONB),
        sa.Column("after_json", postgresql.JSONB),
        sa.Column("metadata_json", postgresql.JSONB),
        sa.Column("reason", sa.Text),
        sa.Column("ip_address", postgresql.INET),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text),
        sa.Column("action_url", sa.String(500)),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("metadata_json", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("read_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("audit_logs")
    op.drop_table("payouts")
    op.drop_table("donations")
    op.drop_table("distance_logs")
    op.drop_table("event_runners")
    op.drop_table("events")
    op.drop_table("causes")
    op.drop_table("organisations")
    op.drop_table("users")

    for enum_name in (
        "payout_status", "donation_status", "donation_type",
        "distance_status", "distance_proof_source", "runner_status",
        "participation_type", "run_type", "event_status", "event_format",
        "cause_category", "kyc_status", "user_role",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
