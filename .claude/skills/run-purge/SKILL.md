---
name: run-purge
description: Trigger the DPDP hard-purge — deletes user records whose 30-day grace window has elapsed after a soft delete. Use after testing the account-delete flow several times to clean up stale `deleted-{uuid}@runforacause.local` rows.
allowed-tools: PowerShell, Bash
---

# Run hard-purge

The endpoint requires super-admin authentication. Two ways to invoke:

## Option 1: via the script (no login needed)

Calls the underlying `purge_expired_users` directly:

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -c @"
import asyncio
from app.database import AsyncSessionLocal
from app.services.account_service import purge_expired_users

async def m():
    async with AsyncSessionLocal() as db:
        result = await purge_expired_users(db)
        print(f'Purged {result[\"purged_count\"]} users')
        for uid in result['purged_ids']:
            print(f'  - {uid}')
asyncio.run(m())
"@
```

## Option 2: via the API (requires being logged in as super-admin)

1. Log in at `http://localhost:3000/login` as
   `admin@runforacause.in` / `Admin@1234`
2. Get the `access_token` cookie value (DevTools → Application → Cookies)
3. Call:

```powershell
$TOKEN = "<paste cookie value>"
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/dpdp/purge" -Method POST -Headers @{ Cookie = "access_token=$TOKEN" }
```

## After

Print the count of purged users and confirm.
