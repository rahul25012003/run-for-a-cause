"""Generate per-runner participation certificates."""
from __future__ import annotations

import secrets
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event import Event
from app.models.event_runner import EventRunner
from app.utils.logger import get_logger
from app.utils.pdf_generator import generate_certificate_pdf

logger = get_logger(__name__)


def _make_certificate_number(event_runner_id: UUID) -> str:
    yr = datetime.now(UTC).year
    return f"RFAC-CERT-{yr}-{secrets.token_hex(4).upper()}-{event_runner_id.hex[:6].upper()}"


async def generate_for_event_runner(
    event_runner_id: UUID,
    db: AsyncSession,
) -> Path:
    """Build a certificate PDF for an EventRunner. Returns local file path."""
    result = await db.execute(
        select(EventRunner)
        .where(EventRunner.id == event_runner_id)
        .options(
            selectinload(EventRunner.user),
            selectinload(EventRunner.event).selectinload(Event.organisation),
        )
    )
    er = result.scalar_one_or_none()
    if not er:
        raise ValueError("Runner participation not found")

    certificate_number = _make_certificate_number(er.id)
    path = generate_certificate_pdf(
        certificate_number=certificate_number,
        runner_name=er.user.full_name,
        event_title=er.event.title,
        cause_summary=er.event.cause_summary,
        organisation_name=er.event.organisation.name,
        distance_km=er.distance_completed_km,
        amount_raised=er.amount_raised,
        issued_at=datetime.now(UTC),
    )
    logger.info(
        "certificate_generated",
        event_runner_id=str(er.id),
        number=certificate_number,
        path=str(path),
    )
    return path
