"""Common Pydantic schemas shared across endpoints."""
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMBase(BaseModel):
    """Base for response models built from SQLAlchemy ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_more: bool


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None
