"""Payout ORM model — funds released to NGO after event settles."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.organisation import Organisation


class PayoutStatus(str, enum.Enum):
    REQUESTED = "requested"
    APPROVAL_PENDING = "approval_pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"


class Payout(Base):
    """A payout transferring net funds from platform escrow to the NGO."""

    __tablename__ = "payouts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    organisation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )

    gross_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    gateway_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), nullable=False
    )
    net_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    status: Mapped[PayoutStatus] = mapped_column(
        SAEnum(
            PayoutStatus,
            name="payout_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=PayoutStatus.REQUESTED,
        nullable=False,
    )

    initiated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    razorpay_payout_id: Mapped[str | None] = mapped_column(String(100))
    razorpay_fund_account_id: Mapped[str | None] = mapped_column(String(100))
    bank_utr: Mapped[str | None] = mapped_column(String(100))
    failure_reason: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    event: Mapped[Event] = relationship("Event", back_populates="payouts")
    organisation: Mapped[Organisation] = relationship(
        "Organisation", back_populates="payouts"
    )
