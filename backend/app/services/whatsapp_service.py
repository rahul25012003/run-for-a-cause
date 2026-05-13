"""WhatsApp Business notifications (D1).

Designed against Gupshup (https://www.gupshup.io/) which is the most
common India-region BSP. The service is **opt-in twice**:
  1. The user must have `users.whatsapp_opted_in = TRUE` (added in 0009)
  2. `GUPSHUP_API_KEY` + `GUPSHUP_APP_NAME` + `GUPSHUP_SOURCE_NUMBER`
     must be set in env

If either condition is unmet, `send_whatsapp(...)` returns False without
raising — call sites can safely fan out alongside email without branching.
Outbound calls are wrapped in try/except so a Gupshup outage never breaks
the underlying business action.
"""
from __future__ import annotations

import httpx

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

GUPSHUP_ENDPOINT = "https://api.gupshup.io/sm/api/v1/msg"


async def send_whatsapp(
    *, to_phone: str, message: str
) -> bool:
    """Send a transactional WhatsApp message. Returns True on success."""
    if not settings.GUPSHUP_API_KEY or not settings.GUPSHUP_SOURCE_NUMBER:
        logger.info("whatsapp.skipped_no_config", to=to_phone[-4:])
        return False
    if not to_phone:
        return False
    payload = {
        "channel": "whatsapp",
        "source": settings.GUPSHUP_SOURCE_NUMBER,
        "destination": to_phone.lstrip("+"),
        "message": message,
        "src.name": settings.GUPSHUP_APP_NAME,
    }
    headers = {"apikey": settings.GUPSHUP_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(GUPSHUP_ENDPOINT, data=payload, headers=headers)
            ok = r.status_code in (200, 202)
            if not ok:
                logger.warning(
                    "whatsapp.send_failed",
                    status=r.status_code,
                    body=r.text[:200],
                )
            return ok
    except Exception as exc:
        logger.warning("whatsapp.send_exception", error=str(exc))
        return False
