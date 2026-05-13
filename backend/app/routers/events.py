"""Event endpoints — create, browse, manage."""
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_admin,
    require_manager,
)
from app.models.event import (
    CauseCategory,
    Event,
    EventStatus,
)
from app.models.organisation import KycStatus, Organisation
from app.models.user import User, UserRole
from app.schemas.event import (
    EventApprovalAction,
    EventCreate,
    EventDetail,
    EventMapPin,
    EventPublic,
    EventUpdate,
)
from app.services.audit_service import log_action
from app.utils.slugs import make_slug

router = APIRouter(prefix="/events", tags=["events"])

PUBLIC_VISIBLE_STATUSES = (
    EventStatus.APPROVED,
    EventStatus.LIVE,
    EventStatus.DISTANCE_LOCK,
    EventStatus.SETTLING,
    EventStatus.SETTLED,
    EventStatus.COMPLETED,
)


@router.get("/", response_model=list[EventPublic])
async def list_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    category: CauseCategory | None = None,
    cause_id: UUID | None = None,
    featured: bool | None = None,
    search: str | None = None,
    format: str | None = None,
    city: str | None = None,
    status_filter: EventStatus | None = Query(default=None, alias="status"),
    mine: bool = False,
    all: bool = False,
    limit: int = Query(default=24, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[EventPublic]:
    """Events list — public by default; super_admin can pass `all=true` to
    include drafts/pending; managers can pass `mine=true` to scope to their
    own org's events (any status)."""
    from app.models.organisation import Organisation

    stmt = select(Event)

    is_admin = user is not None and user.role == UserRole.SUPER_ADMIN
    is_manager_with_org = user is not None and user.role in (
        UserRole.SUPER_ADMIN,
        UserRole.EVENT_MANAGER,
    )

    if mine and is_manager_with_org:
        org_result = await db.execute(
            select(Organisation).where(Organisation.user_id == user.id)
        )
        org = org_result.scalar_one_or_none()
        if not org:
            return []
        stmt = stmt.where(Event.organisation_id == org.id)
        if status_filter:
            stmt = stmt.where(Event.status == status_filter)
    elif all and is_admin:
        if status_filter:
            stmt = stmt.where(Event.status == status_filter)
    else:
        if status_filter:
            stmt = stmt.where(Event.status == status_filter)
        else:
            stmt = stmt.where(Event.status.in_(PUBLIC_VISIBLE_STATUSES))

    if cause_id:
        stmt = stmt.where(Event.cause_id == cause_id)
    if category:
        stmt = stmt.where(Event.cause_category == category)
    if featured is not None:
        stmt = stmt.where(Event.is_featured == featured)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(Event.title).like(like)
            | func.lower(Event.description).like(like)
            | func.lower(func.coalesce(Event.city, "")).like(like)
        )
    if format:
        stmt = stmt.where(Event.format == format)
    if city:
        stmt = stmt.where(func.lower(Event.city) == city.lower())
    stmt = (
        stmt.order_by(Event.is_featured.desc(), Event.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return [EventPublic.model_validate(e) for e in result.scalars().all()]


@router.get("/map", response_model=list[EventMapPin])
async def list_event_map_pins(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: CauseCategory | None = None,
) -> list[EventMapPin]:
    """Lean payload for the India cause-discovery map (`/map`).

    Only events that are publicly visible AND have lat/lng populated are
    returned — events without coordinates are silently filtered (the
    `geocode-events` ops skill backfills them in batch)."""
    stmt = (
        select(Event)
        .where(Event.status.in_(PUBLIC_VISIBLE_STATUSES))
        .where(Event.latitude.is_not(None))
        .where(Event.longitude.is_not(None))
        .where(Event.city.is_not(None))
    )
    if category:
        stmt = stmt.where(Event.cause_category == category)
    res = await db.execute(stmt)
    return [EventMapPin.model_validate(e) for e in res.scalars().all()]


@router.get("/by-id/{event_id}", response_model=EventDetail)
async def get_event_by_id(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventDetail:
    """Fetch any event by UUID (used by edit pages)."""
    result = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return EventDetail.model_validate(event)


@router.get("/{slug}", response_model=EventDetail)
async def get_event(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventDetail:
    """Public event detail by slug."""
    result = await db.execute(
        select(Event)
        .where(Event.slug == slug)
        .options(selectinload(Event.organisation))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return EventDetail.model_validate(event)


@router.post(
    "/",
    response_model=EventDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_event(
    payload: EventCreate,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventDetail:
    """Event manager creates a new event under their organisation. Super-admin
    can pass `organisation_id` to create on any org's behalf."""
    if user.role == UserRole.SUPER_ADMIN and payload.organisation_id is not None:
        org_result = await db.execute(
            select(Organisation).where(Organisation.id == payload.organisation_id)
        )
        org = org_result.scalar_one_or_none()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organisation not found",
            )
    else:
        org_result = await db.execute(
            select(Organisation).where(Organisation.user_id == user.id)
        )
        org = org_result.scalar_one_or_none()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Super-admin: pass organisation_id to choose an org"
                    if user.role == UserRole.SUPER_ADMIN
                    else "You must create an organisation before hosting events"
                ),
            )
    if org.kyc_status != KycStatus.VERIFIED and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organisation KYC must be verified before creating events",
        )

    event = Event(
        organisation_id=org.id,
        cause_id=payload.cause_id,
        title=payload.title,
        slug=make_slug(payload.title),
        description=payload.description,
        cause_summary=payload.cause_summary,
        cause_category=payload.cause_category,
        cover_image_url=payload.cover_image_url,
        gallery_urls=payload.gallery_urls,
        format=payload.format,
        participation=payload.participation,
        run_type=payload.run_type,
        fundraising_goal=payload.fundraising_goal,
        distance_goal_km=payload.distance_goal_km,
        start_date=payload.start_date,
        end_date=payload.end_date,
        registration_deadline=payload.registration_deadline,
        max_runners=payload.max_runners,
        status=EventStatus.DRAFT,
    )
    db.add(event)
    await db.flush()
    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.created",
        actor=user,
        request=request,
    )
    await db.commit()

    detail_result = await db.execute(
        select(Event)
        .where(Event.id == event.id)
        .options(selectinload(Event.organisation))
    )
    return EventDetail.model_validate(detail_result.scalar_one())


@router.get("/{event_id}/insights")
async def event_insights(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Donor-pattern insights for the manager. AI-backed when key set,
    deterministic rule-based fallback otherwise."""
    result = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if user.role != UserRole.SUPER_ADMIN and event.organisation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    from app.services.insights_service import generate_insights

    return await generate_insights(event_id, db)


@router.post("/{event_id}/draft-impact")
async def draft_impact(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Manager-only — produce a draft impact report body to seed the
    impact-report editor. AI when `ANTHROPIC_API_KEY` is set, rule-based
    fallback otherwise. Output is markdown the manager edits before saving."""
    result = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if user.role != UserRole.SUPER_ADMIN and event.organisation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    from app.services.insights_service import draft_impact_report

    return await draft_impact_report(event_id, db)


@router.put("/{event_id}", response_model=EventDetail)
async def update_event(
    event_id: UUID,
    payload: EventUpdate,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventDetail:
    """Update a draft event."""
    result = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if user.role != UserRole.SUPER_ADMIN and event.organisation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    if event.status != EventStatus.DRAFT and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft events can be edited",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.updated",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(event)
    return EventDetail.model_validate(event)


@router.post("/{event_id}/submit", response_model=EventPublic)
async def submit_event(
    event_id: UUID,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventPublic:
    """Submit a draft event for super-admin approval."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if event.status != EventStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft events can be submitted",
        )

    event.status = EventStatus.PENDING_APPROVAL
    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.submitted_for_approval",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(event)
    return EventPublic.model_validate(event)


@router.post("/{event_id}/approve", response_model=EventPublic)
async def approve_event(
    event_id: UUID,
    payload: EventApprovalAction,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventPublic:
    """Super-admin approves an event."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if event.status not in (EventStatus.PENDING_APPROVAL, EventStatus.DRAFT):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is not pending approval",
        )

    today = datetime.now(UTC).date()
    if event.start_date <= today <= event.end_date:
        event.status = EventStatus.LIVE
    else:
        event.status = EventStatus.APPROVED
    event.approved_by = admin.id
    event.approved_at = datetime.now(UTC)

    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.approved",
        actor=admin,
        reason=payload.reason,
        request=request,
    )
    await db.commit()
    await db.refresh(event)
    return EventPublic.model_validate(event)


@router.post("/{event_id}/reject", response_model=EventPublic)
async def reject_event(
    event_id: UUID,
    payload: EventApprovalAction,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventPublic:
    """Super-admin rejects an event back to draft."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    event.status = EventStatus.DRAFT
    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.rejected",
        actor=admin,
        reason=payload.reason,
        request=request,
    )
    await db.commit()
    await db.refresh(event)
    return EventPublic.model_validate(event)


class ImpactReportPayload(BaseModel):
    impact_report_url: str | None = None
    utilisation_summary: str | None = None


@router.post("/{event_id}/impact-report", response_model=EventPublic)
async def publish_impact_report(
    event_id: UUID,
    payload: ImpactReportPayload,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventPublic:
    """Manager (or admin) publishes a post-event utilisation report.

    Stamps `impact_report_published_at` to mark the report as live.
    """
    result = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if (
        user.role != UserRole.SUPER_ADMIN
        and event.organisation.user_id != user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    if payload.impact_report_url is not None:
        event.impact_report_url = payload.impact_report_url
    if payload.utilisation_summary is not None:
        event.utilisation_summary = payload.utilisation_summary
    if payload.impact_report_url or payload.utilisation_summary:
        event.impact_report_published_at = datetime.now(UTC)

    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.impact_report_published",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(event)
    return EventPublic.model_validate(event)


@router.post("/{event_id}/feature", response_model=EventPublic)
async def toggle_feature(
    event_id: UUID,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventPublic:
    """Super-admin toggles the featured flag on an event."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    event.is_featured = not event.is_featured
    await log_action(
        db,
        entity_type="event",
        entity_id=event.id,
        action="event.feature_toggled",
        actor=admin,
        metadata={"is_featured": event.is_featured},
        request=request,
    )
    await db.commit()
    await db.refresh(event)
    return EventPublic.model_validate(event)
