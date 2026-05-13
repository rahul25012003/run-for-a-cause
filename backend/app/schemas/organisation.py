"""Organisation request/response schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.organisation import KycStatus
from app.schemas.common import ORMBase


class OrganisationBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None


class OrganisationCreate(OrganisationBase):
    pan_number: str | None = Field(default=None, max_length=20)
    gstin: str | None = Field(default=None, max_length=20)
    reg_80g_number: str | None = Field(default=None, max_length=100)
    bank_account_no: str | None = Field(default=None, max_length=50)
    bank_ifsc: str | None = Field(default=None, max_length=20)
    bank_name: str | None = Field(default=None, max_length=100)
    bank_account_holder: str | None = Field(default=None, max_length=255)


class OrganisationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None
    # DPDP: data protection officer contact
    dpo_name: str | None = Field(default=None, max_length=255)
    dpo_email: str | None = Field(default=None, max_length=255)
    dpo_phone: str | None = Field(default=None, max_length=20)
    # KYC fields — only writable when kyc_status is NOT verified.
    # Backend rejects with 409 if a manager tries to edit these post-verification.
    pan_number: str | None = Field(default=None, max_length=20)
    gstin: str | None = Field(default=None, max_length=20)
    reg_80g_number: str | None = Field(default=None, max_length=100)
    bank_account_no: str | None = Field(default=None, max_length=50)
    bank_ifsc: str | None = Field(default=None, max_length=20)
    bank_name: str | None = Field(default=None, max_length=100)
    bank_account_holder: str | None = Field(default=None, max_length=255)


# Fields locked after KYC verification — managers can't edit these on a
# verified org because doing so would invalidate the verification (and
# allow swapping bank accounts post-approval — a fraud vector).
_KYC_LOCKED_FIELDS = {
    "pan_number",
    "gstin",
    "reg_80g_number",
    "bank_account_no",
    "bank_ifsc",
    "bank_name",
    "bank_account_holder",
}


def kyc_locked_attempted_edits(
    payload: OrganisationUpdate, current_kyc_verified: bool
) -> list[str]:
    """Return names of KYC fields the payload tries to change while the org
    is already verified. Caller should reject with 409 if non-empty."""
    if not current_kyc_verified:
        return []
    submitted = payload.model_dump(exclude_unset=True)
    return [k for k in submitted if k in _KYC_LOCKED_FIELDS]


class OrganisationPublic(ORMBase):
    id: UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    website: str | None
    kyc_status: KycStatus
    is_80g_eligible: bool
    is_active: bool
    created_at: datetime


class OrganisationDetail(OrganisationPublic):
    pan_number: str | None
    gstin: str | None
    reg_80g_number: str | None
    bank_account_no: str | None
    bank_ifsc: str | None
    bank_name: str | None
    bank_account_holder: str | None
    kyc_verified_at: datetime | None
    kyc_rejection_reason: str | None
    # DPDP DPO contact
    dpo_name: str | None = None
    dpo_email: str | None = None
    dpo_phone: str | None = None
