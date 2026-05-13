"""Account-level operations: data export, soft-delete redaction, restore.

DPDP Act 2023 compliance — every operation that touches a user's PII flows
through this module so the redaction policy is reviewable in one place.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.achievement import Achievement
from app.models.donation import Donation
from app.models.event_runner import EventRunner
from app.models.notification import Notification
from app.models.user import User

# How long the user has after clicking "Delete account" before the data is
# scheduled to be hard-purged. A future cron actually performs the purge —
# this code only sets the marker.
GRACE_PERIOD_DAYS = 30


def _decimal_to_str(v: Decimal | None) -> str | None:
    return str(v) if v is not None else None


async def build_data_export(user: User, db: AsyncSession) -> dict:
    """Gather every record the user owns into a JSON-serialisable dict.

    DPDP Article: data principal's right to data portability. The user can
    download everything we hold about them as a single JSON file.
    """
    # Donations the user made (as donor)
    donations_res = await db.execute(
        select(Donation)
        .where(Donation.donor_user_id == user.id)
        .order_by(Donation.created_at.desc())
    )
    donations = []
    for d in donations_res.scalars().all():
        donations.append(
            {
                "id": str(d.id),
                "event_id": str(d.event_id),
                "event_runner_id": str(d.event_runner_id),
                "donor_name": d.donor_name,
                "donor_email": d.donor_email,
                "donor_phone": d.donor_phone,
                "donor_pan": d.donor_pan,
                "is_anonymous": d.is_anonymous,
                "donation_type": d.donation_type.value,
                "amount_per_km": _decimal_to_str(d.amount_per_km),
                "fixed_amount": _decimal_to_str(d.fixed_amount),
                "estimated_amount": _decimal_to_str(d.estimated_amount),
                "final_amount": _decimal_to_str(d.final_amount),
                "status": d.status.value,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
        )

    # Runner profiles (one per event the user joined as a runner)
    er_res = await db.execute(
        select(EventRunner)
        .where(EventRunner.user_id == user.id)
        .options(selectinload(EventRunner.achievements))
        .order_by(EventRunner.joined_at.desc())
    )
    runner_profiles = []
    achievements: list[dict] = []
    for er in er_res.scalars().all():
        runner_profiles.append(
            {
                "id": str(er.id),
                "event_id": str(er.event_id),
                "public_slug": er.public_slug,
                "personal_story": er.personal_story,
                "personal_goal_km": _decimal_to_str(er.personal_goal_km),
                "personal_goal_amount": _decimal_to_str(er.personal_goal_amount),
                "team_name": er.team_name,
                "profile_photo_url": er.profile_photo_url,
                "cover_photo_url": er.cover_photo_url,
                "gallery_urls": er.gallery_urls,
                "status": er.status.value,
                "distance_completed_km": _decimal_to_str(er.distance_completed_km),
                "amount_raised": _decimal_to_str(er.amount_raised),
                "donor_count": er.donor_count,
                "joined_at": er.joined_at.isoformat() if er.joined_at else None,
            }
        )
        for a in er.achievements or []:
            achievements.append(
                {
                    "id": str(a.id),
                    "event_runner_id": str(er.id),
                    "type": a.type.value,
                    "title": a.title,
                    "description": a.description,
                    "icon": a.icon,
                    "unlocked_at": a.unlocked_at.isoformat()
                    if a.unlocked_at
                    else None,
                }
            )

    # Notifications
    notif_res = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )
    notifications = [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "action_url": n.action_url,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notif_res.scalars().all()
    ]

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role.value,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "digest_frequency": user.digest_frequency,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "runner_profiles": runner_profiles,
        "donations": donations,
        "achievements": achievements,
        "notifications": notifications,
        "exported_at": datetime.now(UTC).isoformat(),
    }


def redact_user(user: User) -> None:
    """Mutate a user record to remove PII while keeping the row's existence
    (for foreign-key integrity with financial records).

    Called by DELETE /me and by the future hard-purge cron. After this runs:
    - Email becomes deleted-{id}@runforacause.local (UNIQUE-safe placeholder)
    - All optional PII fields are NULL'd
    - is_active = False, hashed_password cleared so the account can never log in
    - deleted_at and purge_scheduled_at set
    """
    now = datetime.now(UTC)
    user.email = f"deleted-{user.id.hex}@runforacause.local"
    user.full_name = "Deleted user"
    user.phone = None
    user.avatar_url = None
    user.bio = None
    user.hashed_password = None
    user.totp_secret = None
    user.totp_enabled = False
    user.is_active = False
    user.is_verified = False
    user.deleted_at = now
    user.purge_scheduled_at = now + timedelta(days=GRACE_PERIOD_DAYS)


async def restore_user(user_id: UUID, db: AsyncSession) -> User | None:
    """Cancel a soft-delete within the grace period. Note: this can only
    restore the *flags* — the redacted email/name/phone are GONE. The user
    will need to re-enter them. Returns the user on success, None if not
    deletable or already purged.
    """
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user or user.deleted_at is None:
        return None
    user.deleted_at = None
    user.purge_scheduled_at = None
    user.is_active = True
    return user


async def purge_expired_users(db: AsyncSession) -> dict:
    """Hard-purge users whose grace window has elapsed.

    Strategy: delete cascades naturally for owned rows (event_runners,
    notifications via cascade='all, delete-orphan'). Donations and audit
    logs lose their FK link (donor_user_id, actor_id) but keep their row
    via ondelete='SET NULL' — the financial trail must persist for tax/
    audit per Income Tax Act requirements.

    Idempotent — safe to call repeatedly. Returns count of purged users.
    """
    now = datetime.now(UTC)
    res = await db.execute(
        select(User).where(
            User.purge_scheduled_at.is_not(None),
            User.purge_scheduled_at < now,
        )
    )
    expired = list(res.scalars().all())
    purged_ids: list[str] = []
    for user in expired:
        purged_ids.append(str(user.id))
        await db.delete(user)
    await db.commit()
    return {
        "purged_count": len(purged_ids),
        "purged_ids": purged_ids,
        "ran_at": now.isoformat(),
    }
