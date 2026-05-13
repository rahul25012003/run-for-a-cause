"""Achievement / badge ORM model."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.event_runner import EventRunner


class AchievementType(str, enum.Enum):
    FIRST_KM = "first_km"
    QUARTER_DISTANCE = "quarter_distance"
    HALFWAY = "halfway"
    GOAL_REACHED = "goal_reached"
    FIRST_DONOR = "first_donor"
    FUNDRAISING_10K = "fundraising_10k"
    FUNDRAISING_25K = "fundraising_25k"
    FUNDRAISING_50K = "fundraising_50k"
    FUNDRAISING_1L = "fundraising_1l"


class Achievement(Base):
    """Unlocked badges per EventRunner."""

    __tablename__ = "achievements"
    __table_args__ = (
        UniqueConstraint(
            "event_runner_id",
            "type",
            name="uq_achievements_runner_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_runner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("event_runners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[AchievementType] = mapped_column(
        SAEnum(
            AchievementType,
            name="achievement_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    icon: Mapped[str | None] = mapped_column(String(50))
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    event_runner: Mapped[EventRunner] = relationship(
        "EventRunner", back_populates="achievements"
    )
