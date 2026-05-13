# Runbook — Common Ops & Debugging

Recipes for the things you'll do repeatedly. Most are wrapped as
`/skill-name` commands in `.claude/skills/` — this file documents the
underlying steps for when you need to do something the skill doesn't
cover.

---

## Set up a fresh checkout

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env  # then edit DATABASE_URL etc.

# Database
createdb runforacause   # or via pgAdmin
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m app.seed_settings

# Frontend
cd ..\frontend
npm ci
cp .env.example .env.local

# Run both
cd ..
npm run dev
```

---

## Run + watch

```powershell
npm run dev          # both, concurrent, prefixed logs
npm run dev:backend  # only FastAPI on :8000
npm run dev:frontend # only Next.js on :3000
```

Press `Ctrl+C` to stop. Both reload automatically on file change.

---

## Apply a new migration

1. Author the migration file in `backend/alembic/versions/0XXX_<slug>.py`
   (use `/new-migration` skill to scaffold)
2. Apply:
   ```powershell
   $env:PYTHONIOENCODING="utf-8"
   cd backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   ```
3. PowerShell will look like it errored — it didn't. Look for the line
   `Running upgrade <prev> -> <new>, <description>`

To roll back one migration:
```powershell
.\.venv\Scripts\python.exe -m alembic downgrade -1
```

---

## Find slugs

Use the `/find-slugs` skill, or by hand:

```powershell
$env:PYTHONIOENCODING="utf-8"
cd backend
.\.venv\Scripts\python.exe -c @'
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.event import Event
from app.models.event_runner import EventRunner, RunnerStatus
from app.models.organisation import Organisation

async def m():
    async with AsyncSessionLocal() as db:
        for s, t in (await db.execute(select(Event.slug, Event.title))).all():
            print(f'EVENT  {s:50s} | {t}')
        for s, n in (await db.execute(select(Organisation.slug, Organisation.name))).all():
            print(f'ORG    {s:50s} | {n}')
        rn = await db.execute(select(EventRunner.public_slug).where(EventRunner.status==RunnerStatus.APPROVED).limit(20))
        for (s,) in rn.all():
            print(f'RUNNER {s}')
asyncio.run(m())
'@
```

---

## Reset KYC for testing

Use the `/reset-kyc` skill, or by hand:

```powershell
$env:PYTHONIOENCODING="utf-8"
cd backend
.\.venv\Scripts\python.exe -c @'
import asyncio
from sqlalchemy import update
from app.database import AsyncSessionLocal
from app.models.organisation import Organisation, KycStatus

async def m():
    async with AsyncSessionLocal() as db:
        # All orgs back to pending
        await db.execute(
            update(Organisation).values(
                kyc_status=KycStatus.PENDING,
                kyc_verified_at=None,
                kyc_rejection_reason=None,
            )
        )
        await db.commit()
        print("All orgs reset to KYC pending")
asyncio.run(m())
'@
```

---

## Trigger DPDP hard-purge

Soft-deleted users with `purge_scheduled_at < now` get hard-deleted.

**Via API** (super-admin auth required):
```bash
curl -X POST -b "access_token=$TOKEN" \
  http://localhost:8000/api/v1/admin/dpdp/purge
```

**Via Swagger**: `http://localhost:8000/docs` → log in as super-admin →
expand `POST /admin/dpdp/purge` → "Try it out" → Execute.

In production, wire this to a daily cron (see `docs/PATTERNS.md` §8).

---

## Test a Razorpay donation in dev

The seed donations are pre-captured. To test a fresh capture:

1. Visit any runner profile, click "Sponsor"
2. Enter donor info, choose amount, click "Donate"
3. Razorpay test mode opens (auto-fills card `4111 1111 1111 1111`)
4. Submit → backend captures → check `/admin/donations` to confirm
5. Match-funding kicks in if any active sponsor exists for the event
6. Achievement check fires; runner gets a notification

Test card: `4111 1111 1111 1111`, any CVV, any future expiry. UPI test:
`success@razorpay`.

---

## Inspect audit log

```powershell
$env:PYTHONIOENCODING="utf-8"
cd backend
.\.venv\Scripts\python.exe -c @'
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.audit_log import AuditLog

async def m():
    async with AsyncSessionLocal() as db:
        r = await db.execute(
            select(AuditLog.action, AuditLog.entity_type, AuditLog.created_at, AuditLog.actor_id)
            .order_by(AuditLog.created_at.desc()).limit(20)
        )
        for action, etype, ts, actor in r.all():
            print(f'{ts.isoformat()[:19]} | {etype:18s} | {action:35s} | actor={actor}')
asyncio.run(m())
'@
```

---

## Smoke test all critical routes

Use the `/smoke-test-routes` skill, or by hand (PowerShell):

```powershell
$urls = @(
    "http://localhost:3000/",
    "http://localhost:3000/events",
    "http://localhost:3000/organisations",
    "http://localhost:3000/transparency",
    "http://localhost:3000/about",
    "http://localhost:3000/privacy",
    "http://localhost:3000/terms",
    "http://localhost:3000/sitemap.xml",
    "http://localhost:3000/robots.txt",
    "http://localhost:8000/health",
    "http://localhost:8000/docs",
    "http://localhost:8000/api/v1/site-settings/",
    "http://localhost:8000/api/v1/events/",
    "http://localhost:8000/api/v1/stats/public",
    "http://localhost:8000/api/v1/audit-feed/public"
)
foreach ($u in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 10
        Write-Output "  $($r.StatusCode)  $u"
    } catch {
        Write-Output "  ERR  $u  ($($_.Exception.Message))"
    }
}
```

---

## Debug a 500 in an OG route

The connection-closed-mid-stream behaviour means you can't easily see the
error from the browser. Strategies:

1. Check the `npm run dev` terminal output — Next.js logs the cause
2. Common causes (in order of frequency):
   - Forgot `runtime = "edge"` (Node + Windows = mangled font URL)
   - Optional chain skipped a level (`event?.organisation.name` should be
     `event?.organisation?.name`)
   - Bare text mixed with element inside flex container
   - Container missing `display: "flex"` while having multiple children
   - External `<img>` URL fetch fails (CORS / 404 / timeout)
3. To bisect, replace the JSX with a minimal `<div>Hello</div>` test. If
   that works, add complexity back one section at a time.

The canonical OG patterns are `app/og/event/[slug]/route.tsx` and
`app/og/runner/[slug]/route.tsx` — copy from there.

---

## Reset Redis cache

If notifications are stale or settings aren't refreshing:

```powershell
redis-cli FLUSHDB           # current DB only
redis-cli FLUSHALL          # nuclear: all DBs
```

Or just restart Redis:
```powershell
docker compose restart redis  # if using docker
```

---

## Backup / restore Postgres locally

```powershell
# Backup
pg_dump -U postgres runforacause > rfac_$(Get-Date -Format yyyyMMdd).sql

# Restore (drops + recreates)
dropdb -U postgres runforacause
createdb -U postgres runforacause
psql -U postgres runforacause < rfac_20260507.sql
```

---

## Check what env vars the backend sees

```powershell
cd backend
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -c "from app.config import settings; print(settings.model_dump_json(indent=2))"
```

Be careful — this prints SECRET_KEY etc. Don't paste the output anywhere.

---

## Generate a strong SECRET_KEY for prod

```bash
openssl rand -hex 64
```

Or in Python:
```python
import secrets; print(secrets.token_hex(64))
```

Set in production env: `SECRET_KEY=<that hex>`. Without this, JWTs are
forgeable.

---

## Run the test suite

```powershell
# Backend
cd backend
.\.venv\Scripts\python.exe -m pytest tests/ -v

# Frontend
cd frontend
npm test                    # vitest run mode
npm run test:watch          # vitest watch mode
```

Both should pass before any commit. CI runs them automatically (see `.github/workflows/ci.yml`).

---

## Lint before commit

```powershell
# Backend
cd backend
.\.venv\Scripts\ruff check app/

# Frontend
cd frontend
npm run lint
npx tsc --noEmit
```

The CI requires all four checks pass.

---

## Reproducing a user's bug report

1. Get the slug or ID of the affected entity (use `/find-slugs`)
2. Log in as the appropriate role (test credentials in root `CLAUDE.md`)
3. Reproduce the bug
4. Check the Network tab for the failing request
5. Check the backend logs in `npm run dev` terminal for the error
6. Check the audit log if it's a state-corruption bug
7. Write a regression test before fixing (so it can never come back)

---

## Test the share button

The `ShareButton` and `WhatsAppShare` components in `components/shared/ShareButton.tsx`.

**Mobile / Chrome for Android / Safari iOS**: `navigator.share` fires the native OS sheet. No mock needed — just load the page in mobile DevTools emulation (width < 768) or on device.

**Desktop** (fallback path): `navigator.clipboard.writeText` → toast "Link copied". To test this path in desktop Chrome: DevTools → Application → Permissions → Clipboard write → Allow. Clicking Share copies the URL to clipboard.

**WhatsApp link**: opens `https://wa.me/?text=...` in new tab (or WhatsApp desktop app if installed). Encode your test URL with `encodeURIComponent` to avoid link-breaks.

---

## Verify the favicon renders correctly

1. Ensure `npm run dev:frontend` is running
2. Open `http://localhost:3000` in Chrome
3. Check the browser tab — should show the orange squircle runner icon
4. Open DevTools → Application → Manifest — should show the PWA manifest with all icon sizes
5. To test the SVG favicon specifically, navigate to `http://localhost:3000/icon.svg`

**If the tab shows a blank page icon**:
- Check `app/layout.tsx` `metadata.icons` — SVG path must match `/icon.svg`
- Check that `public/icon.svg` is a valid SVG (no XML parse errors)
- Hard-refresh with `Ctrl+Shift+R` to clear favicon cache

---

## Verify awareness blocks on runner profiles

```powershell
# 1. Find a cause that has a runner under it
$env:PYTHONIOENCODING="utf-8"
cd backend
.\.venv\Scripts\python.exe -c @'
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.cause import Cause
from app.models.event import Event
from app.models.event_runner import EventRunner, RunnerStatus

async def m():
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            select(Cause.id, Cause.title, Cause.awareness_blocks, Event.title.label("ev"), EventRunner.public_slug)
            .join(Event, Event.cause_id == Cause.id)
            .join(EventRunner, EventRunner.event_id == Event.id)
            .where(EventRunner.status == RunnerStatus.APPROVED)
            .limit(3)
        )
        for row in rows.all():
            blocks = len(row.awareness_blocks or [])
            print(f"Cause: {row.title} | {blocks} blocks | Event: {row.ev} | Runner: {row.public_slug}")
asyncio.run(m())
'@
# 2. Visit http://localhost:3000/runners/<public_slug> — scroll to "Why this cause matters"
```

If no blocks show up despite the cause having data, check `AwarenessBlocks.tsx` is
mounted via the `awarenessSlot` prop in `app/(public)/runners/[username]/page.tsx`.

---

## Common gotchas index

Quick links into the gotchas list in root `CLAUDE.md`:

- OG routes failing → check `runtime = "edge"` and Satori rules
- Hydration error → check for browser extensions (`suppressHydrationWarning`)
- Date formatting mismatch → use `formatDate` / `formatDateTime` from `@/lib/utils`
- Migration "looks broken" in PowerShell → it's not, look for the upgrade line
- Image src="" crash → guard with `{src ? <Image src={src}/> : null}`
- Edge fetch can't reach localhost → use `127.0.0.1`
- Slug not found → has hex suffix, query the DB
- `any` showing up → use `unknown` + narrowing
- Rate-limited in test → reset the in-memory store by restarting backend
- Toast shows "[object Object]" → Pydantic 422 array reached JSX; check `flattenDetail` in `lib/api.ts`
- RSC inside client component → use slot pattern (pass as `ReactNode` prop from a server page)
