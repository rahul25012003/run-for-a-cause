"""Distance log ORM model — records each km a runner runs."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.event_runner import EventRunner


class DistanceProofSource(str, enum.Enum):
    STRAVA = "strava"
    APPLE_HEALTH = "apple_health"
    GARMIN = "garmin"
    FITBIT = "fitbit"
    NIKE_RUN = "nike_run"
    GOOGLE_FIT = "google_fit"
    MANUAL = "manual"


class DistanceStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    LOCKED = "locked"


class DistanceLog(Base):
    """A single distance entry submitted by a runner for review."""

    __tablename__ = "distance_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_runner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event_runners.id", ondelete="CASCADE"),
        nullable=False,
    )

    distance_km: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    proof_url: Mapped[str | None] = mapped_column(String(500))
    proof_source: Mapped[DistanceProofSource] = mapped_column(
        SAEnum(
            DistanceProofSource,
            name="distance_proof_source",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=DistanceProofSource.MANUAL,
        nullable=False,
    )
    gps_metadata: Mapped[dict | None] = mapped_column(JSONB)
    notes: Mapped[str | None] = mapped_column(Text)

    status: Mapped[DistanceStatus] = mapped_column(
        SAEnum(
            DistanceStatus,
            name="distance_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=DistanceStatus.SUBMITTED,
        nullable=False,
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    event_runner: Mapped[EventRunner] = relationship(
        "EventRunner", back_populates="distance_logs"
    )
