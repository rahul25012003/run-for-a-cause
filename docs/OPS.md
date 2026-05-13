# Operations runbook

Companion to `RUNBOOK.md`. This file covers production concerns:
monitoring, accessibility audit, performance tuning, OG-image checks,
and the integration-key rollout sequence.

## Health monitoring (B5)

The backend exposes `GET /health` (already in `main.py`). Point any of
these at it; they're free-tier sufficient for an early-stage NGO product.

| Service | Free tier | Why |
|---|---|---|
| **UptimeRobot** | 50 monitors, 5-min interval | Easiest setup, India-friendly latency tests |
| **BetterStack (Better Uptime)** | 10 monitors, 30-sec interval | Fastest reaction, status page included |
| **Cronitor** | 5 monitors | Has APScheduler heartbeat support — useful for our cron jobs |

Recommended setup:
1. Public health endpoint: `https://api.runforacause.in/health`
2. DB health (private): hit `https://api.runforacause.in/health?deep=1` from
   inside your VPC if you add a deep variant later (it does a `SELECT 1`)
3. Frontend up: `https://runforacause.in` returns 200
4. Email-on-fail to ops alias

**Alert tuning:**
- Don't alert on a single failed ping; require 2 consecutive (12s recovery margin)
- Severity: page on `/health` down >2 min, ping on `/health` down 30s
- Quiet hours: don't page between 23:00 and 06:00 IST unless response time >5 s
  (most issues at that hour are India ISP routing, not us)

## Lighthouse / Web Vitals (F1)

The brand commits to LCP < 2.5s and INP < 200ms on a 4G profile. Audit
periodically:

```powershell
# CLI run against the live homepage
cd frontend
npx lighthouse http://localhost:3000 --output=html --output-path=./lighthouse.html --view --preset=mobile
```

Key things we already do:
- `next/image` with `priority` only on the hero image (homepage)
- Recharts dynamic-imported (`ssr:false`) — heavy chart not in initial JS
- Leaflet dynamic-imported on `/map`
- `revalidate: 30-60` on listing pages — fetched once per minute, served as
  static HTML in between

When LCP regresses, look at:
1. Largest hero image — must have explicit `width`/`height` and `priority`
2. Web fonts — Fraunces is heaviest. We use `display: swap` already
3. Above-the-fold animations — check `prefers-reduced-motion` is honored

## Accessibility audit (F2)

We commit to WCAG 2.1 AA. Run axe periodically:

```powershell
cd frontend
npx @axe-core/cli http://localhost:3000 --include="main"
npx @axe-core/cli http://localhost:3000/events
npx @axe-core/cli http://localhost:3000/admin --headers='Cookie:access_token=...'
```

**Things we've explicitly verified pass:**
- Colour contrast on cream canvas (#FBF6EE) with ink-900 (#1A1612) text — 14.6:1
- Every form has `<label htmlFor>` linkage (run `Grep "htmlFor" frontend/components` to spot-check)
- Decorative icons have `aria-hidden`, meaningful icons have `aria-label`
- Mobile bottom nav uses `<nav aria-label="Primary">` and `aria-current` on active tab
- Map page has a `role="region"` + accessible label on the map container

**Watch for:**
- Tilt3D and parallax components must respect `prefers-reduced-motion` (framer-motion does by default — don't override)
- Modal traps focus on open and restores it on close (DonationModal pattern)

## OG image polish (F4)

Every dynamic OG route MUST:
1. Use `runtime = "edge"` (Windows asyncio bug otherwise)
2. Use `127.0.0.1` (not `localhost`) for backend fetches inside the route
3. Wrap bare text alongside elements in a `<span>` (Satori limitation)
4. Use only null-chained property access (`event?.organisation?.name`)

To verify locally:
```powershell
# After dev server is up
curl http://localhost:3000/og/event/<event-slug> -o og.png
# Open og.png — should be 1200x630, no broken layout
```

## Empty state illustrations (F3)

We currently use Lucide icons in `<EmptyState>` — Inbox / Users / etc.
For more delight, we can swap in custom SVG illustrations:

- Source: undraw.co (free, recoloured to `#ED6C0F` primary)
- Drop into `frontend/public/illustrations/<name>.svg`
- Pass via `<EmptyState icon={<img src="/illustrations/empty-events.svg" alt="" className="w-32 h-32" />}>`

Skipped for now — needs a designer pass before shipping (icons are perfectly
adequate for the launch date).

## Integration rollout sequence

Order in which to flip on the optional integrations:

1. **Sentry** — buy / set up project, paste `SENTRY_DSN` into env, restart
2. **Anthropic** — get API key, set `ANTHROPIC_API_KEY` — AI insights + impact draft activate immediately
3. **Razorpay live keys** — switch `RAZORPAY_KEY_ID` from `rzp_test_*` to `rzp_live_*`. Verify in Razorpay dashboard that webhook secret matches.
4. **Resend production sender domain** — DKIM + SPF on `runforacause.in`, then `EMAIL_PROVIDER=resend` + `RESEND_API_KEY=re_...`
5. **APScheduler** — set `ENABLE_SCHEDULER=1` on **exactly one** worker. Verify in logs: `scheduler.started`.
6. **Daily DB backups** — drop `scripts/backup_db.sh` into a nightly cron on the DB host. Verify a backup file appears.
7. **WhatsApp** — Gupshup application approved → set `GUPSHUP_*` keys → users with `whatsapp_opted_in` start getting messages
8. **SMS OTP** — MSG91 DLT template approved → set `MSG91_*` keys → optional passwordless flow lights up
9. **Strava** — register at strava.com/settings/api, set `STRAVA_*` keys, deploy migration 0010 (`users.strava_access_token / refresh_token / expires_at`) when needed

## Deep purge (DPDP)

If a user requests immediate deletion (not just soft-delete + 30-day grace),
use the `run-purge` skill. Otherwise the APScheduler `hard_purge` job
runs hourly and cleans up automatically.
