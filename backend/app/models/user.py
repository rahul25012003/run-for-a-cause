"""User ORM model."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.donation import Donation
    from app.models.event_runner import EventRunner
    from app.models.notification import Notification
    from app.models.organisation import Organisation


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    EVENT_MANAGER = "event_manager"
    RUNNER = "runner"
    DONOR = "donor"


class User(Base):
    """Platform user; all roles share this table."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str | None] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            name="user_role",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=UserRole.RUNNER,
    )
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(String(1000))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    totp_secret: Mapped[str | None] = mapped_column(String(64))
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # DPDP: notification cadence preference
    digest_frequency: Mapped[str] = mapped_column(
        String(20), default="instant", nullable=False
    )
    # Opt-in for transactional WhatsApp notifications (Phase D-1).
    whatsapp_opted_in: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Strava OAuth (Phase C-1). Tokens are nullable — populated only after
    # the runner connects their Strava account.
    strava_athlete_id: Mapped[int | None] = mapped_column(BigInteger)
    strava_access_token: Mapped[str | None] = mapped_column(String(255))
    strava_refresh_token: Mapped[str | None] = mapped_column(String(255))
    strava_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    # DPDP: soft-delete with grace window. deleted_at marks the request,
    # purge_scheduled_at is when a future cron will hard-purge.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    purge_scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    organisation: Mapped[Organisation | None] = relationship(
        "Organisation",
        back_populates="user",
        foreign_keys="Organisation.user_id",
        uselist=False,
        cascade="all, delete-orphan",
    )
    event_runners: Mapped[list[EventRunner]] = relationship(
        "EventRunner",
        back_populates="user",
        foreign_keys="EventRunner.user_id",
    )
    donations: Mapped[list[Donation]] = relationship(
        "Donation",
        foreign_keys="Donation.donor_user_id",
        back_populates="donor_user",
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
