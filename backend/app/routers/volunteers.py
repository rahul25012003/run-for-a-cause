"""Volunteer-roles endpoints — manager creates roles, public signs up,
manager confirms or declines."""
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.event import Event
from app.models.user import User, UserRole
from app.models.volunteer import Volunteer, VolunteerRole, VolunteerStatus
from app.schemas.common import ORMBase
from app.services.audit_service import log_action

router = APIRouter(tags=["volunteers"])


# ---------- schemas ----------


class VolunteerRoleIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str | None = None
    capacity: int = Field(default=1, ge=1, le=500)
    shift: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)


class VolunteerRolePublic(ORMBase):
    id: UUID
    event_id: UUID
    title: str
    description: str | None
    capacity: int
    shift: str | None
    location: str | None
    created_at: datetime
    # Computed: how many confirmed signups so the public can see if it's full
    confirmed_count: int = 0


class VolunteerSignup(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    note: str | None = Field(default=None, max_length=2000)


class VolunteerPublic(ORMBase):
    id: UUID
    role_id: UUID
    full_name: str
    email: str
    phone: str | None
    note: str | None
    status: VolunteerStatus
    created_at: datetime


class VolunteerStatusUpdate(BaseModel):
    status: VolunteerStatus


# ---------- public endpoints ----------


@router.get(
    "/events/{event_id}/volunteer-roles",
    response_model=list[VolunteerRolePublic],
)
async def list_event_roles(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VolunteerRolePublic]:
    """Public — list every volunteer role for an event with counts."""
    res = await db.execute(
        select(
            VolunteerRole,
            func.count(Volunteer.id)
            .filter(Volunteer.status == VolunteerStatus.CONFIRMED)
            .label("confirmed_count"),
        )
        .outerjoin(Volunteer, Volunteer.role_id == VolunteerRole.id)
        .where(VolunteerRole.event_id == event_id)
        .group_by(VolunteerRole.id)
        .order_by(VolunteerRole.created_at.asc())
    )
    out: list[VolunteerRolePublic] = []
    for role, confirmed_count in res.all():
        item = VolunteerRolePublic.model_validate(role)
        item.confirmed_count = int(confirmed_count or 0)
        out.append(item)
    return out


@router.post(
    "/volunteer-roles/{role_id}/signup",
    response_model=VolunteerPublic,
    status_code=status.HTTP_201_CREATED,
)
async def signup_for_role(
    role_id: UUID,
    payload: VolunteerSignup,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VolunteerPublic:
    """Public — anyone can apply for a role. No login required.

    Idempotent on (role_id, email): re-submitting with the same email just
    updates the existing record so a typo'd phone can be fixed without
    creating duplicate signups."""
    role_res = await db.execute(
        select(VolunteerRole).where(VolunteerRole.id == role_id)
    )
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # Capacity check (against confirmed only — pending applicants don't
    # block new signups; manager decides who to confirm).
    confirmed_res = await db.execute(
        select(func.count(Volunteer.id)).where(
            Volunteer.role_id == role_id,
            Volunteer.status == VolunteerStatus.CONFIRMED,
        )
    )
    if int(confirmed_res.scalar_one()) >= role.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This role is fully staffed.",
        )

    email = payload.email.lower().strip()
    existing_res = await db.execute(
        select(Volunteer).where(
            Volunteer.role_id == role_id, Volunteer.email == email
        )
    )
    existing = existing_res.scalar_one_or_none()
    if existing:
        existing.full_name = payload.full_name
        existing.phone = payload.phone
        existing.note = payload.note
        if existing.status == VolunteerStatus.CANCELLED:
            existing.status = VolunteerStatus.PENDING
        await db.commit()
        await db.refresh(existing)
        return VolunteerPublic.model_validate(existing)

    volunteer = Volunteer(
        role_id=role_id,
        full_name=payload.full_name,
        email=email,
        phone=payload.phone,
        note=payload.note,
    )
    db.add(volunteer)
    await db.commit()
    await db.refresh(volunteer)
    return VolunteerPublic.model_validate(volunteer)


# ---------- manager endpoints ----------


async def _ensure_manager_owns_event(
    event_id: UUID, user: User, db: AsyncSession
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return event


@router.post(
    "/events/{event_id}/volunteer-roles",
    response_model=VolunteerRolePublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_role(
    event_id: UUID,
    payload: VolunteerRoleIn,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VolunteerRolePublic:
    """Manager creates a new volunteer role on their event."""
    await _ensure_manager_owns_event(event_id, user, db)
    role = VolunteerRole(event_id=event_id, **payload.model_dump())
    db.add(role)
    await log_action(
        db,
        entity_type="volunteer_role",
        entity_id=role.id,
        action="volunteer_role.created",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(role)
    return VolunteerRolePublic.model_validate(role)


@router.delete(
    "/volunteer-roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_role(
    role_id: UUID,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Manager deletes a role (cascades signups)."""
    res = await db.execute(
        select(VolunteerRole).where(VolunteerRole.id == role_id)
    )
    role = res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _ensure_manager_owns_event(role.event_id, user, db)
    await db.delete(role)
    await log_action(
        db,
        entity_type="volunteer_role",
        entity_id=role_id,
        action="volunteer_role.deleted",
        actor=user,
        request=request,
    )
    await db.commit()


@router.get(
    "/events/{event_id}/volunteers",
    response_model=list[VolunteerPublic],
)
async def list_event_volunteers(
    event_id: UUID,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VolunteerPublic]:
    """Manager: list every signup across every role for this event."""
    await _ensure_manager_owns_event(event_id, user, db)
    res = await db.execute(
        select(Volunteer)
        .join(VolunteerRole, Volunteer.role_id == VolunteerRole.id)
        .where(VolunteerRole.event_id == event_id)
        .order_by(Volunteer.created_at.desc())
    )
    return [VolunteerPublic.model_validate(v) for v in res.scalars().all()]


@router.put(
    "/volunteers/{volunteer_id}/status",
    response_model=VolunteerPublic,
)
async def update_volunteer_status(
    volunteer_id: UUID,
    payload: VolunteerStatusUpdate,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VolunteerPublic:
    """Manager confirms / declines / cancels a signup."""
    res = await db.execute(
        select(Volunteer)
        .where(Volunteer.id == volunteer_id)
        .options(selectinload(Volunteer.role))
    )
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _ensure_manager_owns_event(v.role.event_id, user, db)
    v.status = payload.status
    v.decided_at = datetime.now(UTC)
    v.decided_by = user.id
    await log_action(
        db,
        entity_type="volunteer",
        entity_id=v.id,
        action=f"volunteer.{payload.status.value}",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(v)
    return VolunteerPublic.model_validate(v)
