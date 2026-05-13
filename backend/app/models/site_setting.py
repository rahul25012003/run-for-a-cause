"""Site settings — key/value content editable by super_admin."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SettingType(str, enum.Enum):
    TEXT = "text"
    LONGTEXT = "longtext"
    URL = "url"
    IMAGE = "image"
    JSON = "json"


class SiteSetting(Base):
    """Editable site content (headings, images, copy) keyed by string."""

    __tablename__ = "site_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    value_type: Mapped[SettingType] = mapped_column(
        SAEnum(
            SettingType,
            name="setting_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=SettingType.TEXT,
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    group: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    description: Mapped[str | None] = mapped_column(String(500))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)

    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
