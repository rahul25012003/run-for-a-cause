"""Cause request/response schemas."""
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMBase


class AwarenessBlock(BaseModel):
    """A single fact/myth-buster card under 'Why this cause matters'."""

    title: str = Field(min_length=2, max_length=120)
    body: str = Field(min_length=2, max_length=600)
    source_url: str | None = Field(default=None, max_length=500)


class CauseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    summary: str = Field(min_length=10, max_length=500)
    story: str | None = None
    cover_image_url: str | None = None
    awareness_blocks: list[AwarenessBlock] = Field(default_factory=list, max_length=8)


class CauseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    summary: str | None = Field(default=None, min_length=10, max_length=500)
    story: str | None = None
    cover_image_url: str | None = None
    awareness_blocks: list[AwarenessBlock] | None = Field(default=None, max_length=8)


class CausePublic(ORMBase):
    id: UUID
    organisation_id: UUID
    title: str
    slug: str
    summary: str
    story: str | None
    cover_image_url: str | None
    is_active: bool
    awareness_blocks: list[AwarenessBlock] = Field(default_factory=list)
    total_raised_lifetime: Decimal
    total_events_hosted: int
    created_at: datetime
