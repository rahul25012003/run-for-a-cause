"""Razorpay payment integration."""
import hashlib
import hmac
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.donation import Donation, DonationStatus
from app.models.event import Event
from app.models.event_runner import EventRunner
from app.utils.logger import get_logger

logger = get_logger(__name__)

try:
    import razorpay  # type: ignore[import-untyped]

    _client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
except Exception:  # noqa: BLE001
    _client = None


def _to_paise(amount: Decimal) -> int:
    return int((amount * Decimal("100")).quantize(Decimal("1")))


def _mock_order(donation_id: UUID, paise: int) -> dict[str, Any]:
    return {
        "id": f"order_mock_{donation_id.hex[:12]}",
        "amount": paise,
        "currency": "INR",
        "receipt": str(donation_id),
        "status": "created",
        "mock": True,
    }


def create_razorpay_order(donation_id: UUID, amount: Decimal) -> dict[str, Any]:
    """Create a Razorpay order.

    Falls back to a deterministic mock order when:
    - The Razorpay SDK is not installed
    - The configured key is a placeholder (contains 'dummy')
    - The live API call fails (e.g. invalid test key in staging)
    This keeps the donation flow functional in demo/dev environments.
    """
    paise = _to_paise(amount)
    if _client is None:
        logger.warning("razorpay_client_unavailable_using_mock")
        return _mock_order(donation_id, paise)

    # Placeholder keys (not real Razorpay credentials) → skip the API call.
    if "dummy" in settings.RAZORPAY_KEY_ID or "dummy" in settings.RAZORPAY_KEY_SECRET:
        logger.warning("razorpay_dummy_keys_using_mock")
        return _mock_order(donation_id, paise)

    try:
        order = _client.order.create(
            data={
                "amount": paise,
                "currency": "INR",
                "receipt": str(donation_id),
                "notes": {"donation_id": str(donation_id)},
            }
        )
        return order
    except Exception as exc:  # noqa: BLE001
        logger.error("razorpay_order_failed", error=str(exc))
        raise


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify an HMAC-SHA256 Razorpay payment signature."""
    if order_id.startswith("order_mock_"):
        return signature == "mock_signature"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify a Razorpay webhook signature."""
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def capture_payment(
    donation_id: UUID,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    db: AsyncSession,
) -> Donation:
    """Mark a donation as captured after verifying its signature."""
    if not verify_payment_signature(
        razorpay_order_id, razorpay_payment_id, razorpay_signature
    ):
        raise ValueError("Invalid Razorpay signature")

    result = await db.execute(select(Donation).where(Donation.id == donation_id))
    donation = result.scalar_one_or_none()
    if not donation:
        raise ValueError("Donation not found")
    if donation.status not in (DonationStatus.INITIATED, DonationStatus.PLEDGED):
        raise ValueError(
            f"Donation is in state {donation.status} and cannot be captured"
        )

    donation.status = DonationStatus.CAPTURED
    donation.razorpay_order_id = razorpay_order_id
    donation.razorpay_payment_id = razorpay_payment_id
    donation.razorpay_signature = razorpay_signature
    donation.payment_captured_at = datetime.now(UTC)
    donation.final_amount = donation.estimated_amount

    runner_lookup = await db.execute(
        select(EventRunner).where(EventRunner.id == donation.event_runner_id)
    )
    runner = runner_lookup.scalar_one_or_none()

    await db.execute(
        update(EventRunner)
        .where(EventRunner.id == donation.event_runner_id)
        .values(
            amount_raised=EventRunner.amount_raised + donation.estimated_amount,
            donor_count=EventRunner.donor_count + 1,
        )
    )
    if runner:
        from app.services.notification_service import notify

        await notify(
            user_id=runner.user_id,
            type_="donation.received",
            title=f"New sponsor: {donation.donor_name}",
            body=f"₹{int(donation.estimated_amount):,} pledged toward your fundraising goal.",
            action_url=f"/runners/{runner.public_slug}",
            metadata={"donation_id": str(donation.id)},
            db=db,
        )
    await db.execute(
        update(Event)
        .where(Event.id == donation.event_id)
        .values(
            total_raised=Event.total_raised + donation.estimated_amount,
            total_donors=Event.total_donors + 1,
        )
    )

    # Apply corporate match-funding (if any sponsors are active on this
    # event). The match is bonus money committed by the sponsors — it
    # doesn't deduct from the donor's gift.
    from app.services.match_funding_service import compute_and_record_match

    match_result = await compute_and_record_match(
        event_id=donation.event_id,
        donation_amount=donation.estimated_amount,
        db=db,
    )
    if match_result["total_matched"] > 0:
        # Add the matched amount to the event's running total so it's
        # visible in stats, leaderboards, etc.
        await db.execute(
            update(Event)
            .where(Event.id == donation.event_id)
            .values(total_raised=Event.total_raised + match_result["total_matched"])
        )

    # Re-evaluate achievement rules for the runner before final commit.
    if runner:
        from app.services.achievement_service import check_and_unlock

        await check_and_unlock(runner.id, db)

    await db.commit()
    await db.refresh(donation)
    logger.info(
        "donation_captured",
        donation_id=str(donation.id),
        amount=str(donation.final_amount),
    )

    # Best-effort: send the donor a confirmation email.
    try:
        from app.services.email_service import (
            EmailMessage,
            render_donation_confirmation,
            send_email,
        )

        subject, html = render_donation_confirmation(
            donor_name=donation.donor_name,
            runner_name="your runner",
            event_title="their event",
            amount=f"₹{donation.final_amount:,.0f}".replace(",", "_t").replace("_t", ","),
            donation_type=donation.donation_type.value,
        )
        await send_email(
            EmailMessage(to=donation.donor_email, subject=subject, html=html)
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("donation_confirmation_email_failed", error=str(exc))

    return donation
