"""Corporate match-funding partners.

A company commits to match donations on an event up to a cap. As donations
captures fire, payment_service calls record_match() which computes the
matched amount, ratchets total_matched up, and stops once the cap is hit.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SponsorMatchType(str, enum.Enum):
    MULTIPLY = "multiply"
    FIXED_ADD = "fixed_add"
    PERCENTAGE = "percentage"

if TYPE_CHECKING:
    from app.models.event import Event


class CorporateSponsor(Base):
    __tablename__ = "corporate_sponsors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    website: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)

    # Match config: each ₹1 donated = (multiplier - 1) ₹ extra contributed
    # by the sponsor, up to cap_amount. multiplier=2.0 means "1× match".
    multiplier: Mapped[Decimal] = mapped_column(
        Numeric(4, 2), default=Decimal("2.0"), nullable=False
    )
    cap_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    # Running tally of how much of the cap has been used. Updated by
    # payment_service.record_match() on each donation capture.
    total_matched: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    # match_type: how match_value applies. multiply uses the multiplier
    # column above (×N). fixed_add adds match_value rupees flat to every
    # donation. percentage adds match_value % to every donation.
    match_type: Mapped[SponsorMatchType] = mapped_column(
        SAEnum(
            SponsorMatchType,
            name="sponsor_match_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=SponsorMatchType.MULTIPLY,
        nullable=False,
    )
    match_value: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), default=Decimal("2.0"), nullable=False
    )
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

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
