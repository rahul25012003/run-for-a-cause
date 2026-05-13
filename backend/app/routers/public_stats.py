"""Public stats — real numbers from the database, no auth required."""
from datetime import UTC, datetime, timedelta
from typing import Annotated
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.donation import Donation, DonationStatus
from app.models.event import Event, EventStatus
from app.models.event_runner import EventRunner
from app.models.organisation import KycStatus, Organisation

router = APIRouter(prefix="/stats", tags=["stats"])


class PublicStats(BaseModel):
    total_raised: Decimal
    total_distance_km: Decimal
    total_runners: int
    total_donors: int
    total_events: int
    active_events: int
    total_organisations: int

    raised_this_month: Decimal
    raised_this_week: Decimal
    new_runners_this_month: int
    donors_this_month: int


@router.get("/public", response_model=PublicStats)
async def public_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PublicStats:
    """Aggregate stats for the public landing page."""
    now = datetime.now(UTC)
    month_start = now.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    week_start = now - timedelta(days=7)

    captured_or_settled = (
        DonationStatus.CAPTURED,
        DonationStatus.SETTLED,
    )

    total_raised = (
        await db.execute(
            select(func.coalesce(func.sum(Donation.estimated_amount), 0)).where(
                Donation.status.in_(captured_or_settled)
            )
        )
    ).scalar_one()
    total_distance = (
        await db.execute(
            select(func.coalesce(func.sum(Event.total_distance_km), 0))
        )
    ).scalar_one()
    total_runners = (
        await db.execute(select(func.count(EventRunner.id)))
    ).scalar_one()
    total_donors = (
        await db.execute(select(func.count(Donation.id)))
    ).scalar_one()
    total_events = (await db.execute(select(func.count(Event.id)))).scalar_one()
    active_events = (
        await db.execute(
            select(func.count(Event.id)).where(Event.status == EventStatus.LIVE)
        )
    ).scalar_one()
    total_orgs = (
        await db.execute(
            select(func.count(Organisation.id)).where(
                Organisation.kyc_status == KycStatus.VERIFIED
            )
        )
    ).scalar_one()

    raised_month = (
        await db.execute(
            select(func.coalesce(func.sum(Donation.estimated_amount), 0)).where(
                Donation.status.in_(captured_or_settled),
                Donation.created_at >= month_start,
            )
        )
    ).scalar_one()
    raised_week = (
        await db.execute(
            select(func.coalesce(func.sum(Donation.estimated_amount), 0)).where(
                Donation.status.in_(captured_or_settled),
                Donation.created_at >= week_start,
            )
        )
    ).scalar_one()
    runners_month = (
        await db.execute(
            select(func.count(EventRunner.id)).where(
                EventRunner.joined_at >= month_start
            )
        )
    ).scalar_one()
    donors_month = (
        await db.execute(
            select(func.count(Donation.id)).where(
                Donation.created_at >= month_start
            )
        )
    ).scalar_one()

    return PublicStats(
        total_raised=total_raised,
        total_distance_km=total_distance,
        total_runners=int(total_runners),
        total_donors=int(total_donors),
        total_events=int(total_events),
        active_events=int(active_events),
        total_organisations=int(total_orgs),
        raised_this_month=raised_month,
        raised_this_week=raised_week,
        new_runners_this_month=int(runners_month),
        donors_this_month=int(donors_month),
    )
