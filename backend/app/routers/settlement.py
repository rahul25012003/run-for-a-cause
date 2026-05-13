"""Settlement endpoints — close events and create payouts."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.payout import PayoutPublic
from app.services.settlement_service import (
    close_event,
    create_payout_from_settled_event,
)

router = APIRouter(prefix="/settlement", tags=["settlement"])


@router.post("/events/{event_id}/close")
async def close_event_endpoint(
    event_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Super-admin closes an event: per-km true-up + refund-intent recording."""
    try:
        return await close_event(event_id=event_id, actor=admin, db=db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.post(
    "/events/{event_id}/create-payout",
    response_model=PayoutPublic,
)
async def create_payout(
    event_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PayoutPublic:
    """After settlement, create the Payout record (real Razorpay call later)."""
    try:
        payout = await create_payout_from_settled_event(
            event_id=event_id, actor=admin, db=db
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return PayoutPublic.model_validate(payout)
