"""Payment routes — verify Razorpay callback and capture donations."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.donation import DonationDetail, PaymentVerify
from app.services.payment_service import capture_payment

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/verify", response_model=DonationDetail)
async def verify_payment(
    payload: PaymentVerify,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DonationDetail:
    """Verify Razorpay signature and capture the donation."""
    try:
        donation = await capture_payment(
            donation_id=payload.donation_id,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return DonationDetail.model_validate(donation)
