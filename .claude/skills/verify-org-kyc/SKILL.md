---
name: verify-org-kyc
description: Approve a single organisation's KYC submission directly via the database, bypassing the super-admin UI. Use when testing the manager flow and you don't want to log out + log in as super-admin.
allowed-tools: PowerShell, Bash
---

# Verify organisation KYC

Faster than logging in as super-admin and clicking through the queue.

## Command

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
$SLUG_PREFIX = "asha-foundation"  # or "all"
.\.venv\Scripts\python.exe -c @"
import asyncio
from datetime import datetime, UTC
from sqlalchemy import update, select
from app.database import AsyncSessionLocal
from app.models.organisation import Organisation, KycStatus

async def m():
    async with AsyncSessionLocal() as db:
        target = '$SLUG_PREFIX'
        stmt = update(Organisation).values(
            kyc_status=KycStatus.VERIFIED,
            kyc_verified_at=datetime.now(UTC),
            kyc_rejection_reason=None,
            is_80g_eligible=True,
        )
        if target != 'all':
            stmt = stmt.where(Organisation.slug.like(f'{target}%'))
        await db.execute(stmt)
        await db.commit()
        for s, n, k, e in (await db.execute(select(
            Organisation.slug, Organisation.name, Organisation.kyc_status, Organisation.is_80g_eligible
        ))).all():
            print(f'  {n:35s} | {s:40s} | {k.value} | 80G={e}')
asyncio.run(m())
"@
```

## After

Tell the user: "Verified. Reload `/manager/organisation` — KYC fields
should now show as locked, and the org appears on `/organisations` (the
public listing of verified NGOs)."
