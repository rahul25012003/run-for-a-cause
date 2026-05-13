"""Settlement engine — closes events and computes final donation amounts."""
from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.donation import Donation, DonationStatus, DonationType
from app.models.event import Event, EventStatus
from app.models.event_runner import EventRunner
from app.models.payout import Payout, PayoutStatus
from app.models.user import User
from app.services.audit_service import log_action
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _quantise(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"))


def _final_amount_for_pledge(donation: Donation, runner: EventRunner) -> Decimal:
    """Compute the final amount a per-km pledge should be charged for."""
    if donation.donation_type == DonationType.FIXED:
        return donation.fixed_amount or Decimal("0")
    rate = donation.amount_per_km or Decimal("0")
    cap = donation.max_cap_amount or (rate * (runner.personal_goal_km or Decimal("0")))
    actual = rate * runner.distance_completed_km
    return _quantise(min(actual, cap))


async def close_event(
    event_id: UUID,
    actor: User,
    db: AsyncSession,
) -> dict[str, Any]:
    """Move an event into the SETTLING state and finalise per-km donation amounts.

    For per-km donations whose final amount is less than already-captured
    estimated_amount, mark the difference for refund (real refund call to
    Razorpay would happen via async task — here we record the intent).
    """
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise ValueError("Event not found")
    if event.status not in (EventStatus.LIVE, EventStatus.DISTANCE_LOCK):
        raise ValueError(
            f"Event in status {event.status.value} cannot be closed. "
            "Only LIVE or DISTANCE_LOCK events may be closed."
        )

    event.status = EventStatus.SETTLING

    runners_result = await db.execute(
        select(EventRunner).where(EventRunner.event_id == event_id)
    )
    runners = {r.id: r for r in runners_result.scalars().all()}

    donations_result = await db.execute(
        select(Donation).where(
            Donation.event_id == event_id,
            Donation.status.in_(
                (DonationStatus.CAPTURED, DonationStatus.PLEDGED)
            ),
        )
    )

    total_settled = Decimal("0")
    total_refunded = Decimal("0")
    refund_intents: list[dict[str, Any]] = []

    for donation in donations_result.scalars().all():
        runner = runners.get(donation.event_runner_id)
        if runner is None:
            continue
        final = _final_amount_for_pledge(donation, runner)
        donation.final_amount = final
        already_captured = donation.estimated_amount or Decimal("0")
        if final < already_captured:
            diff = _quantise(already_captured - final)
            donation.refunded_amount = diff
            donation.status = DonationStatus.PARTIALLY_REFUNDED
            refund_intents.append(
                {
                    "donation_id": str(donation.id),
                    "donor_email": donation.donor_email,
                    "amount": str(diff),
                }
            )
            total_refunded += diff
        else:
            donation.status = DonationStatus.SETTLED
        total_settled += final

    event.total_raised = _quantise(total_settled)
    event.status = EventStatus.SETTLED

    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.settled",
        actor=actor,
        metadata={
            "total_settled": str(total_settled),
            "total_refunded": str(total_refunded),
            "refund_count": len(refund_intents),
        },
    )
    await db.commit()
    logger.info(
        "event_settled",
        event_id=str(event.id),
        total=str(total_settled),
        refunds=len(refund_intents),
    )
    return {
        "event_id": str(event.id),
        "status": event.status.value,
        "total_settled": str(total_settled),
        "total_refunded": str(total_refunded),
        "refund_intents": refund_intents,
    }


async def create_payout_from_settled_event(
    event_id: UUID,
    actor: User,
    db: AsyncSession,
) -> Payout:
    """After settlement, build a payout record reflecting net amount to NGO."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise ValueError("Event not found")
    if event.status != EventStatus.SETTLED:
        raise ValueError("Event must be SETTLED before creating a payout")

    gross = event.total_raised
    fee = _quantise(gross * event.platform_fee_pct / Decimal("100"))
    gateway = _quantise(gross * Decimal("0.02"))  # ~2% Razorpay fee est
    net = _quantise(gross - fee - gateway)

    payout = Payout(
        event_id=event.id,
        organisation_id=event.organisation_id,
        gross_amount=gross,
        platform_fee=fee,
        gateway_fee=gateway,
        net_amount=net,
        status=PayoutStatus.APPROVED,
        initiated_by=actor.id,
        approved_by=actor.id,
        approved_at=datetime.now(UTC),
    )
    db.add(payout)
    await db.flush()
    await log_action(
        db,
        entity_type="payout",
        entity_id=payout.id,
        action="payout.created_post_settlement",
        actor=actor,
        metadata={"net": str(net), "gross": str(gross)},
    )
    await db.commit()
    await db.refresh(payout)
    return payout
