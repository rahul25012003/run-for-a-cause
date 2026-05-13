---
name: seed-galleries
description: Populate sample gallery photos on every approved runner so the public profile gallery has something to render in dev. Idempotent — won't double-populate runners that already have a gallery.
allowed-tools: PowerShell, Bash
---

# Seed runner galleries

Wraps `backend/app/seed_galleries.py`.

## Command

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -m app.seed_galleries
```

## When to use

- After running `npm run reset` (which clears the DB)
- After adding a new approved runner via testing
- When iterating on the gallery UI and want sample data

## After

Visit any approved runner's public profile (use `/find-slugs` to get the
slug). The "Moments from the road" section should render with 4 sample
photos in a grid.
