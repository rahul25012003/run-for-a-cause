"""Donation business logic — creating pledges and computing settlement."""
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.donation import Donation, DonationStatus, DonationType
from app.models.event import Event
from app.models.event_runner import EventRunner
from app.models.organisation import Organisation
from app.models.user import User
from app.schemas.donation import DonationCreate
from app.services.audit_service import log_action


def _ip_from_request(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _estimate_amount(payload: DonationCreate, runner: EventRunner) -> Decimal:
    """Estimate the amount this donation will collect at capture time."""
    if payload.donation_type == DonationType.FIXED:
        return payload.fixed_amount or Decimal("0")
    target_km = runner.personal_goal_km or Decimal("10")
    estimate = (payload.amount_per_km or Decimal("0")) * target_km
    cap = payload.max_cap_amount or estimate
    return min(estimate, cap)


def _platform_fee(amount: Decimal, fee_pct: Decimal) -> Decimal:
    return (amount * fee_pct / Decimal("100")).quantize(Decimal("0.01"))


async def create_pledge(
    payload: DonationCreate,
    donor: User | None,
    db: AsyncSession,
    request: Request | None = None,
) -> Donation:
    """Create a donation in INITIATED status; payment service builds the order."""
    er_result = await db.execute(
        select(EventRunner)
        .where(EventRunner.id == payload.event_runner_id)
    )
    er = er_result.scalar_one_or_none()
    if not er:
        raise ValueError("Runner not found")

    event_result = await db.execute(select(Event).where(Event.id == er.event_id))
    event = event_result.scalar_one()

    org_result = await db.execute(
        select(Organisation).where(Organisation.id == event.organisation_id)
    )
    org = org_result.scalar_one()

    estimated = _estimate_amount(payload, er)
    fee = _platform_fee(estimated, event.platform_fee_pct)

    donation = Donation(
        event_runner_id=er.id,
        event_id=event.id,
        donor_user_id=donor.id if donor else None,
        donor_name=payload.donor_name,
        donor_email=payload.donor_email,
        donor_phone=payload.donor_phone,
        donor_pan=payload.donor_pan,
        is_anonymous=payload.is_anonymous,
        donation_type=payload.donation_type,
        amount_per_km=payload.amount_per_km,
        fixed_amount=payload.fixed_amount,
        max_cap_amount=payload.max_cap_amount,
        estimated_amount=estimated,
        platform_fee=fee,
        net_to_cause=estimated - fee,
        is_80g_eligible=org.is_80g_eligible,
        message=payload.message,
        status=DonationStatus.INITIATED,
        ip_address=_ip_from_request(request),
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(donation)
    await db.flush()
    await log_action(
        db,
        entity_type="donation",
        entity_id=donation.id,
        action="donation.initiated",
        actor=donor,
        metadata={"estimated_amount": str(estimated)},
        request=request,
    )
    return donation


async def serialise_for_response(donation: Donation) -> dict[str, Any]:
    """Coerce a donation into a JSON-friendly dict."""
    return {
        "id": str(donation.id),
        "status": donation.status.value,
        "estimated_amount": str(donation.estimated_amount),
    }
