"""QR check-in for in-person events.

Flow:
  1. Runner views their public profile → page shows a QR encoding
     `{frontend_url}/checkin/{event_runner_id}`.
  2. Manager opens `/manager/events/{id}/checkin` (camera scanner page),
     decodes the URL, and sends a POST to this endpoint with the runner_id.
  3. Endpoint sets `event_runners.checked_in_at = now()` (idempotent — calling
     it again returns the same timestamp).

No secrets in the QR — possession of the runner's slug is not sensitive
(slugs are already publicly visible). The check-in happens server-side
under a manager guard, so an attacker scanning a QR can't fake a check-in.
"""
import io
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings

from app.database import get_db
from app.dependencies import require_manager
from app.models.event import Event
from app.models.event_runner import EventRunner
from app.models.user import User, UserRole
from app.schemas.common import ORMBase
from app.services.audit_service import log_action

router = APIRouter(tags=["check-in"])


class CheckInResult(ORMBase):
    event_runner_id: UUID
    runner_name: str
    runner_slug: str
    checked_in_at: datetime
    was_already_checked_in: bool


@router.post(
    "/event-runners/{event_runner_id}/checkin",
    response_model=CheckInResult,
)
async def check_in_runner(
    event_runner_id: UUID,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CheckInResult:
    """Manager marks a runner as physically present at an in-person event."""
    res = await db.execute(
        select(EventRunner)
        .where(EventRunner.id == event_runner_id)
        .options(
            selectinload(EventRunner.event).selectinload(Event.organisation),
            selectinload(EventRunner.user),
        )
    )
    er = res.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # Manager must own the event (super_admin can override).
    if (
        user.role != UserRole.SUPER_ADMIN
        and er.event.organisation.user_id != user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    was_checked_in = er.checked_in_at is not None
    if not was_checked_in:
        er.checked_in_at = datetime.now(UTC)
        await log_action(
            db,
            entity_type="event_runner",
            entity_id=er.id,
            action="event_runner.checked_in",
            actor=user,
            request=request,
        )
        await db.commit()

    return CheckInResult(
        event_runner_id=er.id,
        runner_name=er.user.full_name,
        runner_slug=er.public_slug,
        checked_in_at=er.checked_in_at,
        was_already_checked_in=was_checked_in,
    )


@router.get(
    "/event-runners/{event_runner_id}/qr.svg",
    response_class=Response,
)
async def runner_qr(
    event_runner_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """SVG QR code that encodes the check-in URL for this runner.

    Public — anyone can fetch it (the QR resolves to a URL only managers
    can act on). Cached for 5 minutes.
    """
    res = await db.execute(
        select(EventRunner).where(EventRunner.id == event_runner_id)
    )
    er = res.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    frontend = settings.FRONTEND_URL.rstrip("/")
    target = f"{frontend}/checkin/{er.id}"

    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(target, image_factory=factory, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=300"},
    )
