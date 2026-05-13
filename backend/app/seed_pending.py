"""Idempotently create a handful of pending distance entries so the
manager-approval queue has something to test against."""
from __future__ import annotations

import asyncio
import random
from datetime import UTC, date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.distance_log import DistanceLog, DistanceProofSource, DistanceStatus
from app.models.event_runner import EventRunner, RunnerStatus


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # Take the first 5 approved EventRunners and add one pending entry each.
        result = await db.execute(
            select(EventRunner)
            .where(EventRunner.status == RunnerStatus.APPROVED)
            .limit(5)
        )
        runners = list(result.scalars().all())
        if not runners:
            print("No approved runners found. Run the main seed first.")
            return

        added = 0
        today = date.today()
        for er in runners:
            # Skip if this runner already has a pending entry — keep idempotent.
            existing = await db.execute(
                select(DistanceLog).where(
                    DistanceLog.event_runner_id == er.id,
                    DistanceLog.status.in_(
                        (DistanceStatus.SUBMITTED, DistanceStatus.UNDER_REVIEW)
                    ),
                )
            )
            if existing.scalar_one_or_none():
                continue
            db.add(
                DistanceLog(
                    event_runner_id=er.id,
                    distance_km=Decimal(str(random.choice([3.5, 5.2, 8.0, 10.4, 12.6]))),
                    activity_date=today - timedelta(days=random.randint(0, 4)),
                    proof_url="https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800",
                    proof_source=random.choice(
                        [
                            DistanceProofSource.STRAVA,
                            DistanceProofSource.APPLE_HEALTH,
                            DistanceProofSource.MANUAL,
                        ]
                    ),
                    notes=random.choice(
                        [
                            "Morning run, perfect weather.",
                            "Trail run with the team.",
                            "Pushed through despite a sore knee — worth it.",
                            None,
                        ]
                    ),
                    status=DistanceStatus.SUBMITTED,
                )
            )
            added += 1

        await db.commit()
        print(f"✅ Added {added} pending distance entries for the manager queue.")


if __name__ == "__main__":
    asyncio.run(main())
