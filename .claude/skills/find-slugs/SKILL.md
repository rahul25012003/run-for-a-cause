---
name: find-slugs
description: Look up event, organisation, and runner slugs in the local database. Slugs have hex suffixes that change per seed (`run-for-education-2026-9f48af`), so they must be queried — never hardcoded. Use when constructing URLs, writing tests, or when the user asks "what's the slug for X?"
allowed-tools: PowerShell, Bash
---

# Find slugs

Use whenever you need the actual URL-safe slug of an event / organisation /
runner. The user often asks for these to test a specific page.

## Command

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -c @"
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.event import Event
from app.models.event_runner import EventRunner, RunnerStatus
from app.models.organisation import Organisation

async def m():
    async with AsyncSessionLocal() as db:
        print('--- ORGANISATIONS ---')
        for s, n in (await db.execute(select(Organisation.slug, Organisation.name))).all():
            print(f'  /organisations/{s:45s} | {n}')
        print()
        print('--- EVENTS ---')
        for s, t in (await db.execute(select(Event.slug, Event.title))).all():
            print(f'  /events/{s:45s} | {t}')
            print(f'  /events/{s}/leaderboard')
            print(f'  /events/{s}/volunteer')
        print()
        print('--- APPROVED RUNNERS ---')
        rn = await db.execute(select(EventRunner.public_slug).where(EventRunner.status==RunnerStatus.APPROVED).limit(20))
        for (s,) in rn.all():
            print(f'  /runners/{s}')
asyncio.run(m())
"@
```

## After

Echo the URLs back to the user so they can copy-paste into the browser.
