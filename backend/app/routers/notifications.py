"""Notification endpoints — list and mark-read for the current user."""
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import ORMBase

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationPublic(ORMBase):
    id: UUID
    type: str
    title: str
    body: str | None
    action_url: str | None
    is_read: bool
    metadata_json: dict | None
    created_at: datetime
    read_at: datetime | None


@router.get("/", response_model=list[NotificationPublic])
async def list_notifications(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = False,
    limit: int = 50,
) -> list[NotificationPublic]:
    """List notifications for the current user, newest first."""
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return [NotificationPublic.model_validate(n) for n in result.scalars().all()]


@router.get("/unread-count")
async def unread_count(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, int]:
    """Count of unread notifications."""
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.is_read.is_(False),
        )
    )
    return {"count": int(result.scalar_one())}


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Mark a single notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    n.is_read = True
    n.read_at = datetime.now(UTC)
    await db.commit()


@router.post("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Mark every unread notification for the current user as read."""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True, read_at=datetime.now(UTC))
    )
    await db.commit()
