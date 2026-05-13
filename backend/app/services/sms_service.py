"""SMS OTP / transactional SMS (D6).

Designed against MSG91 (https://msg91.com/) — DLT-compliant for India.
Set `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID` to enable.

Flow for OTP login:
  1. POST /auth/sms-otp/request {phone}
  2. Service generates a 6-digit code, stores hash in Redis with 5-min TTL,
     calls `send_sms_otp(phone, code)`
  3. POST /auth/sms-otp/verify {phone, code} → returns access cookie

This file only handles the *send* side. The OTP request/verify endpoints
are stubbed in `routers/auth.py` and active only when MSG91 keys are set.
"""
from __future__ import annotations

import httpx

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

MSG91_ENDPOINT = "https://control.msg91.com/api/v5/otp"


async def send_sms_otp(*, phone: str, otp: str) -> bool:
    """Send a 6-digit OTP via MSG91 OTP API. Returns True on success."""
    if not settings.MSG91_AUTH_KEY or not settings.MSG91_TEMPLATE_ID:
        logger.info("sms.skipped_no_config")
        return False
    headers = {
        "authkey": settings.MSG91_AUTH_KEY,
        "Content-Type": "application/json",
    }
    params = {
        "template_id": settings.MSG91_TEMPLATE_ID,
        "mobile": phone.lstrip("+"),
        "otp": otp,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(MSG91_ENDPOINT, params=params, headers=headers)
            ok = r.status_code == 200
            if not ok:
                logger.warning(
                    "sms.send_failed", status=r.status_code, body=r.text[:200]
                )
            return ok
    except Exception as exc:
        logger.warning("sms.send_exception", error=str(exc))
        return False
