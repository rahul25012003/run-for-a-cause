"""In-app notification dispatcher (writes to notifications table)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User


async def notify(
    *,
    user_id: UUID,
    type_: str,
    title: str,
    body: str | None = None,
    action_url: str | None = None,
    metadata: dict[str, Any] | None = None,
    db: AsyncSession,
) -> Notification:
    """Create an in-app notification record. Caller commits.

    Side-effects: if the recipient has `whatsapp_opted_in = TRUE` AND
    Gupshup is configured, fan out a transactional WhatsApp message.
    Failure of the fan-out is swallowed — the in-app notification is
    the source of truth.
    """
    n = Notification(
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
        action_url=action_url,
        metadata_json=metadata,
    )
    db.add(n)
    await db.flush()

    # Best-effort WhatsApp fan-out (D1).
    try:
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if user and user.whatsapp_opted_in and user.phone:
            from app.services.whatsapp_service import send_whatsapp

            text = title if not body else f"{title}\n\n{body}"
            await send_whatsapp(to_phone=user.phone, message=text)
    except Exception:
        # Never let a notification fan-out break the calling business action.
        pass

    return n
