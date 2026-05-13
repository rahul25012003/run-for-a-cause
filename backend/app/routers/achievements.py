"""Achievements + manager event-analytics endpoints."""
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_manager
from app.models.achievement import Achievement, AchievementType
from app.models.distance_log import DistanceLog, DistanceStatus
from app.models.donation import Donation, DonationStatus
from app.models.event import Event
from app.models.event_runner import EventRunner, RunnerStatus
from app.models.user import User, UserRole
from app.schemas.common import ORMBase

achievements_router = APIRouter(prefix="/achievements", tags=["achievements"])
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])


class AchievementPublic(ORMBase):
    id: UUID
    type: AchievementType
    title: str
    description: str | None
    icon: str | None
    unlocked_at: datetime


@achievements_router.get(
    "/runner/{event_runner_id}",
    response_model=list[AchievementPublic],
)
async def list_runner_achievements(
    event_runner_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AchievementPublic]:
    """Public — list every badge unlocked by an EventRunner."""
    result = await db.execute(
        select(Achievement)
        .where(Achievement.event_runner_id == event_runner_id)
        .order_by(Achievement.unlocked_at.desc())
    )
    return [AchievementPublic.model_validate(a) for a in result.scalars().all()]


# -----------------------------
# Manager event analytics
# -----------------------------


class TopRunner(BaseModel):
    runner_id: str
    name: str
    public_slug: str
    amount_raised: Decimal
    distance_km: Decimal
    donor_count: int


class DonationByDay(BaseModel):
    day: str
    raised: Decimal
    count: int


class EventAnalytics(BaseModel):
    event_id: str
    slug: str
    title: str
    event_status: str
    total_raised: Decimal
    total_distance_km: Decimal
    total_runners: int
    total_donors: int
    pending_distance_logs: int
    pending_runners: int
    fundraising_progress_pct: float
    daily_donations: list[DonationByDay]
    top_runners_by_amount: list[TopRunner]
    top_runners_by_distance: list[TopRunner]


@analytics_router.get(
    "/events/{event_id}",
    response_model=EventAnalytics,
)
async def event_analytics(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventAnalytics:
    """Per-event analytics for the event manager (or super-admin)."""
    event_res = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if (
        user.role != UserRole.SUPER_ADMIN
        and event.organisation.user_id != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the hosting organisation may view these analytics.",
        )

    # Daily donation buckets — last 30 days
    since = datetime.now(UTC) - timedelta(days=30)
    daily_res = await db.execute(
        select(
            func.date_trunc("day", Donation.created_at).label("day"),
            func.coalesce(func.sum(Donation.estimated_amount), 0).label("raised"),
            func.count(Donation.id).label("count"),
        )
        .where(
            Donation.event_id == event_id,
            Donation.status.in_(
                (DonationStatus.CAPTURED, DonationStatus.SETTLED)
            ),
            Donation.created_at >= since,
        )
        .group_by("day")
        .order_by("day")
    )
    daily_rows = daily_res.all()
    daily: list[DonationByDay] = [
        DonationByDay(
            day=row.day.strftime("%d %b") if row.day else "",
            raised=row.raised or Decimal("0"),
            count=int(row.count or 0),
        )
        for row in daily_rows
    ]

    # Pending distance logs
    pending_logs = (
        await db.execute(
            select(func.count(DistanceLog.id))
            .join(EventRunner, EventRunner.id == DistanceLog.event_runner_id)
            .where(
                EventRunner.event_id == event_id,
                DistanceLog.status.in_(
                    (DistanceStatus.SUBMITTED, DistanceStatus.UNDER_REVIEW)
                ),
            )
        )
    ).scalar_one()

    # Pending runner approvals
    pending_runners = (
        await db.execute(
            select(func.count(EventRunner.id)).where(
                EventRunner.event_id == event_id,
                EventRunner.status == RunnerStatus.PENDING,
            )
        )
    ).scalar_one()

    # Top runners
    top_amount_res = await db.execute(
        select(EventRunner)
        .where(EventRunner.event_id == event_id)
        .options(selectinload(EventRunner.user))
        .order_by(EventRunner.amount_raised.desc())
        .limit(5)
    )
    top_amount = [
        TopRunner(
            runner_id=str(r.id),
            name=r.user.full_name,
            public_slug=r.public_slug,
            amount_raised=r.amount_raised,
            distance_km=r.distance_completed_km,
            donor_count=r.donor_count,
        )
        for r in top_amount_res.scalars().all()
    ]

    top_distance_res = await db.execute(
        select(EventRunner)
        .where(EventRunner.event_id == event_id)
        .options(selectinload(EventRunner.user))
        .order_by(EventRunner.distance_completed_km.desc())
        .limit(5)
    )
    top_distance = [
        TopRunner(
            runner_id=str(r.id),
            name=r.user.full_name,
            public_slug=r.public_slug,
            amount_raised=r.amount_raised,
            distance_km=r.distance_completed_km,
            donor_count=r.donor_count,
        )
        for r in top_distance_res.scalars().all()
    ]

    progress = (
        float(event.total_raised) / float(event.fundraising_goal) * 100
        if float(event.fundraising_goal) > 0
        else 0
    )

    return EventAnalytics(
        event_id=str(event.id),
        slug=event.slug,
        title=event.title,
        event_status=event.status.value,
        total_raised=event.total_raised,
        total_distance_km=event.total_distance_km,
        total_runners=event.total_runners,
        total_donors=event.total_donors,
        pending_distance_logs=int(pending_logs),
        pending_runners=int(pending_runners),
        fundraising_progress_pct=round(min(100, progress), 1),
        daily_donations=daily,
        top_runners_by_amount=top_amount,
        top_runners_by_distance=top_distance,
    )


# -----------------------------
# Public leaderboard (no auth)
# -----------------------------


class PublicLeaderboardRunner(BaseModel):
    rank: int
    runner_id: str
    name: str
    public_slug: str
    profile_photo_url: str | None
    amount_raised: Decimal
    distance_km: Decimal
    donor_count: int


class PublicEventLeaderboard(BaseModel):
    event_id: str
    event_title: str
    event_slug: str
    cause_summary: str
    organisation_name: str
    total_raised: Decimal
    total_distance_km: Decimal
    total_runners: int
    fundraising_goal: Decimal
    fundraising_progress_pct: float
    by_amount: list[PublicLeaderboardRunner]
    by_distance: list[PublicLeaderboardRunner]


@analytics_router.get(
    "/events/{event_slug}/leaderboard",
    response_model=PublicEventLeaderboard,
)
async def public_leaderboard(
    event_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 25,
) -> PublicEventLeaderboard:
    """Public leaderboard for an event — top runners by amount and by distance."""
    event_res = await db.execute(
        select(Event)
        .where(Event.slug == event_slug)
        .options(selectinload(Event.organisation))
    )
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    base_query = (
        select(EventRunner)
        .where(
            EventRunner.event_id == event.id,
            EventRunner.status == RunnerStatus.APPROVED,
        )
        .options(selectinload(EventRunner.user))
    )

    by_amount_res = await db.execute(
        base_query.order_by(EventRunner.amount_raised.desc()).limit(limit)
    )
    by_amount = [
        PublicLeaderboardRunner(
            rank=i + 1,
            runner_id=str(r.id),
            name=r.user.full_name,
            public_slug=r.public_slug,
            profile_photo_url=r.profile_photo_url,
            amount_raised=r.amount_raised,
            distance_km=r.distance_completed_km,
            donor_count=r.donor_count,
        )
        for i, r in enumerate(by_amount_res.scalars().all())
    ]

    by_distance_res = await db.execute(
        base_query.order_by(EventRunner.distance_completed_km.desc()).limit(limit)
    )
    by_distance = [
        PublicLeaderboardRunner(
            rank=i + 1,
            runner_id=str(r.id),
            name=r.user.full_name,
            public_slug=r.public_slug,
            profile_photo_url=r.profile_photo_url,
            amount_raised=r.amount_raised,
            distance_km=r.distance_completed_km,
            donor_count=r.donor_count,
        )
        for i, r in enumerate(by_distance_res.scalars().all())
    ]

    progress = (
        float(event.total_raised) / float(event.fundraising_goal) * 100
        if float(event.fundraising_goal) > 0
        else 0
    )

    return PublicEventLeaderboard(
        event_id=str(event.id),
        event_title=event.title,
        event_slug=event.slug,
        cause_summary=event.cause_summary,
        organisation_name=event.organisation.name,
        total_raised=event.total_raised,
        total_distance_km=event.total_distance_km,
        total_runners=event.total_runners,
        fundraising_goal=event.fundraising_goal,
        fundraising_progress_pct=round(min(100, progress), 1),
        by_amount=by_amount,
        by_distance=by_distance,
    )
