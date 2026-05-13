"""Runner / EventRunner schemas."""
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.event_runner import RunnerStatus
from app.schemas.common import ORMBase


class EventRunnerJoin(BaseModel):
    personal_story: str | None = Field(default=None, max_length=5000)
    personal_goal_km: Decimal | None = Field(default=None, gt=0)
    personal_goal_amount: Decimal | None = Field(default=None, gt=0)
    team_name: str | None = Field(default=None, max_length=100)
    profile_photo_url: str | None = None
    cover_photo_url: str | None = None
    gallery_urls: list[str] | None = Field(default=None, max_length=6)


class EventRunnerUpdate(BaseModel):
    personal_story: str | None = Field(default=None, max_length=5000)
    personal_goal_km: Decimal | None = Field(default=None, gt=0)
    personal_goal_amount: Decimal | None = Field(default=None, gt=0)
    team_name: str | None = Field(default=None, max_length=100)
    profile_photo_url: str | None = None
    cover_photo_url: str | None = None
    gallery_urls: list[str] | None = Field(default=None, max_length=6)


class RunnerProfilePublic(ORMBase):
    id: UUID
    event_id: UUID
    user_id: UUID
    runner_number: str | None
    public_slug: str
    personal_story: str | None
    personal_goal_km: Decimal | None
    personal_goal_amount: Decimal | None
    team_name: str | None
    profile_photo_url: str | None
    cover_photo_url: str | None
    gallery_urls: list[str] | None = None
    status: RunnerStatus
    distance_completed_km: Decimal
    amount_raised: Decimal
    donor_count: int
    joined_at: datetime
    team_id: UUID | None = None
    consecutive_days: int = 0
    longest_streak: int = 0
    # Populated by endpoints that eagerly load the event relationship
    event_title: str = ""
    event_slug: str = ""


class RunnerCardPublic(ORMBase):
    """Compact runner card for grids/lists."""
    id: UUID
    public_slug: str
    full_name: str
    profile_photo_url: str | None
    distance_completed_km: Decimal
    amount_raised: Decimal
    personal_goal_amount: Decimal | None
    status: RunnerStatus
    checked_in_at: datetime | None = None


class RunnerApprovalAction(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class RunnerSpotlightItem(ORMBase):
    """Compact runner card for the public landing-page spotlight grid."""
    id: UUID
    public_slug: str
    full_name: str
    profile_photo_url: str | None
    cover_photo_url: str | None
    personal_story: str | None
    amount_raised: Decimal
    distance_completed_km: Decimal
    event_title: str
    event_slug: str
    event_cause_summary: str
