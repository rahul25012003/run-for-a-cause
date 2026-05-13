---
name: reseed-all
description: Wipe and reseed the entire local database from scratch. DESTRUCTIVE — drops every table, recreates the schema, repopulates demo data. Use only when the local DB is irrecoverably broken or you want a clean slate.
allowed-tools: PowerShell, Bash
---

# Reseed everything

**⚠️ Destructive.** Confirm with the user before running.

## What this does

1. Drops all tables (via dropping the database)
2. Recreates the database
3. Runs all alembic migrations from scratch
4. Seeds users, organisations, events, runners, distance logs, donations
5. Seeds site_settings (47 keys)
6. Seeds gallery photos on approved runners
7. Seeds pending distance entries for the manager queue

## Command

The package.json has this wired up:

```powershell
cd C:\Users\Rahul\run-for-a-cause
npm run reset
```

`npm run reset` invokes `start.ps1 -Reset -Setup` which handles the
full sequence on Windows.

## Manual fallback

If `npm run reset` fails (e.g. DB connection issues), do it by hand:

```powershell
$env:PYTHONIOENCODING="utf-8"

# Drop + recreate (assumes Postgres on localhost)
dropdb -U postgres runforacause
createdb -U postgres runforacause

# Migrate + seed
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m app.seed_settings
.\.venv\Scripts\python.exe -m app.seed_galleries
.\.venv\Scripts\python.exe -m app.seed_pending
```

## After

Tell the user: "Database wiped and reseeded. All test credentials in
`CLAUDE.md` work again. Run `/find-slugs` to see the new (regenerated)
slug suffixes."

## Don't run this

- In production. Ever. Even if asked.
- Without confirming the user explicitly wants a destructive reset.
- Multiple times in a row — each time regenerates slug suffixes, breaking
  any URLs you bookmarked.
