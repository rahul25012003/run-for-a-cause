"""Donation ORM model — a pledge or fixed donation from a donor to a runner."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.event_runner import EventRunner
    from app.models.user import User


class DonationType(str, enum.Enum):
    PER_KM = "per_km"
    FIXED = "fixed"


class DonationStatus(str, enum.Enum):
    INITIATED = "initiated"
    PLEDGED = "pledged"
    AUTHORISATION_PENDING = "authorisation_pending"
    CAPTURED = "captured"
    SETTLED = "settled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    FAILED = "failed"
    DISPUTED = "disputed"


class Donation(Base):
    """A donor's contribution to a runner's fundraising effort."""

    __tablename__ = "donations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_runner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event_runners.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )

    donor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    donor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    donor_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    donor_phone: Mapped[str | None] = mapped_column(String(20))
    donor_pan: Mapped[str | None] = mapped_column(String(20))
    is_anonymous: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    donation_type: Mapped[DonationType] = mapped_column(
        SAEnum(
            DonationType,
            name="donation_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    amount_per_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    fixed_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    max_cap_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    estimated_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )
    final_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    status: Mapped[DonationStatus] = mapped_column(
        SAEnum(
            DonationStatus,
            name="donation_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=DonationStatus.INITIATED,
        nullable=False,
    )
    message: Mapped[str | None] = mapped_column(Text)

    razorpay_order_id: Mapped[str | None] = mapped_column(String(100), index=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(100), index=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(500))
    payment_method: Mapped[str | None] = mapped_column(String(50))
    payment_captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    platform_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    gateway_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    net_to_cause: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )
    refunded_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )

    is_80g_eligible: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    tax_receipt_url: Mapped[str | None] = mapped_column(String(500))
    tax_receipt_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    tax_receipt_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    event_runner: Mapped[EventRunner] = relationship(
        "EventRunner", back_populates="donations"
    )
    event: Mapped[Event] = relationship("Event", back_populates="donations")
    donor_user: Mapped[User | None] = relationship(
        "User", back_populates="donations", foreign_keys=[donor_user_id]
    )
