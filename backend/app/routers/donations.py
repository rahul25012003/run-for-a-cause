"""Donation endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user_optional
from app.models.donation import Donation, DonationStatus
from app.models.event_runner import EventRunner
from app.models.user import User
from app.schemas.donation import (
    DonationCreate,
    DonationCreateResponse,
    DonationDetail,
    DonationPublic,
)
from app.services.donation_service import create_pledge
from app.services.payment_service import create_razorpay_order

router = APIRouter(prefix="/donations", tags=["donations"])


@router.post(
    "",
    response_model=DonationCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_donation(
    payload: DonationCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> DonationCreateResponse:
    """Create a donation pledge and return a Razorpay order to complete payment."""
    try:
        donation = await create_pledge(payload, donor=user, db=db, request=request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    order = create_razorpay_order(donation.id, donation.estimated_amount)
    donation.razorpay_order_id = order["id"]
    donation.status = DonationStatus.PLEDGED
    await db.commit()
    await db.refresh(donation)

    return DonationCreateResponse(
        donation=DonationDetail.model_validate(donation),
        razorpay_order=order,
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
    )


@router.get("/by-runner/{event_runner_id}", response_model=list[DonationPublic])
async def list_runner_donations(
    event_runner_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DonationPublic]:
    """Public donor list for a runner's profile page (PII redacted)."""
    result = await db.execute(
        select(Donation)
        .where(
            Donation.event_runner_id == event_runner_id,
            Donation.status.in_(
                (DonationStatus.CAPTURED, DonationStatus.SETTLED)
            ),
        )
        .order_by(Donation.created_at.desc())
    )
    donations = result.scalars().all()
    out: list[DonationPublic] = []
    for d in donations:
        public = DonationPublic.model_validate(d)
        if d.is_anonymous:
            public.donor_name = "Anonymous"
        out.append(public)
    return out


@router.get(
    "/by-event/{event_id}",
    response_model=list[DonationPublic],
)
async def list_event_donations(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
) -> list[DonationPublic]:
    """Public donor wall for an event — most recent successful donations,
    with anonymous donors and PII redacted."""
    result = await db.execute(
        select(Donation)
        .where(
            Donation.event_id == event_id,
            Donation.status.in_(
                (DonationStatus.CAPTURED, DonationStatus.SETTLED)
            ),
        )
        .order_by(Donation.created_at.desc())
        .limit(min(limit, 200))
    )
    donations = result.scalars().all()
    out: list[DonationPublic] = []
    for d in donations:
        public = DonationPublic.model_validate(d)
        if d.is_anonymous:
            public.donor_name = "Anonymous"
        out.append(public)
    return out


@router.get("/{donation_id}", response_model=DonationDetail)
async def get_donation(
    donation_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DonationDetail:
    """Fetch a donation by ID — used post-payment for the success page."""
    result = await db.execute(select(Donation).where(Donation.id == donation_id))
    donation = result.scalar_one_or_none()
    if not donation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return DonationDetail.model_validate(donation)
