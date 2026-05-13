"""EventRunner model — a User joining a specific Event."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.achievement import Achievement
    from app.models.distance_log import DistanceLog
    from app.models.donation import Donation
    from app.models.event import Event
    from app.models.user import User


class RunnerStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"
    REJECTED = "rejected"


class EventRunner(Base):
    """The link between a User (runner) and an Event."""

    __tablename__ = "event_runners"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_runners_event_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    runner_number: Mapped[str | None] = mapped_column(String(20))
    public_slug: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    personal_story: Mapped[str | None] = mapped_column(Text)
    personal_goal_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    personal_goal_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    team_name: Mapped[str | None] = mapped_column(String(100))
    profile_photo_url: Mapped[str | None] = mapped_column(String(500))
    cover_photo_url: Mapped[str | None] = mapped_column(String(500))
    # Up to ~6 gallery photos rendered on the public profile page.
    # Stored as a JSONB array of URLs; nullable for backwards compat.
    gallery_urls: Mapped[list[str] | None] = mapped_column(JSONB)

    status: Mapped[RunnerStatus] = mapped_column(
        SAEnum(
            RunnerStatus,
            name="runner_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=RunnerStatus.PENDING,
        nullable=False,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    distance_completed_km: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    amount_raised: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )
    donor_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    consecutive_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event_teams.id", ondelete="SET NULL"),
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    event: Mapped[Event] = relationship("Event", back_populates="event_runners")
    user: Mapped[User] = relationship(
        "User", back_populates="event_runners", foreign_keys=[user_id]
    )
    distance_logs: Mapped[list[DistanceLog]] = relationship(
        "DistanceLog",
        back_populates="event_runner",
        cascade="all, delete-orphan",
    )
    donations: Mapped[list[Donation]] = relationship(
        "Donation", back_populates="event_runner"
    )
    achievements: Mapped[list[Achievement]] = relationship(
        "Achievement",
        back_populates="event_runner",
        cascade="all, delete-orphan",
    )
