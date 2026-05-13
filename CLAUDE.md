# RunForACause — Project Brain

You are working on **RunForACause**, a crowd-funding run events portal for
Indian NGOs by Summit Solutions. This file is loaded into every Claude
session. Skim it before doing anything substantial.

For deeper detail see:
- `docs/PATTERNS.md` — architectural patterns and how features are wired
- `docs/CONVENTIONS.md` — code style + comment + naming rules
- `docs/RUNBOOK.md` — common ops + debugging recipes
- `frontend/CLAUDE.md` — frontend-specific conventions
- `backend/CLAUDE.md` — backend-specific conventions

## What this is

A crowd-funding platform for cause-based run events in India:
- Verified NGOs host fundraising run events
- Runners commit to a distance, build a public fundraising page
- Donors sponsor per-km or fixed amount; funds sit in escrow
- Distance is verified (Strava / Apple Health / screenshot) before payouts
- Every rupee is publicly auditable — gross / fees / net / UTR / utilisation
- 80G receipts auto-generated for eligible donations

Three primary roles: `super_admin`, `event_manager`, `runner`. Donors are
implicit (anyone can sponsor without an account, though we capture donor
data for receipts).

## Stack

- **Frontend**: Next.js 15 App Router, React 19 RC, TypeScript strict, Tailwind, framer-motion, recharts, lucide-react
- **Fonts**: Fraunces (display, serif), Inter (body), Barlow Condensed (eyebrows), JetBrains Mono (numbers)
- **Backend**: FastAPI, Python 3.11/3.12, async SQLAlchemy 2.0, Alembic
- **DB / cache**: PostgreSQL 15, Redis (notifications + rate limit ready)
- **Payments**: Razorpay (test mode + mock fallback)
- **Email**: Resend (with console fallback when no key)
- **PDFs**: ReportLab (80G receipts, runner certificates, analytics reports)
- **Testing**: pytest (backend), Vitest + React Testing Library (frontend)
- **Linting**: Ruff (backend), ESLint + Prettier (frontend)

## One-command run

```powershell
npm run dev        # backend + frontend concurrently
npm run migrate    # apply alembic migrations
npm run seed       # populate demo data
npm run reset      # destroy DB + reseed (Windows only)
npm test           # run all tests (root delegates to both subprojects)
```

## Test credentials (always use these in dev)

| Role | Email | Password |
|---|---|---|
| Super-admin | `admin@runforacause.in` | `Admin@1234` |
| Manager (Asha Foundation) | `contact@ashafoundation.in` | `Manager@1234` |
| Manager (Green Earth) | `contact@greenearth.in` | `Manager@1234` |
| Runner | `meera.gupta@example.com` | `Runner@1234` |
| Runner (any seeded) | `<name>@example.com` | `Runner@1234` |

## Brand & design

- **Direction**: warm editorial. NOT dark sport magazine (user explicitly reverted that).
- **Primary**: marathon-orange `#ED6C0F` (warm, NOT electric)
- **Secondary**: forest green `#2D6A4F`
- **Ink**: `#1A1612` / Cream canvas: `#FBF6EE` / Peach: `#FFE4CB`
- **Accents**: gold `#C9A04D` for "verified" badges, danger red for destructive
- Display headings: Fraunces serif, mixed case, italic accents on key words. NOT all-caps Barlow Condensed.
- Buttons: parallelogram clip-path acceptable as a sport accent on primary CTAs only.
- Cards: subtly rounded, soft shadows, white surface on cream canvas.

## Critical conventions

- **Money**: `DECIMAL(12,2)` in DB. Frontend: `formatCurrency()` from `@/lib/utils` (renders `₹` with Indian grouping)
- **Dates (visible)**: ALWAYS use `formatDate(iso)` → `"08-05-26"` or `formatDateTime(iso)` → `"08-05-26, 5:30 PM"` from `@/lib/utils`. Both are IST-locked dd-mm-yy. **Never** call `toLocaleDateString()` directly.
- **Timezone**: store UTC, display IST.
- **TypeScript**: `strict: true`. Never use `any`. Prefer `unknown` + narrowing, or define a type
- **Validation at boundaries only**: Pydantic models on API input, Zod or hand-rolled at form submission
- **Auth**: JWT in httpOnly cookie. Role guards via `Depends(require_admin)` etc.
- **Audit log**: every mutating endpoint calls `log_action(db, entity_type, action, actor=user, ...)`. It's append-only.
- **Every page MUST have**: loading state, empty state, error state, mobile-responsive breakpoints
- **CMS first**: every visible string + image admin will want to change MUST be editable via `/admin/content`. Hardcoding text in components is a regression — use the site_settings pattern (see `docs/PATTERNS.md`).

## Known gotchas (Windows + Next.js 15 + edge cases)

- **OG image routes MUST use `runtime = "edge"`**. Node runtime crashes on Windows (`@vercel/og` mangles its bundled-font path: `.\\file:\\C:\\...` → Invalid URL → connection drop mid-stream)
- **Satori (next/og)** requires `display: "flex"` on EVERY container with multiple children. Bare text alongside elements crashes — wrap in `<span>`. Use null-chained property access only (`event?.organisation?.name`, never `event?.organisation.name`)
- **Edge runtime + localhost**: in Next.js dev, edge functions sometimes fail to resolve `localhost`. Replace with `127.0.0.1` for backend fetches inside OG routes
- **Browser extensions** inject attributes into `<html>` and `<body>` — both have `suppressHydrationWarning` for that reason. Don't remove them
- **Slugs have hex suffix** (e.g. `run-for-education-2026-9f48af`). NEVER hardcode slugs in instructions. Query the DB or use the `find-slugs` skill
- **PowerShell + alembic** prints stderr that PS interprets as error; the migration is actually working. Look for the `Running upgrade ...` line. Use `$env:PYTHONIOENCODING="utf-8"` so emoji print correctly
- **Rate limiter**: we have our own in `backend/app/utils/rate_limit.py`. Don't pull in SlowAPI
- **Hydration & date formatting**: rendering `new Date(...).toLocaleString()` server-side then client-side produces mismatch. Use `formatInTimeZone` or render only after mount
- **Image src=""**: Next.js `<Image>` rejects empty strings. Always check `imageUrl ? <Image src={imageUrl}> : <Fallback>` — empty string is falsy so this works
- **DEFAULT spread bug**: `{...DEFAULTS, ...props}` — if a prop is `""` it overrides DEFAULTS. Always `value && value.trim() !== '' ? value : DEFAULTS.value` for hero-critical fields
- **Pydantic 422 toast crash**: FastAPI validation errors are `detail: [{type, loc, msg, ...}][]`. `ApiError` in `lib/api.ts` flattens them via `flattenDetail()` — always use `err.detail ?? err.message` for toasts, never `err.detail` raw (it's already a string after flattening, but old call sites may still hit the raw path)
- **RSC inside client component**: you can't import a Server Component from a `"use client"` file. Use the slot pattern — render the RSC in a server page and pass it as `ReactNode` prop into the client component (see `PATTERNS.md` §19)
- **Brand wordmark**: accent colour is always on `cause` — `runfora<span className="text-primary-500">cause</span>`. NOT on `for`. Applied in Logo.tsx, BrandLoader.tsx, and 4 OG routes

## Where things live

```
backend/
├── app/
│   ├── models/         SQLAlchemy models. All imported in __init__.py for Alembic discovery
│   ├── routers/        FastAPI routers. Registered in main.py
│   ├── services/       Domain logic (payment, email, achievement, account, storage, ...)
│   ├── schemas/        Pydantic models for IO
│   ├── utils/          security, logger, rate_limit, slugs
│   ├── tasks/          Celery tasks (TBD; add when needed)
│   ├── config.py       pydantic-settings, env-driven
│   ├── database.py     async session + engine
│   ├── dependencies.py Auth/role guards
│   └── main.py         FastAPI app, router registration, Sentry init, lifespan
├── alembic/versions/   Numbered migrations (0001-0011 applied). New = 0012_<slug>.py
├── tests/              pytest tests
├── uploads/            local storage backend writes here (gitignored)
└── .venv/              Python venv

frontend/
├── app/
│   ├── (public)/       Unauthenticated pages
│   ├── (auth)/         Login + register
│   ├── (dashboard)/    Role-gated dashboards
│   │   ├── admin/, manager/, runner/, account/, me/
│   ├── og/             Dynamic OG image routes (edge runtime)
│   ├── actions/        Server actions
│   ├── api/            Optional Route Handlers
│   ├── globals.css     Tailwind + custom keyframes + utilities
│   ├── layout.tsx      Root layout — fonts, ConsentBanner, InstallPrompt, ScrollProgress
│   ├── error.tsx       Branded global runtime error
│   ├── not-found.tsx   Branded 404
│   ├── sitemap.ts      Dynamic sitemap
│   └── robots.ts       Disallow dashboards
├── components/
│   ├── landing/        Home page sections (HeroSection, HowItWorks, ...)
│   ├── dashboard/      StatCard, charts, tables
│   ├── shared/         Reusable UI primitives (Button, Modal, Tilt3D, ConsentBanner, ...)
│   ├── layout/         Navbar, Footer, DashboardSidebar, NewsletterForm
│   ├── runner/, donations/, events/, runners/, manager/  Domain-specific
├── lib/                api client, hooks, utils, formatters, iconMap
├── types/              Shared TS interfaces
└── public/             Static assets (icons, manifest, fonts/)
```

## Don't-do list

- Don't add scroll-down chevrons or scroll-driven parallax to the hero (locked, see memory)
- Don't propose dark sport-magazine UI (locked, see memory `feedback_runforacause_design`)
- Don't ship hardcoded fake numbers on dashboards (e.g. `+12.4%` trend before MoM data was real)
- Don't break the CMS pattern — every new visible string MUST be editable via `/admin/content`
- Don't use `any` in TS, don't `# type: ignore` without an explanatory comment
- Don't add console.* outside `instrumentation.ts` and error handlers
- Don't `git commit` unless explicitly asked
- Don't run destructive ops (rm -rf, drop table, force-push) without consent
- Don't pull SlowAPI / @types/canvas-confetti / unnecessary deps when an in-tree alternative exists
- Don't skip writing the loading + empty + error states for any new page

## Recent feature additions (2026-05-08, migrations 0009 + 0010 + 0011)

Schema added in `0009_phase_features`:
- `event_runners.consecutive_days`, `longest_streak`, `checked_in_at`, `team_id`
- `corporate_sponsors.match_type` (multiply/fixed_add/percentage), `match_value`, `starts_at`, `ends_at`
- `events.city`, `latitude`, `longitude` (for India-map / city filtering)
- `users.whatsapp_opted_in`
- New table `event_teams` (id, event_id, name, slug, captain_id, totals)

Schema added in `0010_strava_tokens`:
- `users.strava_athlete_id` (BigInteger), `strava_access_token`, `strava_refresh_token`, `strava_expires_at`

Schema added in `0011_cause_awareness`:
- `causes.awareness_blocks` (JSONB array of `{title, body, source_url?}`) — manager-edited per cause; rendered on every runner profile under that cause as the "Why this cause matters" section

Endpoints added/extended:
- `GET /events/?search=&format=&city=&category=` — search now covers title + description + city; new `format` and `city` filters
- `GET /events/map?category=` — slim payload for the India discovery map (only events with lat/lng populated)
- `GET /events/{id}/insights` (manager-only) — AI-backed when `ANTHROPIC_API_KEY` set; deterministic rule-based fallback otherwise
- `POST /events/{id}/draft-impact` (manager-only) — markdown draft for the impact-report editor; AI + rule-based fallback (D5)
- `GET /events/{id}/exports/analytics.pdf` (manager-only) — landscape A9 board-report PDF (totals + top runners + top donors)
- `GET /donations/by-event/{event_id}` — public donor wall, anonymous donors masked
- `POST /event-runners/{id}/checkin` (manager-only, idempotent) + `GET /event-runners/{id}/qr.svg` — QR check-in flow (D8)
- `POST /auth/sms-otp/request` + `POST /auth/sms-otp/verify` — D6 phone-OTP login (Redis-style in-memory bcrypt store; uses MSG91 when keyed, dev-logs the OTP otherwise)
- `PUT /auth/me` — now accepts `whatsapp_opted_in` so users can flip the toggle from `/account` (D1)
- `GET /strava/me-status` + `GET /strava/authorize` + `GET /strava/callback` + `POST /strava/sync` + `POST /strava/disconnect` — full C1 OAuth flow with HMAC-signed state, token-refresh window, auto-import last 14 days as SUBMITTED distance logs across all active event_runners
- `GET /events/{id}/teams` + `POST/PUT/DELETE /teams/...` + `PUT /event-runners/{id}/team` — Teams (D2)
- `POST /events/{id}/sponsors` etc. — extended with `match_type` enum + `match_value` + `starts_at`/`ends_at` (A2 + D3); `match_funding_service` honors active windows + match_type

Services added:
- `app/services/streak_service.py` — `recompute_streak(event_runner_id, db)`; called from distance-log approval. Walks contiguous IST calendar days backward from today; tolerates 1-day gap for today's not-yet-logged run
- `app/services/insights_service.py` — `generate_insights(event_id, db)` (3-bullet manager summary) + `draft_impact_report(event_id, db)` (4-paragraph markdown draft); both Anthropic-backed when `ANTHROPIC_API_KEY` set, rule-based fallback otherwise
- `app/services/whatsapp_service.py` — Gupshup transactional WhatsApp send; no-op without keys; auto-fanned-out by `notify()` when `users.whatsapp_opted_in = TRUE`
- `app/services/sms_service.py` — MSG91 SMS OTP; opt-in via `MSG91_*` keys; OTP request/verify endpoints stubbed for when keys land
- `app/services/strava_service.py` — Strava OAuth helpers (`authorize_url`, `exchange_code`, `refresh_access`, `list_recent_activities`); raises `RuntimeError("strava_not_configured")` until keys are set
- `app/scheduler.py` — APScheduler with three jobs (hourly hard-purge, daily auto-settle, daily/weekly digest); opt-in via `ENABLE_SCHEDULER=1`

Frontend pages added:
- `app/(public)/events/EventsBrowser.tsx` — client search/cause/format chips on `/events`
- `app/(public)/map/page.tsx` + `components/map/IndiaMap.tsx` — India cause discovery map (Leaflet via `dynamic({ssr:false})`, OSM tiles, divIcon dots colored by cause). CMS keys: `map.heading`, `map.subtitle`. Linked from Footer + sitemap.
- `app/(public)/checkin/[id]/page.tsx` — manager-facing QR landing page (D8) calling the protected check-in endpoint
- `app/(dashboard)/manager/events/[id]/volunteers/page.tsx` — confirm/decline volunteer signups, status filter, role capacity
- `app/(dashboard)/manager/events/[id]/sponsors/page.tsx` — A2 + D3 corporate sponsor CRUD (match_type editor, time-boxed window pickers)
- `app/(dashboard)/manager/events/[id]/teams/page.tsx` — D2 team CRUD with per-team totals
- `app/(dashboard)/manager/events/[id]/checkin/page.tsx` — D8 manager check-in dashboard (search + tap-to-check-in fallback)
- `app/(dashboard)/runner/activity/page.tsx` — notification stream feed at `/runner/activity` (IST timestamps, unread dot)
- `app/widget/event/[slug]/page.tsx` + `app/widget/layout.tsx` — D4 iframe-friendly fundraiser widget (chrome-stripped, transparent body)
- `components/events/TeamLeaderboard.tsx` — public team leaderboard server component for event detail
- `components/events/EmbedSnippet.tsx` — copy-paste `<iframe>` snippet
- `components/runner/CheckInQR.tsx` — runner-side QR display card
- `components/runner/StravaConnect.tsx` — Connect / Sync / Disconnect Strava card on the runner profile page (C1). Hides itself if `/strava/me-status` returns 503 (keys not configured)
- `components/runner/RunnerEventControls.tsx` — combined per-event team-picker (D2) + check-in QR (D8); mounted on `/runner/profile` inside each event card. Team picker auto-hides when manager hasn't created teams.
- `app/(auth)/login/page.tsx` — extended with Email/Phone tab toggle for the D6 SMS-OTP flow

Components that were standalone — now mounted in pages:
- `TeamLeaderboard` rendered above the Runners block on event detail (auto-hides when no teams)
- `DonorWall` rendered below TeamLeaderboard on event detail (A3 — auto-hides when no captured donations)
- `EmbedSnippet` rendered in the right rail of event detail
- `CheckInQR` mounted via `RunnerEventControls` on the runner profile (per active event)
- `StreakChip` (A7) mounted in the per-event header on `/runner/profile` — flame brightens once `consecutive_days > 0`, shows all-time best as tabular suffix
- "Analytics PDF" button (A9) next to existing CSV exports on `/manager/events/[id]`
- "Draft with AI" button (D5) on `/manager/events/[id]/impact-report` — calls `POST /events/{id}/draft-impact`, pastes markdown into the editor
- `/manager/causes` — manager + super-admin Cause CRUD with awareness-block fact editor (max 8 facts/cause, dd-mm-yy IST timestamps)
- `components/runner/AwarenessBlocks.tsx` — server-rendered "Why this cause matters" slot mounted between Achievements and Donor wall on `/runners/[username]`; auto-hides when no blocks set
- `components/shared/ShareButton.tsx` — universal `navigator.share` button with copy-fallback; mounted on event detail (right rail), manager event header
- Top nav: "NGOs" → "Organisers"; manager sidebar "Organisation" → "Organiser"; super-admin sidebar gains "Create event" + "Causes"
- Brand wordmark: orange now on `cause` (was on `for`) — 6 places (Logo, BrandLoader, 4 OG routes)
- Pydantic 422 toast fix: `lib/api.ts` flattens validation-error arrays to readable strings (was crashing forms with React-child error)
- Super-admin can create events: `EventCreate.organisation_id` (admin-only field), org dropdown on the new-event form, sidebar entry
- `components/layout/MobileBottomNav.tsx` — A5 per-role mobile bottom-tab nav (5 tabs each for super_admin / event_manager / runner / donor)
- `app/global-error.tsx` — root-layout-crash fallback (the existing `app/error.tsx` covers below-root errors)

OG image variants (F4 complete):
- `/og/event/[slug]` (existing) — per-event card with title, cause, raised, %, runners
- `/og/organisation/[slug]` — verified-NGO card with 80G badge + lifetime stats
- `/og/leaderboard/[slug]` — top-3 podium card; first place gets cream-orange fill, others white-on-cream
- All three wired into the respective page's `openGraph.images` + `twitter.images`

UI polish added (Round 7, 2026-05-08):
- `public/icon.svg` — redrawn runner silhouette (proper running-pose anatomy: head, torso lean, arm swing, stride); used as SVG favicon in all modern browsers. PNG icons unchanged (PWA manifest + Apple icons still reference icon-192.png / icon-512.png).
- `components/shared/Logo.tsx` — squircle logomark (iOS-style rounded-square, `borderRadius: "30%"`) replaces the circle; embedded runner SVG redrawn with proper proportions at 32x32; `layout.tsx` now also includes `shortcut` icon (PNG fallback for legacy browsers).
- `components/layout/DashboardSidebar.tsx` — sidebar footer now shows the user's role label below their name, plus a `PencilLine` icon link to `/account` for one-click profile editing. Visible to all roles.
- `docs/PATTERNS.md` — §17 Pydantic 422 flattening, §18 Share button, §19 RSC slot pattern, §20 Date formatters, §21 Awareness blocks all documented.
- `docs/CONVENTIONS.md` — Date/time formatting rule, brand wordmark rule, Pydantic 422 handling rule added.
- `docs/RUNBOOK.md` — "Test the share button", "Verify the favicon", "Verify awareness blocks" recipes added; common gotchas index updated.

Ops added:
- `.github/workflows/ci.yml` — postgres + redis services, ruff, alembic upgrade, pytest, vitest, tsc, next build
- `.github/workflows/lighthouse.yml` — Lighthouse CI on PRs that touch `frontend/**`, runs against built site for /, /events, /causes, /transparency, /map (F1)
- `.github/dependabot.yml` — weekly deps; React 19 RC pinned
- `scripts/backup_db.sh` — daily Postgres dump → gzip → optional S3, 30-day local retention
- `app/scheduler.py` — APScheduler in-process; opt-in via `ENABLE_SCHEDULER=1` (B3)
- `app/services/kyc_verification_service.py` — Razorpay Fund Account Validation (penny-drop) — gated to `rzp_live_*` keys; admin endpoint `POST /organisations/{org_id}/penny-drop` (E2)
- `vitest-axe` integrated in `vitest.setup.tsx` — component tests can assert `axe(container).violations` empty (F2)
- `docs/OPS.md` — health monitor recommendations, audit recipes, integration rollout sequence (B5 + F docs)
- `docs/DNS_AND_SECRETS.md` — full production cutover walkthrough: Resend DNS records, Razorpay live keys, penny-drop, SECRET_KEY rotation, CORS, iOS PWA preflight, go-live checklist (E1 + E3)
- `.env.example` — full set of optional integration keys (Sentry, Anthropic, Gupshup, MSG91, Strava, scheduler toggle)
- `app/main.py` lifespan — extra production-readiness errors (EMAIL_PROVIDER=console, FRONTEND_URL=localhost, FROM_EMAIL domain mismatch)
- `app/layout.tsx` — `apple-touch-icon` PNG (iOS Safari can't use SVG), `viewport-fit=cover`, `statusBarStyle: black-translucent` (E6)
- `public/illustrations/empty-{events,donations,runners,inbox,search,teams}.svg` — hand-coded brand-aligned editorial SVGs; `EmptyState` accepts `illustration` prop (F3 / E7); applied on /events search empty, /map empty, /runner/activity, manager teams/sponsors/volunteers empties

## Memory pointers (older context, available across sessions)

- `feedback_runforacause_design.md` — warm editorial direction, NOT sport magazine
- `feedback_runforacause_no_scroll_indicators.md` — no scroll button on hero, no scroll parallax
- `project_runforacause_scope.md` — full proposal scope
- `feedback_ruthless_trainer.md` — strict accountability tone (different project)

## Skills available (`.claude/skills/`)

| Skill | When to use |
|---|---|
| `reset-kyc` | Reset NGO KYC status to test the submission/approval flow again |
| `find-slugs` | Look up event / runner / org slugs (they have hex suffixes) |
| `smoke-test-routes` | Quick HTTP check on every critical route after big changes |
| `new-migration` | Scaffold a new Alembic migration with the correct down_revision |
| `new-cms-setting` | Add a new editable site setting end-to-end |
| `new-dashboard-page` | Scaffold a role-gated dashboard page with all required states |
| `new-og-route` | Create a new OG image route with all the gotchas baked in |
| `preview-pdf` | Generate a sample 80G receipt or runner certificate to preview design changes |
| `run-purge` | Trigger DPDP hard-purge for soft-deleted accounts |
| `seed-galleries` | Populate sample gallery photos on existing approved runners |
| `seed-pending-distance` | Inject pending distance entries to test the manager approval queue |
| `geocode-events` | Auto-fill event lat/lng from city via Nominatim (free OSM) |
| `verify-org-kyc` | Approve an NGO's KYC submission via API |
| `reseed-all` | Wipe + reseed the DB (DESTRUCTIVE — confirm first) |
| `send-test-email` | Render and dispatch a templated email so you can preview |
| `pwa-icon-rebuild` | Regenerate PWA PNG icons from the brand SVG |

Run any skill via the user typing `/<skill-name>`.

## When in doubt

1. Check if a related pattern already exists in `docs/PATTERNS.md`
2. Search the codebase for an analogous implementation
3. Prefer extending existing components / services over creating new ones
4. Match the existing file/folder/naming conventions exactly
5. Add tests if you touched a backend service or critical frontend logic
6. Update the relevant `CLAUDE.md` if you discover a new gotcha worth recording
