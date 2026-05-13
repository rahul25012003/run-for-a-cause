"""In-process APScheduler. Started inside the FastAPI lifespan so jobs
share the app's event loop and DB pool. Disable with `ENABLE_SCHEDULER=0`
in env (useful for dev or when running multiple workers — only ONE
worker should host the scheduler in production; gate by hostname or a
dedicated `worker` deployment).

Jobs:
  - hourly: hard-purge soft-deleted accounts past their grace window
  - daily 02:00 IST: auto-settle eligible events (run gracefully; no-op
    if there's nothing to settle)
  - daily 08:00 IST: digest dispatch for users with `digest_frequency` ∈
    {daily, weekly} (weekly fires only on Mondays)
"""
from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.utils.logger import get_logger

logger = get_logger(__name__)

IST = ZoneInfo("Asia/Kolkata")
_scheduler: AsyncIOScheduler | None = None


async def _job_hard_purge() -> None:
    """Delete users whose `purge_scheduled_at` has passed."""
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        now = datetime.now(UTC)
        res = await db.execute(
            select(User)
            .where(User.purge_scheduled_at.is_not(None))
            .where(User.purge_scheduled_at <= now)
        )
        victims = list(res.scalars().all())
        for u in victims:
            await db.delete(u)
        if victims:
            await db.commit()
            logger.info("scheduler.purge", count=len(victims))


async def _job_auto_settle() -> None:
    """Auto-flip events into SETTLING if their distance_lock window has
    elapsed and they haven't been settled yet. The settlement service
    completes the rest of the flow (payouts initiation)."""
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.event import Event, EventStatus

    cutoff = datetime.now(UTC).date() - timedelta(days=7)
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Event)
            .where(Event.status == EventStatus.DISTANCE_LOCK)
            .where(Event.end_date <= cutoff)
        )
        events = list(res.scalars().all())
        for e in events:
            e.status = EventStatus.SETTLING
        if events:
            await db.commit()
            logger.info("scheduler.auto_settle", count=len(events))


async def _job_digest() -> None:
    """Dispatch daily/weekly notification digests (F5 batching)."""
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.notification import Notification
    from app.models.user import User
    from app.services.email_service import EmailMessage, send_email

    today_ist = datetime.now(IST)
    is_monday = today_ist.weekday() == 0
    cutoff_daily = datetime.now(UTC) - timedelta(days=1)
    cutoff_weekly = datetime.now(UTC) - timedelta(days=7)

    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(User).where(User.digest_frequency.in_(("daily", "weekly")))
        )
        for user in res.scalars().all():
            cutoff = (
                cutoff_weekly
                if user.digest_frequency == "weekly"
                else cutoff_daily
            )
            if user.digest_frequency == "weekly" and not is_monday:
                continue
            note_res = await db.execute(
                select(Notification)
                .where(Notification.user_id == user.id)
                .where(Notification.created_at >= cutoff)
                .order_by(Notification.created_at.desc())
                .limit(20)
            )
            notes = list(note_res.scalars().all())
            if not notes:
                continue
            lines = "\n".join(f"• {n.title} — {n.body}" for n in notes)
            html = (
                f"<p>Hi {user.full_name.split()[0]},</p>"
                f"<p>Here's your {user.digest_frequency} update from RunForACause:</p>"
                f"<pre style='font-family:Inter,system-ui'>{lines}</pre>"
            )
            try:
                await send_email(
                    EmailMessage(
                        to=user.email,
                        subject=f"Your {user.digest_frequency} RunForACause digest",
                        html=html,
                    )
                )
                logger.info(
                    "scheduler.digest_sent",
                    user_id=str(user.id),
                    cadence=user.digest_frequency,
                    items=len(notes),
                )
            except Exception as exc:
                logger.warning(
                    "scheduler.digest_failed",
                    user_id=str(user.id),
                    error=str(exc),
                )


def start_scheduler() -> AsyncIOScheduler | None:
    """Start the scheduler. No-op if disabled by env or already running."""
    global _scheduler
    if os.getenv("ENABLE_SCHEDULER", "0") != "1":
        logger.info("scheduler.disabled")
        return None
    if _scheduler is not None:
        return _scheduler
    s = AsyncIOScheduler(timezone=IST)
    s.add_job(_job_hard_purge, IntervalTrigger(hours=1), id="hard_purge")
    s.add_job(
        _job_auto_settle, CronTrigger(hour=2, minute=0, timezone=IST), id="auto_settle"
    )
    s.add_job(
        _job_digest, CronTrigger(hour=8, minute=0, timezone=IST), id="digest"
    )
    s.start()
    _scheduler = s
    logger.info("scheduler.started", jobs=[j.id for j in s.get_jobs()])
    return s


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("scheduler.stopped")
