"""Volunteer roles + signups for events."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.user import User


class VolunteerStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class VolunteerRole(Base):
    """A role NGO managers post for an event — water station, route marshal,
    etc. Capacity is the number of people they need."""

    __tablename__ = "volunteer_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    capacity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # Optional shift / location free-text
    shift: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    event: Mapped[Event] = relationship("Event")
    signups: Mapped[list[Volunteer]] = relationship(
        "Volunteer",
        back_populates="role",
        cascade="all, delete-orphan",
    )


class Volunteer(Base):
    """One person signing up for one role. Email + phone always captured so
    the NGO can confirm even when the volunteer doesn't have a platform
    account."""

    __tablename__ = "volunteers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("volunteer_roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Optional: link to a registered user (mostly for repeat volunteers)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    note: Mapped[str | None] = mapped_column(Text)

    status: Mapped[VolunteerStatus] = mapped_column(
        SAEnum(
            VolunteerStatus,
            name="volunteer_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=VolunteerStatus.PENDING,
        nullable=False,
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    role: Mapped[VolunteerRole] = relationship("VolunteerRole", back_populates="signups")
    user: Mapped[User | None] = relationship("User", foreign_keys=[user_id])
