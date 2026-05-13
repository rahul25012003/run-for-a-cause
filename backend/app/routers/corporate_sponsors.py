"""Corporate match-funding sponsors — manager CRUD + public list + match
recording (called from payment_service after each donation captures)."""
from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_manager
from app.models.corporate_sponsor import CorporateSponsor, SponsorMatchType
from app.models.event import Event
from app.models.user import User, UserRole
from app.schemas.common import ORMBase
from app.services.audit_service import log_action

router = APIRouter(tags=["corporate-sponsors"])


class CorporateSponsorIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    logo_url: str | None = None
    website: str | None = None
    description: str | None = Field(default=None, max_length=2000)
    multiplier: Decimal = Field(default=Decimal("2.0"), gt=1, le=10)
    cap_amount: Decimal = Field(gt=0)
    match_type: SponsorMatchType = SponsorMatchType.MULTIPLY
    match_value: Decimal = Field(default=Decimal("2.0"), gt=0)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True


class CorporateSponsorPublic(ORMBase):
    id: UUID
    event_id: UUID
    name: str
    logo_url: str | None
    website: str | None
    description: str | None
    multiplier: Decimal
    cap_amount: Decimal
    total_matched: Decimal
    is_active: bool
    match_type: SponsorMatchType
    match_value: Decimal
    starts_at: datetime | None
    ends_at: datetime | None
    created_at: datetime


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


# ---------- Public ----------


@router.get(
    "/events/{event_id}/sponsors",
    response_model=list[CorporateSponsorPublic],
)
async def list_sponsors(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_inactive: bool = False,
) -> list[CorporateSponsorPublic]:
    """Public — list active sponsors for an event."""
    stmt = select(CorporateSponsor).where(CorporateSponsor.event_id == event_id)
    if not include_inactive:
        stmt = stmt.where(CorporateSponsor.is_active.is_(True))
    stmt = stmt.order_by(CorporateSponsor.cap_amount.desc())
    res = await db.execute(stmt)
    return [CorporateSponsorPublic.model_validate(s) for s in res.scalars().all()]


# ---------- Manager ----------


@router.post(
    "/events/{event_id}/sponsors",
    response_model=CorporateSponsorPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_sponsor(
    event_id: UUID,
    payload: CorporateSponsorIn,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CorporateSponsorPublic:
    await _ensure_manager_owns_event(event_id, user, db)
    sponsor = CorporateSponsor(event_id=event_id, **payload.model_dump())
    db.add(sponsor)
    await log_action(
        db,
        entity_type="corporate_sponsor",
        entity_id=sponsor.id,
        action="sponsor.created",
        actor=user,
        metadata={"name": payload.name, "cap": str(payload.cap_amount)},
        request=request,
    )
    await db.commit()
    await db.refresh(sponsor)
    return CorporateSponsorPublic.model_validate(sponsor)


@router.put(
    "/sponsors/{sponsor_id}",
    response_model=CorporateSponsorPublic,
)
async def update_sponsor(
    sponsor_id: UUID,
    payload: CorporateSponsorIn,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CorporateSponsorPublic:
    res = await db.execute(
        select(CorporateSponsor).where(CorporateSponsor.id == sponsor_id)
    )
    sponsor = res.scalar_one_or_none()
    if not sponsor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _ensure_manager_owns_event(sponsor.event_id, user, db)
    for field, value in payload.model_dump().items():
        setattr(sponsor, field, value)
    await log_action(
        db,
        entity_type="corporate_sponsor",
        entity_id=sponsor.id,
        action="sponsor.updated",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(sponsor)
    return CorporateSponsorPublic.model_validate(sponsor)


@router.delete(
    "/sponsors/{sponsor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_sponsor(
    sponsor_id: UUID,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    res = await db.execute(
        select(CorporateSponsor).where(CorporateSponsor.id == sponsor_id)
    )
    sponsor = res.scalar_one_or_none()
    if not sponsor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _ensure_manager_owns_event(sponsor.event_id, user, db)
    await db.delete(sponsor)
    await log_action(
        db,
        entity_type="corporate_sponsor",
        entity_id=sponsor_id,
        action="sponsor.deleted",
        actor=user,
        request=request,
    )
    await db.commit()
