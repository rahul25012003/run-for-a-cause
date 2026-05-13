"""Newsletter subscription — public POST, admin list."""
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.newsletter_subscriber import NewsletterSubscriber
from app.models.user import User
from app.utils.logger import get_logger
from app.utils.rate_limit import RateLimitNewsletter

router = APIRouter(prefix="/newsletter", tags=["newsletter"])
logger = get_logger(__name__)


class SubscribeRequest(BaseModel):
    email: EmailStr
    source: str | None = Field(default=None, max_length=50)


class SubscribeResponse(BaseModel):
    ok: bool
    message: str


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    payload: SubscribeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rate: RateLimitNewsletter = None,
) -> SubscribeResponse:
    """Public endpoint — idempotent on email. Re-subscribes if previously
    unsubscribed."""
    email = payload.email.lower().strip()
    res = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )
    existing = res.scalar_one_or_none()
    if existing:
        if existing.is_active:
            return SubscribeResponse(
                ok=True, message="You're already subscribed — first report lands soon."
            )
        existing.is_active = True
        existing.unsubscribed_at = None
        await db.commit()
        logger.info("newsletter_resubscribed", email=email)
        return SubscribeResponse(
            ok=True, message="Welcome back — we'll start sending again."
        )

    db.add(
        NewsletterSubscriber(
            email=email,
            source=payload.source or "footer",
        )
    )
    await db.commit()
    logger.info("newsletter_subscribed", email=email, source=payload.source)
    return SubscribeResponse(
        ok=True, message="You're in. First report lands soon."
    )


class UnsubscribeRequest(BaseModel):
    email: EmailStr


@router.post("/unsubscribe", response_model=SubscribeResponse)
async def unsubscribe(
    payload: UnsubscribeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscribeResponse:
    email = payload.email.lower().strip()
    res = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )
    sub = res.scalar_one_or_none()
    if sub and sub.is_active:
        sub.is_active = False
        sub.unsubscribed_at = datetime.now(UTC)
        await db.commit()
        logger.info("newsletter_unsubscribed", email=email)
    return SubscribeResponse(
        ok=True, message="You're unsubscribed. Sorry to see you go."
    )


class SubscriberRow(BaseModel):
    id: str
    email: str
    is_active: bool
    source: str | None
    subscribed_at: datetime
    unsubscribed_at: datetime | None


@router.get("/admin/list", response_model=list[SubscriberRow])
async def list_subscribers(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    active_only: bool = True,
) -> list[SubscriberRow]:
    """Admin: list all subscribers."""
    query = select(NewsletterSubscriber).order_by(
        NewsletterSubscriber.subscribed_at.desc()
    )
    if active_only:
        query = query.where(NewsletterSubscriber.is_active.is_(True))
    res = await db.execute(query)
    return [
        SubscriberRow(
            id=str(s.id),
            email=s.email,
            is_active=s.is_active,
            source=s.source,
            subscribed_at=s.subscribed_at,
            unsubscribed_at=s.unsubscribed_at,
        )
        for s in res.scalars().all()
    ]
