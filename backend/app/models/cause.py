"""Cause ORM model — first-class entity that donors can follow across events."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.organisation import Organisation


class Cause(Base):
    """A long-running cause sponsored by an organisation; can host many events."""

    __tablename__ = "causes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organisation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    story: Mapped[str | None] = mapped_column(Text)
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # JSONB array of {title, body, source_url} blocks. Manager-edited via the
    # cause editor; rendered on every runner profile under this cause as the
    # "Why this cause matters" section.
    awareness_blocks: Mapped[list] = mapped_column(
        JSONB, default=list, nullable=False
    )

    total_raised_lifetime: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )
    total_events_hosted: Mapped[int] = mapped_column(
        default=0, nullable=False
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

    organisation: Mapped[Organisation] = relationship(
        "Organisation", back_populates="causes"
    )
    events: Mapped[list[Event]] = relationship("Event", back_populates="cause")
