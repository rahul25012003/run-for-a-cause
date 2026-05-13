"""Donation schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.donation import DonationStatus, DonationType
from app.schemas.common import ORMBase


class DonationCreate(BaseModel):
    event_runner_id: UUID
    donor_name: str = Field(min_length=2, max_length=255)
    donor_email: EmailStr
    donor_phone: str | None = Field(default=None, max_length=20)
    donor_pan: str | None = Field(default=None, max_length=20)
    is_anonymous: bool = False

    donation_type: DonationType
    amount_per_km: Decimal | None = Field(default=None, gt=0)
    fixed_amount: Decimal | None = Field(default=None, gt=0)
    max_cap_amount: Decimal | None = Field(default=None, gt=0)

    message: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _validate_amount(self) -> "DonationCreate":
        if self.donation_type == DonationType.PER_KM:
            if not self.amount_per_km:
                raise ValueError("amount_per_km required for per_km donations")
            if not self.max_cap_amount:
                raise ValueError("max_cap_amount required for per_km donations")
            if self.max_cap_amount < self.amount_per_km:
                raise ValueError("max_cap_amount must be >= amount_per_km")
        elif self.donation_type == DonationType.FIXED:
            if not self.fixed_amount:
                raise ValueError("fixed_amount required for fixed donations")
        return self


class PaymentVerify(BaseModel):
    donation_id: UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class DonationPublic(ORMBase):
    """Donation info shown on a runner's public page (PII redacted if anonymous)."""
    id: UUID
    donor_name: str
    is_anonymous: bool
    donation_type: DonationType
    amount_per_km: Decimal | None
    fixed_amount: Decimal | None
    estimated_amount: Decimal
    final_amount: Decimal | None
    status: DonationStatus
    message: str | None
    created_at: datetime


class DonationDetail(DonationPublic):
    event_runner_id: UUID
    event_id: UUID
    donor_email: EmailStr
    donor_phone: str | None
    max_cap_amount: Decimal | None
    platform_fee: Decimal
    net_to_cause: Decimal
    refunded_amount: Decimal
    payment_method: str | None
    payment_captured_at: datetime | None
    is_80g_eligible: bool
    tax_receipt_url: str | None


class DonationCreateResponse(BaseModel):
    donation: DonationDetail
    razorpay_order: dict[str, Any]
    razorpay_key_id: str
