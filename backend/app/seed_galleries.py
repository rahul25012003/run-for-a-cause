"""Idempotently populate sample gallery photos on existing approved runners
so the public profile gallery has something to render in dev."""
from __future__ import annotations

import asyncio
import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.event_runner import EventRunner, RunnerStatus

# Curated training/race-day photos from Unsplash. Each runner gets 4 photos
# pulled randomly from this pool — varied enough that no two runners look the
# same on the public profile.
PHOTO_POOL: list[str] = [
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=85",
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&q=85",
    "https://images.unsplash.com/photo-1486218119243-13883505764c?w=900&q=85",
    "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=900&q=85",
    "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=900&q=85",
    "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=900&q=85",
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900&q=85",
    "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=900&q=85",
    "https://images.unsplash.com/photo-1530137073521-28cb4e0e5c6c?w=900&q=85",
    "https://images.unsplash.com/photo-1530143584546-02191bc84eb5?w=900&q=85",
    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&q=85",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=85",
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(EventRunner).where(EventRunner.status == RunnerStatus.APPROVED)
        )
        runners = list(result.scalars().all())
        if not runners:
            print("No approved runners found. Run the main seed first.")
            return

        seeded = 0
        for er in runners:
            if er.gallery_urls:  # idempotent — skip runners that already have one
                continue
            er.gallery_urls = random.sample(PHOTO_POOL, k=4)
            seeded += 1

        await db.commit()
        print(f"[OK] Seeded gallery photos on {seeded} runners.")


if __name__ == "__main__":
    asyncio.run(main())
