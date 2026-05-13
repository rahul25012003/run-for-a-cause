"""Payout schemas."""
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.payout import PayoutStatus
from app.schemas.common import ORMBase


class PayoutCreate(BaseModel):
    event_id: UUID
    notes: str | None = Field(default=None, max_length=1000)


class PayoutPublic(ORMBase):
    id: UUID
    event_id: UUID
    organisation_id: UUID
    gross_amount: Decimal
    platform_fee: Decimal
    gateway_fee: Decimal
    net_amount: Decimal
    status: PayoutStatus
    razorpay_payout_id: str | None
    bank_utr: str | None
    notes: str | None
    processed_at: datetime | None
    created_at: datetime
