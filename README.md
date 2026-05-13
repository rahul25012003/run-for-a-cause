# RunForACause

A transparent crowd-funding portal for cause-based run events in India.
NGOs host events, runners log distance, donors sponsor by the kilometre — and
every rupee is auditable.

Built by [Summit Solutions](mailto:hello@summitsolutions.in).

---

## What's in this milestone (M1)

- Three-tier auth: Super Admin, Event Manager, Runner (+ guest donors)
- Organisation onboarding with KYC fields and admin verification flow
- Cause → Event → Runner hierarchy
- Public event browse + event detail page
- Public runner profile page (the conversion engine — mobile-first, shareable)
- Donation modal with Razorpay test-mode integration
- Per-km and fixed donation types
- Distance log submission + manager approval workflow
- Public `/audit/[event-id]` transparency page (gross → fee → net payout)
- Append-only audit log on every state change
- Role-aware dashboards for admin / manager / runner
- Seed data: 1 admin, 2 NGOs, 3 events, 8 runners, 20 donations

## Tech stack

| Layer       | Choice                                                           |
| ----------- | ---------------------------------------------------------------- |
| Frontend    | Next.js 15 (App Router) · TypeScript strict · Tailwind · Zustand · TanStack Query |
| Backend     | FastAPI · SQLAlchemy 2.0 (async) · Pydantic v2 · structlog       |
| Database    | PostgreSQL 15                                                     |
| Cache/Queue | Redis 7 + Celery (worker scaffolded)                              |
| Payments    | Razorpay (test mode by default; falls back to mock if SDK absent)|
| Auth        | JWT in httpOnly cookie · bcrypt · TOTP scaffold for super-admin   |
| Infra       | Docker Compose for the full local stack                           |

## Quick start

```bash
# 1. Clone and configure
cp .env.example .env
# (fill in any Razorpay test keys you have; defaults work for the mock fallback)

# 2. Bring everything up
make up

# 3. Run migrations
make migrate

# 4. Seed sample data
make seed

# 5. Open the app
# Frontend: http://localhost:3000
# Backend docs: http://localhost:8000/docs
```

### Seeded credentials

| Role          | Email                        | Password    |
| ------------- | ---------------------------- | ----------- |
| Super Admin   | `admin@runforacause.in`       | `Admin@1234` |
| Event Manager | `contact@ashafoundation.in`  | `Manager@1234` |
| Event Manager | `contact@greenearth.in`       | `Manager@1234` |
| Runner        | `ravi.kumar@example.com` (& 7 others) | `Runner@1234` |

## Architecture

```
                       ┌──────────────┐
                       │  Next.js 15  │   (public + dashboards)
                       └──────┬───────┘
                              │  REST + httpOnly cookies
                       ┌──────▼───────┐
                       │   FastAPI    │   ──► Razorpay (orders, webhooks)
                       └──────┬───────┘   ──► AWS SES / Resend (email)
                              │
                  ┌───────────┼───────────┐
                  │           │           │
            ┌─────▼─────┐  ┌──▼──┐  ┌─────▼─────┐
            │ Postgres  │  │Redis│  │  S3 / R2  │
            └───────────┘  └─────┘  └───────────┘
```

## Project structure

```
backend/
  app/
    config.py, database.py, dependencies.py, main.py
    models/        SQLAlchemy ORM
    schemas/       Pydantic request/response
    routers/       FastAPI endpoints (auth, events, runners, donations…)
    services/      Business logic (donations, payments, audit log)
    utils/         security, logger, slug generation
  alembic/         migrations
  seed.py          dev seed data

frontend/
  app/
    (public)/      landing, events, runners, causes, transparency
    (auth)/        login, register, forgot-password
    (dashboard)/   admin/, manager/, runner/
    audit/         /audit/[eventId] public page
  components/
    landing/, events/, runner/, donations/, dashboard/, layout/, shared/
  lib/             api client, helpers
  types/           TypeScript types mirroring backend schemas
```

## Common tasks

```bash
make logs                # tail backend + frontend logs
make migrate             # apply latest Alembic migration
make revision m="add x"  # create a new migration
make shell-db            # psql shell into the database
make redis-cli           # Redis CLI
make down                # stop everything
```

## What's next (M2 onwards)

- Strava OAuth for automated distance sync
- Recharts on dashboards (donation charts, distance heatmaps)
- 80G PDF receipts (ReportLab)
- Achievement / milestone engine
- Email templates (Resend) for milestone notifications
- Settlement engine (per-km true-up + refund flow)
- Match-funding / corporate sponsorship module
- DPDP consent flows + data export

## Deployment

- **Backend**: deployable as-is to Railway / Render / Fly.io. Use a managed Postgres and Redis. Set `COOKIE_SECURE=true` and `CORS_ORIGINS` to your production domains.
- **Frontend**: Vercel or Cloudflare Pages.
- **Razorpay**: client must complete KYC under their legal entity; sub-merchant access via Razorpay Route is required for the payout flow shipped in M2.

## License

Proprietary — © Summit Solutions. All rights reserved.
