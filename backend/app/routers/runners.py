"""Runner / EventRunner endpoints."""
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.event import Event
from app.models.event_runner import EventRunner, RunnerStatus
from app.models.user import User, UserRole
from app.schemas.runner import (
    EventRunnerJoin,
    EventRunnerUpdate,
    RunnerApprovalAction,
    RunnerCardPublic,
    RunnerProfilePublic,
    RunnerSpotlightItem,
)
from app.services.audit_service import log_action
from app.utils.slugs import make_slug

router = APIRouter(tags=["runners"])


@router.post(
    "/events/{event_id}/runners",
    response_model=RunnerProfilePublic,
    status_code=status.HTTP_201_CREATED,
)
async def join_event(
    event_id: UUID,
    payload: EventRunnerJoin,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunnerProfilePublic:
    """Authenticated user joins an event as a runner."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    existing = await db.execute(
        select(EventRunner).where(
            EventRunner.event_id == event_id,
            EventRunner.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already joined this event",
        )

    er = EventRunner(
        event_id=event_id,
        user_id=user.id,
        public_slug=make_slug(f"{user.full_name}-{event.title}"),
        personal_story=payload.personal_story,
        personal_goal_km=payload.personal_goal_km or event.distance_goal_km,
        personal_goal_amount=payload.personal_goal_amount,
        team_name=payload.team_name,
        profile_photo_url=payload.profile_photo_url or user.avatar_url,
        cover_photo_url=payload.cover_photo_url,
        status=RunnerStatus.PENDING,
    )
    db.add(er)
    await db.flush()
    await log_action(
        db,
        entity_type="event_runner",
        entity_id=er.id,
        action="event_runner.joined",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(er)
    return RunnerProfilePublic.model_validate(er)


@router.get(
    "/events/{event_id}/runners",
    response_model=list[RunnerCardPublic],
)
async def list_event_runners(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: RunnerStatus | None = None,
) -> list[RunnerCardPublic]:
    """List runners for an event (defaults to approved runners only)."""
    stmt = (
        select(EventRunner)
        .where(EventRunner.event_id == event_id)
        .options(selectinload(EventRunner.user))
    )
    if status_filter:
        stmt = stmt.where(EventRunner.status == status_filter)
    else:
        stmt = stmt.where(
            EventRunner.status.in_(
                (
                    RunnerStatus.APPROVED,
                    RunnerStatus.ACTIVE,
                    RunnerStatus.COMPLETED,
                )
            )
        )
    stmt = stmt.order_by(EventRunner.amount_raised.desc())
    result = await db.execute(stmt)
    return [
        RunnerCardPublic(
            id=er.id,
            public_slug=er.public_slug,
            full_name=er.user.full_name,
            profile_photo_url=er.profile_photo_url,
            distance_completed_km=er.distance_completed_km,
            amount_raised=er.amount_raised,
            personal_goal_amount=er.personal_goal_amount,
            status=er.status,
            checked_in_at=er.checked_in_at,
        )
        for er in result.scalars().all()
    ]


@router.get("/runners/spotlight", response_model=list[RunnerSpotlightItem])
async def list_spotlight_runners(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 200,
    featured_only: bool = False,
) -> list[RunnerSpotlightItem]:
    """Approved runner directory — sorted by amount raised desc.
    Pass featured_only=true to restrict to runners with donations > 0."""
    stmt = (
        select(EventRunner)
        .where(EventRunner.status == RunnerStatus.APPROVED)
        .options(
            selectinload(EventRunner.user),
            selectinload(EventRunner.event),
        )
        .order_by(EventRunner.amount_raised.desc(), EventRunner.joined_at.asc())
        .limit(limit)
    )
    if featured_only:
        stmt = stmt.where(EventRunner.amount_raised > 0)
    result = await db.execute(stmt)
    items: list[RunnerSpotlightItem] = []
    for er in result.scalars().all():
        items.append(
            RunnerSpotlightItem(
                id=er.id,
                public_slug=er.public_slug,
                full_name=er.user.full_name,
                profile_photo_url=er.profile_photo_url,
                cover_photo_url=er.cover_photo_url,
                personal_story=er.personal_story,
                amount_raised=er.amount_raised,
                distance_completed_km=er.distance_completed_km,
                event_title=er.event.title,
                event_slug=er.event.slug,
                event_cause_summary=er.event.cause_summary,
            )
        )
    return items


@router.get("/runners/{public_slug}", response_model=RunnerProfilePublic)
async def get_runner_by_slug(
    public_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunnerProfilePublic:
    """Public runner profile by their unique shareable slug."""
    result = await db.execute(
        select(EventRunner).where(EventRunner.public_slug == public_slug)
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return RunnerProfilePublic.model_validate(er)


@router.put("/runners/{event_runner_id}", response_model=RunnerProfilePublic)
async def update_runner(
    event_runner_id: UUID,
    payload: EventRunnerUpdate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunnerProfilePublic:
    """Runner updates their own EventRunner profile."""
    result = await db.execute(
        select(EventRunner).where(EventRunner.id == event_runner_id)
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if er.user_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(er, field, value)
    await log_action(
        db,
        entity_type="event_runner",
        entity_id=er.id,
        action="event_runner.updated",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(er)
    return RunnerProfilePublic.model_validate(er)


@router.post(
    "/runners/{event_runner_id}/approve",
    response_model=RunnerProfilePublic,
)
async def approve_runner(
    event_runner_id: UUID,
    payload: RunnerApprovalAction,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunnerProfilePublic:
    """Event manager approves a pending runner."""
    result = await db.execute(
        select(EventRunner)
        .where(EventRunner.id == event_runner_id)
        .options(selectinload(EventRunner.event).selectinload(Event.organisation))
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if (
        user.role != UserRole.SUPER_ADMIN
        and er.event.organisation.user_id != user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    er.status = RunnerStatus.APPROVED
    er.approved_by = user.id
    er.approved_at = datetime.now(UTC)
    await log_action(
        db,
        entity_type="event_runner",
        entity_id=er.id,
        action="event_runner.approved",
        actor=user,
        reason=payload.reason,
        request=request,
    )
    await db.commit()
    await db.refresh(er)
    return RunnerProfilePublic.model_validate(er)


@router.post(
    "/runners/{event_runner_id}/reject",
    response_model=RunnerProfilePublic,
)
async def reject_runner(
    event_runner_id: UUID,
    payload: RunnerApprovalAction,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunnerProfilePublic:
    """Event manager rejects a pending runner."""
    result = await db.execute(
        select(EventRunner)
        .where(EventRunner.id == event_runner_id)
        .options(selectinload(EventRunner.event).selectinload(Event.organisation))
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if (
        user.role != UserRole.SUPER_ADMIN
        and er.event.organisation.user_id != user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    er.status = RunnerStatus.REJECTED
    await log_action(
        db,
        entity_type="event_runner",
        entity_id=er.id,
        action="event_runner.rejected",
        actor=user,
        reason=payload.reason,
        request=request,
    )
    await db.commit()
    await db.refresh(er)
    return RunnerProfilePublic.model_validate(er)


@router.get("/me/runner-events", response_model=list[RunnerProfilePublic])
async def my_runner_events(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[RunnerProfilePublic]:
    """All EventRunner records for the current user, with event title + slug."""
    result = await db.execute(
        select(EventRunner)
        .where(EventRunner.user_id == user.id)
        .options(selectinload(EventRunner.event))
        .order_by(EventRunner.joined_at.desc())
    )
    items: list[RunnerProfilePublic] = []
    for er in result.scalars().all():
        profile = RunnerProfilePublic.model_validate(er)
        if er.event:
            profile.event_title = er.event.title
            profile.event_slug = er.event.slug
        items.append(profile)
    return items
