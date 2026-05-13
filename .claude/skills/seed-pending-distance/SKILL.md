---
name: seed-pending-distance
description: Inject a handful of pending distance log entries onto seeded runners so the manager approval queue has something to test against. Idempotent — won't double-populate.
allowed-tools: PowerShell, Bash
---

# Seed pending distance entries

The main seed pre-approves all distance logs. To test the manager
approval flow (`/manager/events/[id]/distance-approvals`), you need
some pending ones.

## Command

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -m app.seed_pending
```

## When to use

- After `npm run reset`
- After approving the existing pending entries during testing and you
  want fresh ones
- When demo-ing the approval flow

## After

Tell the user: "Sign in as a manager (`contact@ashafoundation.in`) →
visit `/manager/events/<id>/distance-approvals` to see pending logs."
