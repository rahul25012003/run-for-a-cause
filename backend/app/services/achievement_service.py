"""Achievement engine — checks rules and unlocks badges idempotently."""
from __future__ import annotations

import json
from decimal import Decimal
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.achievement import Achievement, AchievementType
from app.models.event_runner import EventRunner
from app.models.site_setting import SiteSetting
from app.services.email_service import EmailMessage, render_milestone_email, send_email
from app.services.notification_service import notify
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Only the meaningful milestones get a celebratory email — small ones (first km,
# quarter distance, first donor, ₹10k) just live on as in-app badges so we don't
# spam the runner.
EMAIL_WORTHY: set[AchievementType] = {
    AchievementType.HALFWAY,
    AchievementType.GOAL_REACHED,
    AchievementType.FUNDRAISING_25K,
    AchievementType.FUNDRAISING_50K,
    AchievementType.FUNDRAISING_1L,
}

# Definition of every achievement: title + description + icon (lucide name).
RULES: dict[AchievementType, dict[str, str]] = {
    AchievementType.FIRST_KM: {
        "title": "First kilometre",
        "description": "Logged the first verified kilometre.",
        "icon": "Footprints",
    },
    AchievementType.QUARTER_DISTANCE: {
        "title": "Quarter of the way",
        "description": "Reached 25% of the personal distance goal.",
        "icon": "TrendingUp",
    },
    AchievementType.HALFWAY: {
        "title": "Halfway hero",
        "description": "Halfway to the personal distance goal.",
        "icon": "Award",
    },
    AchievementType.GOAL_REACHED: {
        "title": "Goal crusher",
        "description": "Hit 100% of the personal distance goal.",
        "icon": "Trophy",
    },
    AchievementType.FIRST_DONOR: {
        "title": "First sponsor",
        "description": "Received the first sponsorship.",
        "icon": "Heart",
    },
    AchievementType.FUNDRAISING_10K: {
        "title": "₹10,000 club",
        "description": "Raised ten thousand rupees for the cause.",
        "icon": "Coins",
    },
    AchievementType.FUNDRAISING_25K: {
        "title": "₹25,000 club",
        "description": "Raised twenty-five thousand rupees.",
        "icon": "Coins",
    },
    AchievementType.FUNDRAISING_50K: {
        "title": "₹50,000 club",
        "description": "Raised fifty thousand rupees.",
        "icon": "Trophy",
    },
    AchievementType.FUNDRAISING_1L: {
        "title": "₹1 lakh club",
        "description": "Raised a full lakh for the cause.",
        "icon": "Crown",
    },
}


async def _resolve_rules(db: AsyncSession) -> dict[AchievementType, dict[str, str]]:
    """Merge admin overrides from site_settings.achievement.rules with the
    code defaults. Each override may set title/description/icon for a type;
    missing fields fall back to the default.
    """
    res = await db.execute(
        select(SiteSetting.value).where(SiteSetting.key == "achievement.rules")
    )
    raw = res.scalar_one_or_none()
    overrides: dict[str, dict[str, str]] = {}
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                overrides = parsed
        except (json.JSONDecodeError, TypeError):
            pass

    merged: dict[AchievementType, dict[str, str]] = {}
    for type_, defaults in RULES.items():
        override = overrides.get(type_.value, {}) or {}
        merged[type_] = {
            "title": override.get("title") or defaults["title"],
            "description": override.get("description") or defaults["description"],
            "icon": override.get("icon") or defaults["icon"],
        }
    return merged


async def _has_achievement(
    runner_id: UUID, type_: AchievementType, db: AsyncSession
) -> bool:
    res = await db.execute(
        select(Achievement.id).where(
            Achievement.event_runner_id == runner_id,
            Achievement.type == type_,
        )
    )
    return res.scalar_one_or_none() is not None


async def _unlock(
    runner: EventRunner,
    type_: AchievementType,
    db: AsyncSession,
    rules: dict[AchievementType, dict[str, str]] | None = None,
) -> Achievement | None:
    """Idempotently insert an achievement; notify and (for big milestones) email the runner."""
    if await _has_achievement(runner.id, type_, db):
        return None
    if rules is None:
        rules = await _resolve_rules(db)
    rule = rules[type_]
    badge = Achievement(
        event_runner_id=runner.id,
        type=type_,
        title=rule["title"],
        description=rule["description"],
        icon=rule["icon"],
    )
    db.add(badge)
    await db.flush()
    await notify(
        user_id=runner.user_id,
        type_="achievement.unlocked",
        title=f"🏅 {rule['title']}",
        body=rule["description"],
        action_url=f"/runners/{runner.public_slug}",
        metadata={"achievement_type": type_.value},
        db=db,
    )

    # Fire celebratory email only for meaningful milestones.
    if type_ in EMAIL_WORTHY and runner.user and runner.user.email:
        try:
            event_title = runner.event.title if runner.event else "your event"
            first_name = runner.user.full_name.split(" ")[0]
            public_url = (
                f"{settings.FRONTEND_URL}/runners/{runner.public_slug}"
                if hasattr(settings, "FRONTEND_URL") and settings.FRONTEND_URL
                else f"/runners/{runner.public_slug}"
            )
            distance_str = f"{runner.distance_completed_km} km"
            raised_str = f"INR {int(runner.amount_raised):,}"
            subject, html = render_milestone_email(
                runner_first_name=first_name,
                event_title=event_title,
                milestone_title=rule["title"],
                milestone_body=rule["description"],
                distance_km=distance_str,
                amount_raised=raised_str,
                public_url=public_url,
            )
            await send_email(
                EmailMessage(to=runner.user.email, subject=subject, html=html)
            )
            logger.info(
                "milestone_email_sent",
                event_runner_id=str(runner.id),
                type=type_.value,
                to=runner.user.email,
            )
        except Exception as exc:  # email send failure must NEVER undo the badge
            logger.error(
                "milestone_email_failed",
                event_runner_id=str(runner.id),
                type=type_.value,
                error=str(exc),
            )

    logger.info(
        "achievement_unlocked",
        event_runner_id=str(runner.id),
        type=type_.value,
    )
    return badge


def _candidate_types(runner: EventRunner) -> Iterable[AchievementType]:
    """Return achievement types the runner could possibly have unlocked.

    Pure-function check based on the runner's current denormalised stats.
    """
    types: list[AchievementType] = []
    distance = runner.distance_completed_km or Decimal("0")
    goal_km = runner.personal_goal_km or Decimal("0")
    raised = runner.amount_raised or Decimal("0")
    donor_count = runner.donor_count or 0

    if distance >= 1:
        types.append(AchievementType.FIRST_KM)
    if goal_km > 0:
        if distance >= goal_km * Decimal("0.25"):
            types.append(AchievementType.QUARTER_DISTANCE)
        if distance >= goal_km * Decimal("0.5"):
            types.append(AchievementType.HALFWAY)
        if distance >= goal_km:
            types.append(AchievementType.GOAL_REACHED)

    if donor_count >= 1:
        types.append(AchievementType.FIRST_DONOR)
    if raised >= 10_000:
        types.append(AchievementType.FUNDRAISING_10K)
    if raised >= 25_000:
        types.append(AchievementType.FUNDRAISING_25K)
    if raised >= 50_000:
        types.append(AchievementType.FUNDRAISING_50K)
    if raised >= 100_000:
        types.append(AchievementType.FUNDRAISING_1L)

    return types


async def check_and_unlock(
    runner_id: UUID,
    db: AsyncSession,
) -> list[Achievement]:
    """Re-evaluate all rules for a runner; unlock anything newly earned."""
    res = await db.execute(
        select(EventRunner)
        .where(EventRunner.id == runner_id)
        .options(
            selectinload(EventRunner.achievements),
            selectinload(EventRunner.user),
            selectinload(EventRunner.event),
        )
    )
    runner = res.scalar_one_or_none()
    if not runner:
        return []

    rules = await _resolve_rules(db)
    unlocked: list[Achievement] = []
    for type_ in _candidate_types(runner):
        new_badge = await _unlock(runner, type_, db, rules=rules)
        if new_badge:
            unlocked.append(new_badge)
    return unlocked
