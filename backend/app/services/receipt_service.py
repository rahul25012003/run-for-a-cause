"""Issue 80G receipts and dispatch them to the donor."""
from __future__ import annotations

import secrets
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.donation import Donation, DonationStatus
from app.models.event import Event
from app.models.organisation import Organisation
from app.services.email_service import (
    EmailMessage,
    render_tax_receipt_email,
    send_email,
)
from app.utils.logger import get_logger
from app.utils.pdf_generator import generate_80g_receipt_pdf

logger = get_logger(__name__)


def _make_receipt_number() -> str:
    yr = datetime.now(UTC).year
    return f"RFAC-{yr}-{secrets.token_hex(4).upper()}"


async def issue_receipt_for_donation(
    donation_id: UUID,
    db: AsyncSession,
) -> Donation:
    """Generate a PDF receipt for an eligible donation and email it."""
    result = await db.execute(
        select(Donation)
        .where(Donation.id == donation_id)
        .options(
            selectinload(Donation.event).selectinload(Event.organisation),
        )
    )
    donation = result.scalar_one_or_none()
    if not donation:
        raise ValueError("Donation not found")
    if donation.status not in (DonationStatus.CAPTURED, DonationStatus.SETTLED):
        raise ValueError(
            f"Donation is in state {donation.status.value}; cannot issue receipt yet"
        )
    if not donation.is_80g_eligible:
        raise ValueError("Donation is not 80G eligible")

    if donation.tax_receipt_url and donation.tax_receipt_number:
        return donation

    org: Organisation = donation.event.organisation
    receipt_number = _make_receipt_number()
    issued_at = datetime.now(UTC)

    pdf_path: Path = generate_80g_receipt_pdf(
        receipt_number=receipt_number,
        donation_id=donation.id,
        donor_name=donation.donor_name,
        donor_email=donation.donor_email,
        donor_pan=donation.donor_pan,
        donor_address=None,
        amount_inr=donation.final_amount or donation.estimated_amount,
        payment_method=donation.payment_method,
        payment_id=donation.razorpay_payment_id,
        issued_at=issued_at,
        organisation_name=org.name,
        organisation_address=None,
        organisation_pan=org.pan_number,
        organisation_80g=org.reg_80g_number,
    )

    donation.tax_receipt_number = receipt_number
    donation.tax_receipt_url = str(pdf_path)
    donation.tax_receipt_sent_at = issued_at

    subject, html = render_tax_receipt_email(
        donor_name=donation.donor_name,
        organisation_name=org.name,
        receipt_number=receipt_number,
    )
    try:
        with pdf_path.open("rb") as fh:
            attach_bytes = fh.read()
        await send_email(
            EmailMessage(
                to=donation.donor_email,
                subject=subject,
                html=html,
                attachments=[
                    (f"{receipt_number}.pdf", attach_bytes, "application/pdf"),
                ],
            )
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("receipt_email_failed", error=str(exc))

    await db.commit()
    await db.refresh(donation)
    logger.info(
        "receipt_issued",
        donation_id=str(donation.id),
        number=receipt_number,
        path=str(pdf_path),
    )
    return donation
