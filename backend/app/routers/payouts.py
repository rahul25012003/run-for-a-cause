"""Payout endpoints — initiate and track payouts to NGOs."""
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.event import Event, EventStatus
from app.models.payout import Payout, PayoutStatus
from app.models.user import User
from app.schemas.payout import PayoutCreate, PayoutPublic
from app.services.audit_service import log_action

router = APIRouter(prefix="/payouts", tags=["payouts"])


@router.post(
    "/",
    response_model=PayoutPublic,
    status_code=status.HTTP_201_CREATED,
)
async def initiate_payout(
    payload: PayoutCreate,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PayoutPublic:
    """Super-admin initiates a payout for a settled event."""
    result = await db.execute(select(Event).where(Event.id == payload.event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if event.status not in (EventStatus.COMPLETED, EventStatus.SETTLED, EventStatus.SETTLING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is not ready for payout",
        )

    fee = (
        event.total_raised * event.platform_fee_pct / Decimal("100")
    ).quantize(Decimal("0.01"))
    net = event.total_raised - fee

    payout = Payout(
        event_id=event.id,
        organisation_id=event.organisation_id,
        gross_amount=event.total_raised,
        platform_fee=fee,
        net_amount=net,
        status=PayoutStatus.APPROVED,
        initiated_by=admin.id,
        approved_by=admin.id,
        approved_at=datetime.now(UTC),
        notes=payload.notes,
    )
    db.add(payout)
    await db.flush()
    await log_action(
        db,
        entity_type="payout",
        entity_id=payout.id,
        action="payout.initiated",
        actor=admin,
        metadata={"net": str(net)},
        request=request,
    )
    await db.commit()
    await db.refresh(payout)
    return PayoutPublic.model_validate(payout)


@router.get("/", response_model=list[PayoutPublic])
async def list_payouts(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PayoutPublic]:
    """List all payouts (admin only)."""
    result = await db.execute(select(Payout).order_by(Payout.created_at.desc()))
    return [PayoutPublic.model_validate(p) for p in result.scalars().all()]


@router.get("/by-event/{event_id}", response_model=list[PayoutPublic])
async def list_event_payouts(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PayoutPublic]:
    """List payouts for an event (public — used by transparency page)."""
    result = await db.execute(
        select(Payout)
        .where(Payout.event_id == event_id)
        .order_by(Payout.created_at.desc())
    )
    return [PayoutPublic.model_validate(p) for p in result.scalars().all()]
