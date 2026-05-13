"""Razorpay webhook handler."""
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.payment_service import (
    capture_payment,
    verify_webhook_signature,
)
from app.utils.logger import get_logger

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = get_logger(__name__)


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Idempotently handle Razorpay payment events."""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not verify_webhook_signature(body, signature):
        logger.warning("invalid_webhook_signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature"
        )

    payload = json.loads(body)
    event = payload.get("event")
    entity = (
        payload.get("payload", {}).get("payment", {}).get("entity")
        or payload.get("payload", {}).get("refund", {}).get("entity")
        or {}
    )
    logger.info("razorpay_webhook", event=event, payment_id=entity.get("id"))

    if event == "payment.captured":
        donation_id = entity.get("notes", {}).get("donation_id")
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        if donation_id and order_id and payment_id:
            try:
                from uuid import UUID

                await capture_payment(
                    donation_id=UUID(donation_id),
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                    razorpay_signature="webhook_verified",
                    db=db,
                )
            except ValueError:
                pass

    return {"status": "ok"}
