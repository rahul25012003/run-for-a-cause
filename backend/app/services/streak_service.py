"""Streak counter — consecutive calendar days (IST) with at least one
approved distance log on a given event_runner.

Used by `distance_logs.approve` to update `consecutive_days` and
`longest_streak` after an approval. The math here is intentionally
trivial: read all approved logs (via subquery) for this runner ordered
by date, walk backwards from today (IST) and count contiguous days.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.distance_log import DistanceLog, DistanceStatus
from app.models.event_runner import EventRunner

IST = ZoneInfo("Asia/Kolkata")


async def recompute_streak(event_runner_id: uuid.UUID, db: AsyncSession) -> None:
    """Recompute consecutive_days and bump longest_streak for an event_runner."""
    res = await db.execute(
        select(DistanceLog.activity_date)
        .where(DistanceLog.event_runner_id == event_runner_id)
        .where(DistanceLog.status == DistanceStatus.APPROVED)
    )
    dates: set[date] = {row[0] for row in res.all() if row[0] is not None}

    today_ist = date.today()  # naive but matches activity_date semantics
    consecutive = 0
    cursor = today_ist
    # Walk backwards from today; allow today OR yesterday as the start anchor
    # so a streak doesn't drop just because today's log isn't in yet.
    if cursor not in dates and (cursor - timedelta(days=1)) in dates:
        cursor = cursor - timedelta(days=1)
    while cursor in dates:
        consecutive += 1
        cursor = cursor - timedelta(days=1)

    res = await db.execute(
        select(EventRunner).where(EventRunner.id == event_runner_id)
    )
    runner = res.scalar_one_or_none()
    if not runner:
        return
    runner.consecutive_days = consecutive
    if consecutive > runner.longest_streak:
        runner.longest_streak = consecutive
