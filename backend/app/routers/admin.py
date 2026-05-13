"""Admin-only endpoints (dashboards, approvals)."""
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.donation import Donation, DonationStatus
from app.models.event import Event, EventStatus
from app.models.event_runner import EventRunner
from app.models.organisation import KycStatus, Organisation
from app.models.user import User
from app.schemas.analytics import CategoryCount, DailyDonation, PlatformStats
from app.schemas.donation import DonationDetail
from app.schemas.organisation import OrganisationDetail
from app.services.account_service import purge_expired_users
from app.utils.logger import get_logger

logger = get_logger(__name__)


CAPTURED_OR_SETTLED = (DonationStatus.CAPTURED, DonationStatus.SETTLED)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=PlatformStats)
async def platform_stats(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlatformStats:
    """Aggregate stats for the super-admin dashboard."""
    total_raised = (
        await db.execute(
            select(func.coalesce(func.sum(Donation.estimated_amount), 0)).where(
                Donation.status.in_(
                    (DonationStatus.CAPTURED, DonationStatus.SETTLED)
                )
            )
        )
    ).scalar_one()
    total_distance = (
        await db.execute(select(func.coalesce(func.sum(Event.total_distance_km), 0)))
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
        await db.execute(select(func.count(Organisation.id)))
    ).scalar_one()
    pending_kyc = (
        await db.execute(
            select(func.count(Organisation.id)).where(
                Organisation.kyc_status.in_(
                    (KycStatus.SUBMITTED, KycStatus.UNDER_REVIEW)
                )
            )
        )
    ).scalar_one()
    pending_events = (
        await db.execute(
            select(func.count(Event.id)).where(
                Event.status == EventStatus.PENDING_APPROVAL
            )
        )
    ).scalar_one()

    # ---- Real month-over-month + 30-day time-series ----
    now = datetime.now(UTC)
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # First day of last month — handles January correctly
    last_month_end = this_month_start - timedelta(seconds=1)
    last_month_start = last_month_end.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    raised_this_month = (
        await db.execute(
            select(func.coalesce(func.sum(Donation.estimated_amount), 0)).where(
                Donation.status.in_(CAPTURED_OR_SETTLED),
                Donation.created_at >= this_month_start,
            )
        )
    ).scalar_one()
    raised_last_month = (
        await db.execute(
            select(func.coalesce(func.sum(Donation.estimated_amount), 0)).where(
                Donation.status.in_(CAPTURED_OR_SETTLED),
                Donation.created_at >= last_month_start,
                Donation.created_at < this_month_start,
            )
        )
    ).scalar_one()

    if float(raised_last_month or 0) > 0:
        change_pct = round(
            (float(raised_this_month) - float(raised_last_month))
            / float(raised_last_month)
            * 100,
            1,
        )
    elif float(raised_this_month or 0) > 0:
        # Going from zero last month to non-zero this month — show as +100%
        # rather than a divide-by-zero infinity, which is what users mean
        # colloquially.
        change_pct = 100.0
    else:
        change_pct = 0.0

    # 30-day window — last 30 days INCLUDING today. Window is (today - 29) → today.
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    window_start = today_start - timedelta(days=29)
    daily_res = await db.execute(
        select(
            func.date_trunc("day", Donation.created_at).label("day"),
            func.coalesce(func.sum(Donation.estimated_amount), 0).label("raised"),
            func.count(Donation.id).label("count"),
        )
        .where(
            Donation.status.in_(CAPTURED_OR_SETTLED),
            Donation.created_at >= window_start,
        )
        .group_by("day")
        .order_by("day")
    )
    by_day_map: dict[str, tuple[Decimal, int]] = {}
    for row in daily_res.all():
        if row.day:
            key = row.day.strftime("%Y-%m-%d")
            by_day_map[key] = (row.raised or Decimal("0"), int(row.count or 0))

    daily: list[DailyDonation] = []
    for i in range(30):
        d = window_start + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        amount, count = by_day_map.get(key, (Decimal("0"), 0))
        daily.append(
            DailyDonation(
                day=d.strftime("%d %b"),
                raised=amount,
                count=count,
            )
        )

    # Per-category event count (exclude cancelled/archived)
    cat_res = await db.execute(
        select(Event.cause_category, func.count(Event.id).label("n"))
        .where(Event.status.notin_([EventStatus.CANCELLED, EventStatus.ARCHIVED]))
        .group_by(Event.cause_category)
        .order_by(func.count(Event.id).desc())
    )
    category_breakdown = [
        CategoryCount(
            name=row.cause_category.replace("_", " ").title(),
            value=int(row.n),
        )
        for row in cat_res.all()
        if row.cause_category
    ]

    return PlatformStats(
        total_raised=total_raised,
        total_distance_km=total_distance,
        total_runners=total_runners,
        total_donors=total_donors,
        total_events=total_events,
        active_events=active_events,
        total_organisations=total_orgs,
        pending_kyc=pending_kyc,
        pending_event_approvals=pending_events,
        raised_this_month=raised_this_month,
        raised_last_month=raised_last_month,
        raised_change_pct=change_pct,
        daily_donations=daily,
        category_breakdown=category_breakdown,
    )


@router.get("/donations", response_model=list[DonationDetail])
async def list_all_donations(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 200,
) -> list[DonationDetail]:
    """Admin: list every donation, newest first."""
    result = await db.execute(
        select(Donation)
        .order_by(Donation.created_at.desc())
        .limit(limit)
    )
    return [DonationDetail.model_validate(d) for d in result.scalars().all()]


@router.get(
    "/organisations/pending-kyc",
    response_model=list[OrganisationDetail],
)
async def pending_kyc_queue(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[OrganisationDetail]:
    """List organisations awaiting KYC review."""
    result = await db.execute(
        select(Organisation)
        .where(
            Organisation.kyc_status.in_(
                (KycStatus.SUBMITTED, KycStatus.UNDER_REVIEW, KycStatus.PENDING)
            )
        )
        .order_by(Organisation.created_at.asc())
    )
    return [OrganisationDetail.model_validate(o) for o in result.scalars().all()]


@router.post("/dpdp/purge")
async def trigger_dpdp_purge(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Hard-purge soft-deleted users whose 30-day grace has elapsed.

    Wire this to a cron / managed scheduler in production:
        # Linux cron (daily 04:00):
        0 4 * * * curl -X POST -b "access_token=$ADMIN_TOKEN" \\
            https://api.runforacause.in/api/v1/admin/dpdp/purge

    Or call directly from APScheduler / Celery beat / cloud scheduler.
    """
    result = await purge_expired_users(db)
    logger.info(
        "dpdp_hard_purge_executed",
        actor=str(admin.id),
        **result,
    )
    return result
