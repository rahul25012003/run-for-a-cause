"""Distance log endpoints — submit, review, approve."""
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.distance_log import DistanceLog, DistanceStatus
from app.models.event import Event
from app.models.event_runner import EventRunner
from app.models.user import User, UserRole
from app.schemas.distance_log import (
    DistanceLogCreate,
    DistanceLogPublic,
    DistanceLogReview,
    DistanceLogReviewItem,
)
from app.models.organisation import Organisation
from app.services.audit_service import log_action


async def _require_event_ownership(event_id: UUID, user: User, db: AsyncSession) -> Event:
    """Load the event and verify the manager owns it. Super-admin bypasses."""
    ev_res = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.organisation))
    )
    ev = ev_res.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if user.role != UserRole.SUPER_ADMIN and ev.organisation.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage distance logs for your own events",
        )
    return ev

router = APIRouter(prefix="/distance-logs", tags=["distance-logs"])


@router.post(
    "",
    response_model=DistanceLogPublic,
    status_code=status.HTTP_201_CREATED,
)
async def submit_distance(
    payload: DistanceLogCreate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DistanceLogPublic:
    """Runner submits a distance entry for review."""
    er_result = await db.execute(
        select(EventRunner).where(EventRunner.id == payload.event_runner_id)
    )
    er = er_result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Runner not found")
    if er.user_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    if payload.activity_date > datetime.now(UTC).date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="activity_date cannot be in the future",
        )

    log = DistanceLog(
        event_runner_id=payload.event_runner_id,
        distance_km=payload.distance_km,
        activity_date=payload.activity_date,
        proof_url=payload.proof_url,
        proof_source=payload.proof_source,
        notes=payload.notes,
        status=DistanceStatus.SUBMITTED,
    )
    db.add(log)
    await db.flush()
    await log_action(
        db,
        entity_type="distance_log",
        entity_id=log.id,
        action="distance_log.submitted",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(log)
    return DistanceLogPublic.model_validate(log)


@router.get("/by-runner/{event_runner_id}", response_model=list[DistanceLogPublic])
async def list_runner_distance_logs(
    event_runner_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DistanceLogPublic]:
    """List a runner's distance logs (public, no auth required)."""
    result = await db.execute(
        select(DistanceLog)
        .where(DistanceLog.event_runner_id == event_runner_id)
        .order_by(DistanceLog.activity_date.desc())
    )
    return [DistanceLogPublic.model_validate(d) for d in result.scalars().all()]


@router.get("/pending/by-event/{event_id}", response_model=list[DistanceLogPublic])
async def list_pending_for_event(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DistanceLogPublic]:
    """Manager: pending distance logs for an event (basic fields)."""
    await _require_event_ownership(event_id, user, db)
    result = await db.execute(
        select(DistanceLog)
        .join(EventRunner, EventRunner.id == DistanceLog.event_runner_id)
        .where(
            EventRunner.event_id == event_id,
            DistanceLog.status.in_(
                (DistanceStatus.SUBMITTED, DistanceStatus.UNDER_REVIEW)
            ),
        )
        .order_by(DistanceLog.created_at.asc())
    )
    return [DistanceLogPublic.model_validate(d) for d in result.scalars().all()]


@router.get(
    "/queue/by-event/{event_id}",
    response_model=list[DistanceLogReviewItem],
)
async def list_queue_for_event(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
    include_reviewed: bool = False,
) -> list[DistanceLogReviewItem]:
    """Manager: pending distance logs enriched with runner name + slug.

    Set `include_reviewed=true` to also return approved/rejected entries
    (useful for the historical view tab).
    """
    await _require_event_ownership(event_id, user, db)
    stmt = (
        select(DistanceLog)
        .join(EventRunner, EventRunner.id == DistanceLog.event_runner_id)
        .options(selectinload(DistanceLog.event_runner).selectinload(EventRunner.user))
        .where(EventRunner.event_id == event_id)
    )
    if not include_reviewed:
        stmt = stmt.where(
            DistanceLog.status.in_(
                (DistanceStatus.SUBMITTED, DistanceStatus.UNDER_REVIEW)
            )
        )
    stmt = stmt.order_by(DistanceLog.created_at.desc())
    result = await db.execute(stmt)

    items: list[DistanceLogReviewItem] = []
    for log in result.scalars().all():
        items.append(
            DistanceLogReviewItem(
                id=log.id,
                event_runner_id=log.event_runner_id,
                runner_name=log.event_runner.user.full_name,
                runner_slug=log.event_runner.public_slug,
                distance_km=log.distance_km,
                activity_date=log.activity_date,
                proof_url=log.proof_url,
                proof_source=log.proof_source,
                notes=log.notes,
                status=log.status,
                rejection_reason=log.rejection_reason,
                created_at=log.created_at,
            )
        )
    return items


@router.post("/{log_id}/approve", response_model=DistanceLogPublic)
async def approve_distance(
    log_id: UUID,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DistanceLogPublic:
    """Manager approves a distance log; aggregates update on the runner and event."""
    result = await db.execute(
        select(DistanceLog)
        .where(DistanceLog.id == log_id)
        .options(selectinload(DistanceLog.event_runner))
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    # Ownership: manager may only approve logs belonging to their events
    await _require_event_ownership(log.event_runner.event_id, user, db)
    if log.status not in (DistanceStatus.SUBMITTED, DistanceStatus.UNDER_REVIEW):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Log is in status {log.status} and cannot be approved",
        )

    log.status = DistanceStatus.APPROVED
    log.reviewed_by = user.id
    log.reviewed_at = datetime.now(UTC)

    await db.execute(
        update(EventRunner)
        .where(EventRunner.id == log.event_runner_id)
        .values(
            distance_completed_km=EventRunner.distance_completed_km + log.distance_km
        )
    )
    await db.execute(
        update(Event)
        .where(Event.id == log.event_runner.event_id)
        .values(total_distance_km=Event.total_distance_km + log.distance_km)
    )

    await log_action(
        db,
        entity_type="distance_log",
        entity_id=log.id,
        action="distance_log.approved",
        actor=user,
        metadata={"distance_km": str(log.distance_km)},
        request=request,
    )
    # Notify the runner
    from app.services.achievement_service import check_and_unlock
    from app.services.notification_service import notify

    await notify(
        user_id=log.event_runner.user_id,
        type_="distance.approved",
        title=f"{log.distance_km} km approved",
        body="Your distance has been verified by the event manager.",
        action_url=f"/runners/{log.event_runner.public_slug}",
        metadata={"distance_log_id": str(log.id)},
        db=db,
    )
    await db.flush()
    # Recompute streak after approval (uses approved logs in DB)
    from app.services.streak_service import recompute_streak

    await recompute_streak(log.event_runner_id, db)
    # Re-evaluate achievement rules. New badges trigger their own notifications.
    await check_and_unlock(log.event_runner_id, db)
    await db.commit()
    await db.refresh(log)
    return DistanceLogPublic.model_validate(log)


@router.post("/{log_id}/reject", response_model=DistanceLogPublic)
async def reject_distance(
    log_id: UUID,
    payload: DistanceLogReview,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DistanceLogPublic:
    """Manager rejects a distance log."""
    if not payload.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rejection_reason is required",
        )
    result = await db.execute(
        select(DistanceLog)
        .where(DistanceLog.id == log_id)
        .options(selectinload(DistanceLog.event_runner))
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _require_event_ownership(log.event_runner.event_id, user, db)
    if log.status not in (DistanceStatus.SUBMITTED, DistanceStatus.UNDER_REVIEW):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Log is in status {log.status} and cannot be rejected",
        )

    log.status = DistanceStatus.REJECTED
    log.reviewed_by = user.id
    log.reviewed_at = datetime.now(UTC)
    log.rejection_reason = payload.rejection_reason

    await log_action(
        db,
        entity_type="distance_log",
        entity_id=log.id,
        action="distance_log.rejected",
        actor=user,
        reason=payload.rejection_reason,
        request=request,
    )
    await db.commit()
    await db.refresh(log)
    return DistanceLogPublic.model_validate(log)
