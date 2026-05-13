"""Organisation ORM model — the NGO/community hosting events."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.cause import Cause
    from app.models.event import Event
    from app.models.payout import Payout
    from app.models.user import User


class KycStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Organisation(Base):
    """An NGO or community organisation that hosts run events."""

    __tablename__ = "organisations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    website: Mapped[str | None] = mapped_column(String(500))

    # DPDP: Data Protection Officer contact (DPDP Act 2023)
    dpo_name: Mapped[str | None] = mapped_column(String(255))
    dpo_email: Mapped[str | None] = mapped_column(String(255))
    dpo_phone: Mapped[str | None] = mapped_column(String(20))

    pan_number: Mapped[str | None] = mapped_column(String(20))
    gstin: Mapped[str | None] = mapped_column(String(20))
    reg_80g_number: Mapped[str | None] = mapped_column(String(100))
    is_80g_eligible: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    bank_account_no: Mapped[str | None] = mapped_column(String(50))
    bank_ifsc: Mapped[str | None] = mapped_column(String(20))
    bank_name: Mapped[str | None] = mapped_column(String(100))
    bank_account_holder: Mapped[str | None] = mapped_column(String(255))

    kyc_status: Mapped[KycStatus] = mapped_column(
        SAEnum(
            KycStatus,
            name="kyc_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=KycStatus.PENDING,
        nullable=False,
    )
    kyc_docs: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    kyc_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    kyc_verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    kyc_rejection_reason: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="organisation", foreign_keys=[user_id])
    causes: Mapped[list[Cause]] = relationship(
        "Cause", back_populates="organisation", cascade="all, delete-orphan"
    )
    events: Mapped[list[Event]] = relationship(
        "Event", back_populates="organisation"
    )
    payouts: Mapped[list[Payout]] = relationship(
        "Payout", back_populates="organisation"
    )
