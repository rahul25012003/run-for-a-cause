"""Compute and record corporate match-funding on donation captures.

Called from payment_service after each donation is captured. Iterates the
event's active sponsors in order of largest cap, computing how much each
contributes for THIS donation, ratcheting their `total_matched` field.

The matched amount is ADDITIONAL money the sponsor commits — it does not
deduct from the donor's donation. The donor sees "Your ₹500 was matched
by ₹500 from Acme Corp = ₹1,000 total impact".
"""
from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.corporate_sponsor import CorporateSponsor, SponsorMatchType
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def compute_and_record_match(
    *,
    event_id: UUID,
    donation_amount: Decimal,
    db: AsyncSession,
) -> dict:
    """Apply every active sponsor for `event_id` to a donation of
    `donation_amount` and return a summary.

    Each sponsor's matched contribution = donation_amount × (multiplier - 1),
    capped by the sponsor's remaining cap. Sponsors are processed in order
    of largest remaining cap first so the donation gets maximum coverage.

    Mutates each sponsor's total_matched. Caller is responsible for
    committing the surrounding transaction.

    Returns: {
        total_matched: total bonus across all sponsors,
        per_sponsor: [{sponsor_id, name, matched}],
    }
    """
    res = await db.execute(
        select(CorporateSponsor)
        .where(
            CorporateSponsor.event_id == event_id,
            CorporateSponsor.is_active.is_(True),
        )
        .order_by((CorporateSponsor.cap_amount - CorporateSponsor.total_matched).desc())
    )
    sponsors = list(res.scalars().all())
    if not sponsors:
        return {"total_matched": Decimal("0"), "per_sponsor": []}

    now = datetime.now(UTC)
    total_matched = Decimal("0")
    per_sponsor: list[dict] = []
    for sponsor in sponsors:
        # Honor time-boxed campaign windows (D3).
        if sponsor.starts_at and now < sponsor.starts_at:
            continue
        if sponsor.ends_at and now > sponsor.ends_at:
            continue
        remaining = (sponsor.cap_amount or Decimal("0")) - (
            sponsor.total_matched or Decimal("0")
        )
        if remaining <= 0:
            continue
        # match_type determines how match_value applies:
        #   multiply   → donation × (match_value − 1)   [legacy: same as old multiplier path]
        #   fixed_add  → match_value rupees added per donation
        #   percentage → donation × (match_value / 100)
        if sponsor.match_type == SponsorMatchType.FIXED_ADD:
            contribution = sponsor.match_value
        elif sponsor.match_type == SponsorMatchType.PERCENTAGE:
            contribution = donation_amount * (sponsor.match_value / Decimal("100"))
        else:
            # MULTIPLY (default) — keep the legacy multiplier path for older rows.
            mv = sponsor.match_value if sponsor.match_value else sponsor.multiplier
            contribution = donation_amount * (mv - Decimal("1"))
        contribution = min(contribution, remaining)
        if contribution <= 0:
            continue
        sponsor.total_matched = (sponsor.total_matched or Decimal("0")) + contribution
        total_matched += contribution
        per_sponsor.append(
            {
                "sponsor_id": str(sponsor.id),
                "name": sponsor.name,
                "matched": str(contribution),
            }
        )
        logger.info(
            "match_recorded",
            event_id=str(event_id),
            sponsor=sponsor.name,
            donation=str(donation_amount),
            matched=str(contribution),
            sponsor_remaining=str(sponsor.cap_amount - sponsor.total_matched),
        )

    return {"total_matched": total_matched, "per_sponsor": per_sponsor}
