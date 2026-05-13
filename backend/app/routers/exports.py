"""CSV exports for event managers — donations + runners.

Critical for NGO accounting: managers download a CSV of every donation (or
runner) for an event so they can reconcile against their books, run cohort
analysis, or share with auditors. PII is included because the manager is the
data controller for their own organisation's events.
"""
import csv
import io
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_manager
from app.models.donation import Donation
from app.models.event import Event
from app.models.event_runner import EventRunner
from app.models.user import User, UserRole

router = APIRouter(prefix="/events", tags=["exports"])


async def _resolve_event_for_manager(
    event_id: UUID,
    user: User,
    db: AsyncSession,
) -> Event:
    res = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if (
        user.role != UserRole.SUPER_ADMIN
        and event.organisation.user_id != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the hosting organisation can export this event.",
        )
    return event


def _csv_stream(rows: list[list[str]]) -> StreamingResponse:
    """Generator-based streaming CSV — keeps memory flat even on huge events."""

    def gen() -> bytes:  # type: ignore[misc]
        buf = io.StringIO()
        writer = csv.writer(buf)
        for row in rows:
            writer.writerow(row)
            yield buf.getvalue().encode("utf-8")
            buf.seek(0)
            buf.truncate(0)

    return StreamingResponse(gen(), media_type="text/csv; charset=utf-8")


def _filename(prefix: str, event_slug: str) -> str:
    date = datetime.now(UTC).strftime("%Y-%m-%d")
    return f'attachment; filename="{prefix}-{event_slug}-{date}.csv"'


@router.get("/{event_id}/exports/donations.csv")
async def export_donations_csv(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """CSV of every donation against an event. Manager-scoped."""
    event = await _resolve_event_for_manager(event_id, user, db)

    res = await db.execute(
        select(Donation)
        .where(Donation.event_id == event_id)
        .options(selectinload(Donation.event_runner).selectinload(EventRunner.user))
        .order_by(Donation.created_at.desc())
    )

    rows: list[list[str]] = [
        [
            "donation_id",
            "created_at",
            "donor_name",
            "donor_email",
            "donor_phone",
            "donor_pan",
            "is_anonymous",
            "runner_name",
            "runner_slug",
            "donation_type",
            "amount_per_km",
            "fixed_amount",
            "estimated_amount",
            "final_amount",
            "platform_fee",
            "gateway_fee",
            "net_to_cause",
            "status",
            "razorpay_payment_id",
            "is_80g_eligible",
            "tax_receipt_number",
            "tax_receipt_sent_at",
        ]
    ]

    for d in res.scalars().all():
        runner = d.event_runner.user.full_name if d.event_runner and d.event_runner.user else ""
        runner_slug = d.event_runner.public_slug if d.event_runner else ""
        rows.append(
            [
                str(d.id),
                d.created_at.isoformat() if d.created_at else "",
                "Anonymous" if d.is_anonymous else (d.donor_name or ""),
                "" if d.is_anonymous else (d.donor_email or ""),
                "" if d.is_anonymous else (d.donor_phone or ""),
                "" if d.is_anonymous else (d.donor_pan or ""),
                "yes" if d.is_anonymous else "no",
                runner,
                runner_slug,
                d.donation_type.value if d.donation_type else "",
                str(d.amount_per_km) if d.amount_per_km is not None else "",
                str(d.fixed_amount) if d.fixed_amount is not None else "",
                str(d.estimated_amount) if d.estimated_amount is not None else "0",
                str(d.final_amount) if d.final_amount is not None else "",
                str(d.platform_fee or 0),
                str(d.gateway_fee or 0),
                str(d.net_to_cause or 0),
                d.status.value if d.status else "",
                d.razorpay_payment_id or "",
                "yes" if d.is_80g_eligible else "no",
                d.tax_receipt_number or "",
                d.tax_receipt_sent_at.isoformat() if d.tax_receipt_sent_at else "",
            ]
        )

    response = _csv_stream(rows)
    response.headers["Content-Disposition"] = _filename("donations", event.slug)
    return response


@router.get("/{event_id}/exports/runners.csv")
async def export_runners_csv(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """CSV of every runner registered to an event."""
    event = await _resolve_event_for_manager(event_id, user, db)

    res = await db.execute(
        select(EventRunner)
        .where(EventRunner.event_id == event_id)
        .options(selectinload(EventRunner.user))
        .order_by(EventRunner.amount_raised.desc())
    )

    rows: list[list[str]] = [
        [
            "runner_id",
            "full_name",
            "email",
            "phone",
            "public_slug",
            "team_name",
            "status",
            "personal_goal_km",
            "personal_goal_amount",
            "distance_completed_km",
            "amount_raised",
            "donor_count",
            "joined_at",
        ]
    ]

    for er in res.scalars().all():
        u = er.user
        rows.append(
            [
                str(er.id),
                u.full_name if u else "",
                u.email if u else "",
                u.phone or "" if u else "",
                er.public_slug,
                er.team_name or "",
                er.status.value if er.status else "",
                str(er.personal_goal_km) if er.personal_goal_km is not None else "",
                str(er.personal_goal_amount) if er.personal_goal_amount is not None else "",
                str(er.distance_completed_km or 0),
                str(er.amount_raised or 0),
                str(er.donor_count or 0),
                er.joined_at.isoformat() if er.joined_at else "",
            ]
        )

    response = _csv_stream(rows)
    response.headers["Content-Disposition"] = _filename("runners", event.slug)
    return response


@router.get("/{event_id}/exports/analytics.pdf")
async def export_analytics_pdf(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """Landscape analytics PDF for board reports — totals + top runners +
    top donors."""
    from collections import Counter

    from app.models.donation import DonationStatus
    from app.utils.pdf_generator import generate_event_analytics_pdf

    event = await _resolve_event_for_manager(event_id, user, db)

    # Top runners by amount raised
    runner_res = await db.execute(
        select(EventRunner)
        .where(EventRunner.event_id == event_id)
        .options(selectinload(EventRunner.user))
        .order_by(EventRunner.amount_raised.desc())
        .limit(10)
    )
    top_runners = [
        {
            "name": (er.user.full_name if er.user else "—"),
            "slug": er.public_slug,
            "distance_km": float(er.distance_completed_km or 0),
            "amount": float(er.amount_raised or 0),
        }
        for er in runner_res.scalars().all()
    ]

    # Top donors — aggregate by name across captured donations
    donor_res = await db.execute(
        select(Donation)
        .where(Donation.event_id == event_id)
        .where(Donation.status.in_(
            (DonationStatus.CAPTURED, DonationStatus.SETTLED)
        ))
    )
    by_donor: Counter[str] = Counter()
    counts: Counter[str] = Counter()
    for d in donor_res.scalars().all():
        name = "Anonymous" if d.is_anonymous else (d.donor_name or "Anonymous")
        amt = float(d.final_amount or d.estimated_amount or 0)
        by_donor[name] += amt
        counts[name] += 1
    top_donors = [
        {"name": name, "amount": amt, "count": counts[name]}
        for name, amt in by_donor.most_common(10)
    ]

    totals = {
        "raised": float(event.total_raised or 0),
        "donations": sum(counts.values()),
        "donors": len(by_donor),
        "runners": event.total_runners or 0,
        "distance_km": float(event.total_distance_km or 0),
    }

    pdf_bytes = generate_event_analytics_pdf(
        event_title=event.title,
        organisation_name=event.organisation.name,
        period_label=f"As of {datetime.now(UTC).strftime('%d %b %Y')}",
        issued_at=datetime.now(UTC),
        totals=totals,
        top_runners=top_runners,
        top_donors=top_donors,
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="analytics-{event.slug}-'
                f"{datetime.now(UTC).strftime('%Y-%m-%d')}.pdf\""
            )
        },
    )
