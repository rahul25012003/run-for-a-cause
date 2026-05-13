---
name: reset-kyc
description: Reset NGO organisation(s) to KYC pending so the manager submission/verification flow can be retested. Argument can be a slug prefix (e.g. "asha-foundation") or "all" to reset every org.
allowed-tools: PowerShell, Bash
---

# Reset KYC

Use when the user wants to retest the KYC submission flow as a manager,
or when bug-fixing the verify/reject endpoints.

## Steps

1. Determine the target — read the user's message for a slug/name, or
   default to "all" if unspecified
2. Run the reset script with that target as `$TARGET`
3. The script also prints the resulting state of every organisation so
   you can confirm

## Command

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
$TARGET = "all"  # or "asha-foundation" etc.
.\.venv\Scripts\python.exe -c @"
import asyncio
from sqlalchemy import update, select
from app.database import AsyncSessionLocal
from app.models.organisation import Organisation, KycStatus

async def m():
    async with AsyncSessionLocal() as db:
        target = '$TARGET'
        stmt = update(Organisation).values(
            kyc_status=KycStatus.PENDING,
            kyc_verified_at=None,
            kyc_rejection_reason=None,
        )
        if target != 'all':
            stmt = stmt.where(Organisation.slug.like(f'{target}%'))
        await db.execute(stmt)
        await db.commit()
        for s, n, k in (await db.execute(select(Organisation.slug, Organisation.name, Organisation.kyc_status))).all():
            print(f'  {n:35s} | {s:40s} | {k.value}')
asyncio.run(m())
"@
```

## After

Tell the user: "Reset done. Sign in as `contact@ashafoundation.in` /
`Manager@1234` and visit `/manager/organisation` to retest the KYC flow."
