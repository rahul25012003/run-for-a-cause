"""Event request/response schemas."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.event import (
    CauseCategory,
    EventFormat,
    EventStatus,
    ParticipationType,
    RunType,
)
from app.schemas.common import ORMBase
from app.schemas.organisation import OrganisationPublic


class EventCreate(BaseModel):
    # Super-admin only — picks which org to create under. Managers leave
    # this null and the backend resolves to their own org.
    organisation_id: UUID | None = None
    cause_id: UUID | None = None
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=20)
    cause_summary: str = Field(min_length=10, max_length=500)
    cause_category: CauseCategory = CauseCategory.OTHER
    cover_image_url: str | None = None
    gallery_urls: list[str] = Field(default_factory=list)
    format: EventFormat = EventFormat.VIRTUAL
    participation: ParticipationType = ParticipationType.BOTH
    run_type: RunType = RunType.CUMULATIVE
    fundraising_goal: Decimal = Field(gt=0)
    distance_goal_km: Decimal | None = Field(default=None, gt=0)
    start_date: date
    end_date: date
    registration_deadline: date | None = None
    max_runners: int | None = Field(default=None, gt=0)
    city: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def _validate_dates(self) -> "EventCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if (
            self.registration_deadline
            and self.registration_deadline > self.end_date
        ):
            raise ValueError("registration_deadline must be on or before end_date")
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=20)
    cause_summary: str | None = Field(default=None, min_length=10, max_length=500)
    cover_image_url: str | None = None
    gallery_urls: list[str] | None = None
    fundraising_goal: Decimal | None = Field(default=None, gt=0)
    distance_goal_km: Decimal | None = Field(default=None, gt=0)
    end_date: date | None = None
    max_runners: int | None = Field(default=None, gt=0)
    city: str | None = Field(default=None, max_length=100)


class EventPublic(ORMBase):
    id: UUID
    organisation_id: UUID
    cause_id: UUID | None
    title: str
    slug: str
    description: str
    cause_summary: str
    cause_category: CauseCategory
    cover_image_url: str | None
    gallery_urls: list[str]
    format: EventFormat
    participation: ParticipationType
    run_type: RunType
    fundraising_goal: Decimal
    distance_goal_km: Decimal | None
    start_date: date
    end_date: date
    registration_deadline: date | None
    status: EventStatus
    is_featured: bool
    total_raised: Decimal
    total_distance_km: Decimal
    total_runners: int
    total_donors: int
    city: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    created_at: datetime


class EventDetail(EventPublic):
    organisation: OrganisationPublic
    platform_fee_pct: Decimal
    impact_report_url: str | None
    impact_report_published_at: datetime | None
    utilisation_summary: str | None


class EventApprovalAction(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class EventMapPin(ORMBase):
    """Slim payload for the India discovery map. Only the fields the
    map actually renders — keeps the wire small even with 500+ events."""

    id: UUID
    slug: str
    title: str
    cause_category: CauseCategory
    city: str
    latitude: Decimal
    longitude: Decimal
    total_raised: Decimal
    total_runners: int
    cover_image_url: str | None = None
