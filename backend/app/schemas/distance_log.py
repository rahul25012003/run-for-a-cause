"""Distance log schemas."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.distance_log import DistanceProofSource, DistanceStatus
from app.schemas.common import ORMBase


class DistanceLogCreate(BaseModel):
    event_runner_id: UUID
    distance_km: Decimal = Field(gt=0, le=200)
    activity_date: date
    proof_url: str | None = Field(default=None, max_length=500)
    proof_source: DistanceProofSource = DistanceProofSource.MANUAL
    notes: str | None = Field(default=None, max_length=1000)


class DistanceLogReview(BaseModel):
    rejection_reason: str | None = Field(default=None, max_length=1000)


class DistanceLogPublic(ORMBase):
    id: UUID
    event_runner_id: UUID
    distance_km: Decimal
    activity_date: date
    proof_url: str | None
    proof_source: DistanceProofSource
    notes: str | None
    status: DistanceStatus
    reviewed_at: datetime | None
    rejection_reason: str | None
    created_at: datetime


class DistanceLogReviewItem(ORMBase):
    """Distance log enriched with runner identity for the manager queue."""

    id: UUID
    event_runner_id: UUID
    runner_name: str
    runner_slug: str
    distance_km: Decimal
    activity_date: date
    proof_url: str | None
    proof_source: DistanceProofSource
    notes: str | None
    status: DistanceStatus
    rejection_reason: str | None
    created_at: datetime
