"""Public live activity feed — real recent platform events."""
from datetime import datetime
from typing import Annotated, Literal
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.distance_log import DistanceLog, DistanceStatus
from app.models.donation import Donation, DonationStatus
from app.models.event_runner import EventRunner
from app.models.organisation import KycStatus, Organisation
from app.models.payout import Payout, PayoutStatus

router = APIRouter(prefix="/audit-feed", tags=["audit-feed"])


class FeedItem(BaseModel):
    id: str
    type: Literal["donation", "distance", "payout", "verified"]
    text: str
    amount: str | None = None
    timestamp: datetime


@router.get("/public", response_model=list[FeedItem])
async def public_feed(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 8,
) -> list[FeedItem]:
    """Recent platform activity for the landing-page audit feed."""
    items: list[FeedItem] = []

    # Recent donations
    don_result = await db.execute(
        select(Donation)
        .where(Donation.status.in_((DonationStatus.CAPTURED, DonationStatus.SETTLED)))
        .options(selectinload(Donation.event_runner).selectinload(EventRunner.user))
        .order_by(Donation.created_at.desc())
        .limit(limit)
    )
    for d in don_result.scalars().all():
        donor = "Anonymous" if d.is_anonymous else d.donor_name.split(" ")[0]
        runner = (
            d.event_runner.user.full_name.split(" ")[0]
            if d.event_runner and d.event_runner.user
            else "a runner"
        )
        items.append(
            FeedItem(
                id=f"d-{d.id}",
                type="donation",
                text=f"{donor} sponsored {runner}",
                amount=f"₹{int(d.estimated_amount):,}".replace(",", ","),
                timestamp=d.created_at,
            )
        )

    # Recent distance approvals
    dl_result = await db.execute(
        select(DistanceLog)
        .where(DistanceLog.status == DistanceStatus.APPROVED)
        .options(selectinload(DistanceLog.event_runner).selectinload(EventRunner.user))
        .order_by(DistanceLog.reviewed_at.desc().nullslast())
        .limit(limit)
    )
    for log in dl_result.scalars().all():
        runner = (
            log.event_runner.user.full_name.split(" ")[0]
            if log.event_runner and log.event_runner.user
            else "A runner"
        )
        items.append(
            FeedItem(
                id=f"l-{log.id}",
                type="distance",
                text=f"{runner} logged {log.distance_km} km via {log.proof_source.value.replace('_', ' ')}",
                amount=f"{log.distance_km} km",
                timestamp=log.reviewed_at or log.created_at,
            )
        )

    # Recent payouts
    po_result = await db.execute(
        select(Payout)
        .where(Payout.status == PayoutStatus.COMPLETED)
        .options(selectinload(Payout.organisation))
        .order_by(Payout.created_at.desc())
        .limit(limit)
    )
    for p in po_result.scalars().all():
        org_name = p.organisation.name if p.organisation else "an NGO"
        items.append(
            FeedItem(
                id=f"p-{p.id}",
                type="payout",
                text=f"Released to {org_name}",
                amount=f"₹{int(p.net_amount):,}",
                timestamp=p.processed_at or p.created_at,
            )
        )

    # Recent verified orgs
    org_result = await db.execute(
        select(Organisation)
        .where(Organisation.kyc_status == KycStatus.VERIFIED)
        .order_by(Organisation.kyc_verified_at.desc().nullslast())
        .limit(3)
    )
    for org in org_result.scalars().all():
        items.append(
            FeedItem(
                id=f"o-{org.id}",
                type="verified",
                text=f"{org.name} passed KYC verification",
                timestamp=org.kyc_verified_at or org.created_at,
            )
        )

    items.sort(key=lambda i: i.timestamp, reverse=True)
    return items[:limit]
