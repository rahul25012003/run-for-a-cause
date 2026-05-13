"""Event ORM model — a single run-for-cause event."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.cause import Cause
    from app.models.donation import Donation
    from app.models.event_runner import EventRunner
    from app.models.organisation import Organisation
    from app.models.payout import Payout


class CauseCategory(str, enum.Enum):
    HEALTH = "health"
    EDUCATION = "education"
    ENVIRONMENT = "environment"
    ANIMAL_WELFARE = "animal_welfare"
    DISASTER_RELIEF = "disaster_relief"
    POVERTY = "poverty"
    WOMEN_EMPOWERMENT = "women_empowerment"
    OTHER = "other"


class EventFormat(str, enum.Enum):
    VIRTUAL = "virtual"
    IN_PERSON = "in_person"
    HYBRID = "hybrid"


class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    LIVE = "live"
    DISTANCE_LOCK = "distance_lock"
    SETTLING = "settling"
    SETTLED = "settled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


class RunType(str, enum.Enum):
    CUMULATIVE = "cumulative"
    DAILY = "daily"
    SINGLE_DAY = "single_day"


class ParticipationType(str, enum.Enum):
    INDIVIDUAL = "individual"
    TEAM = "team"
    BOTH = "both"


class Event(Base):
    """A run-for-cause event hosted by an organisation."""

    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organisation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )
    cause_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("causes.id", ondelete="SET NULL")
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cause_summary: Mapped[str] = mapped_column(String(500), nullable=False)
    cause_category: Mapped[CauseCategory] = mapped_column(
        SAEnum(
            CauseCategory,
            name="cause_category",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=CauseCategory.OTHER,
        nullable=False,
    )
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    gallery_urls: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    format: Mapped[EventFormat] = mapped_column(
        SAEnum(
            EventFormat,
            name="event_format",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=EventFormat.VIRTUAL,
        nullable=False,
    )
    participation: Mapped[ParticipationType] = mapped_column(
        SAEnum(
            ParticipationType,
            name="participation_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=ParticipationType.BOTH,
        nullable=False,
    )
    run_type: Mapped[RunType] = mapped_column(
        SAEnum(
            RunType,
            name="run_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=RunType.CUMULATIVE,
        nullable=False,
    )

    fundraising_goal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    distance_goal_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    registration_deadline: Mapped[date | None] = mapped_column(Date)

    status: Mapped[EventStatus] = mapped_column(
        SAEnum(
            EventStatus,
            name="event_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=EventStatus.DRAFT,
        nullable=False,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    platform_fee_pct: Mapped[Decimal] = mapped_column(
        Numeric(4, 2), default=Decimal("3.00"), nullable=False
    )
    max_runners: Mapped[int | None] = mapped_column(Integer)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Geocoded location — used by the India cause discovery map.
    city: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))

    impact_report_url: Mapped[str | None] = mapped_column(String(500))
    impact_report_published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    utilisation_summary: Mapped[str | None] = mapped_column(Text)

    total_raised: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )
    total_distance_km: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    total_runners: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_donors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    settings_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    organisation: Mapped[Organisation] = relationship(
        "Organisation", back_populates="events"
    )
    cause: Mapped[Cause | None] = relationship("Cause", back_populates="events")
    event_runners: Mapped[list[EventRunner]] = relationship(
        "EventRunner", back_populates="event", cascade="all, delete-orphan"
    )
    donations: Mapped[list[Donation]] = relationship(
        "Donation", back_populates="event"
    )
    payouts: Mapped[list[Payout]] = relationship("Payout", back_populates="event")
