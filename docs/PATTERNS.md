# Architectural Patterns

This document is the canonical reference for HOW features are wired in
RunForACause. Read it before adding a new feature — there's almost certainly
an existing pattern to extend.

---

## 1. The CMS pattern (site_settings)

**Goal**: every visible string and image must be editable by super-admin
without a code deploy.

**Pieces**:
- DB table: `site_settings` (`key`, `value`, `value_type`, `label`, `group`,
  `description`, `is_public`, `sort_order`)
- Seed: `backend/app/seed_settings.py` upserts defaults idempotently
- Public API: `GET /site-settings/` returns `{ key: value }` for `is_public=true`
- Admin API: `GET /site-settings/admin` (full list), `PUT /site-settings/admin/{key}`
- Frontend reader: `fetchPublicSettings()` from `lib/hooks/useSiteSettings.ts`
- Frontend admin UI: `app/(dashboard)/admin/content/page.tsx` (text / longtext / url / image / json / video editors)
- Cache invalidation: server action `revalidateContentCache()` (calls `revalidateTag("site-settings")` + `revalidatePath` for affected routes)

**Three value-type subtypes**:
- `text` / `longtext` / `url` — plain string
- `image` — string URL, rendered with `FileUploadDropzone` in the admin UI
- `json` — JSON-encoded blob (arrays of objects). Parsed via `parseJsonSetting<T>(raw, fallback)`. Editor uses `JsonEditor` component with live validation + pretty-print.

**Adding a new editable string** (use `/new-cms-setting` skill, or by hand):
1. Add a default to `seed_settings.py`'s `DEFAULTS` array
2. Run `python -m app.seed_settings` (idempotent; only inserts new keys)
3. In the consuming component, read via `s["my.key"]` from `fetchPublicSettings()`
4. Provide a hardcoded fallback so the component renders before settings load: `s["my.key"] || "default text"`

**JSON setting** (e.g. HowItWorks 4 steps):
1. Type: `SettingType.JSON`
2. Default value: a JSON string (escape with `\\`)
3. Component reads via `parseJsonSetting<MyShape[]>(s["howitworks.steps"], DEFAULT_STEPS)`

---

## 2. Role guards & resource ownership

**Two layers** of authorization:

```python
@router.put("/me")
async def update_me(
    payload: UserUpdate,
    user: Annotated[User, Depends(get_current_user)],   # Layer 1: must be authenticated
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserPublic:
    # Layer 2: not needed for /me — user IS the resource

@router.put("/runners/{runner_id}")
async def update_runner(
    runner_id: UUID,
    payload: EventRunnerUpdate,
    user: Annotated[User, Depends(get_current_user)],   # Layer 1: must be authenticated
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunnerOut:
    runner = await db.get(EventRunner, runner_id)
    # Layer 2: ownership check — must be the runner OR super-admin
    if runner.user_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(403)
```

**Available guards** (`app/dependencies.py`):
- `get_current_user_optional` — None if no cookie; doesn't 401
- `get_current_user` — 401 if no cookie or invalid
- `require_manager` — 403 if not `EVENT_MANAGER` or `SUPER_ADMIN`
- `require_admin` — 403 if not `SUPER_ADMIN`

**Super-admin always passes manager checks** — there's no manager-only resource.

---

## 3. Audit log

Every mutating endpoint MUST log to `audit_logs`.

```python
from app.services.audit_service import log_action

await log_action(
    db,
    entity_type="event_runner",
    entity_id=er.id,
    action="event_runner.updated",   # Convention: "<entity>.<verb>"
    actor=user,                       # The User performing the action
    request=request,                  # Captures IP + UA
    before={"goal_km": old_goal},     # Optional: state before
    after={"goal_km": new_goal},      # Optional: state after
    metadata={"reason": "user req"},  # Optional: extra context
)
```

**Append-only** — never DELETE or UPDATE. Retention is 7 years for financial records (Income Tax Act).

---

## 4. Payment flow (Razorpay)

```
1. POST /payments/init      → server creates Razorpay order + Donation row (status=INITIATED)
2. Frontend opens Razorpay Checkout with the order_id
3. User completes payment in Razorpay's UI
4. POST /payments/capture   → server verifies signature, marks status=CAPTURED
5. payment_service.capture_payment() side effects:
   a. Update event_runner.amount_raised + donor_count
   b. Update event.total_raised + total_donors
   c. Notify the runner ("New sponsor: ...")
   d. compute_and_record_match() — apply corporate match-funding
   e. check_and_unlock() — fire achievement engine
6. Async (Celery / future): send 80G receipt email if eligible
7. Webhook /webhooks/razorpay handles refunds + edge cases
```

**Mock mode**: when `RAZORPAY_KEY_ID=rzp_test_dummy`, the backend skips real
order creation and capture verification. Useful for dev without a Razorpay
account. Toggle by setting real keys.

---

## 5. Storage abstraction

`backend/app/services/storage.py` defines a `StorageBackend` Protocol with
two implementations:

```python
class LocalStorage:    # writes to LOCAL_UPLOAD_DIR
class S3Storage:       # boto3-backed, requires `pip install boto3`
```

`get_storage()` returns the singleton matching `settings.STORAGE_BACKEND`
(`"local"` or `"s3"`). Routers don't care which:

```python
from app.services.storage import get_storage

public_url = get_storage().put(content=bytes_data, sub="images", ext="jpg")
```

To deploy to S3:
1. `pip install boto3`
2. Set env: `STORAGE_BACKEND=s3`, `S3_ACCESS_KEY=...`, `S3_SECRET_KEY=...`, `S3_BUCKET_NAME=...`
3. (Optional) `S3_ENDPOINT_URL=...` for S3-compatible providers (Cloudflare R2, Wasabi, DO Spaces)
4. (Optional) `S3_PUBLIC_URL=https://cdn.example.com` for a custom domain in front

---

## 6. Achievement engine

`backend/app/services/achievement_service.py` is **idempotent** — calling
`check_and_unlock(runner_id, db)` repeatedly never creates duplicate
achievements. It re-evaluates all rules every time and only inserts
achievements not yet earned.

**Rules** are a Python dict (`RULES`) keyed by `AchievementType`. The
super-admin can override titles/descriptions/icons via the
`achievement.rules` JSON setting (merged at unlock time by `_resolve_rules`).

**Email-worthy filter**: only the meaningful milestones
(`HALFWAY`, `GOAL_REACHED`, `FUNDRAISING_25K`, `FUNDRAISING_50K`,
`FUNDRAISING_1L`) trigger an email — small ones (first km, ₹10k) just
unlock badges silently to avoid spam.

**Triggers**:
- After donation capture (`payment_service.capture_payment`)
- After distance log approval (`routers/distance_logs.py`)

**Notification side-effect**: each unlock fires `notify(...)` so the runner
sees a bell badge in-app.

---

## 7. Notifications

Two-channel system:

**In-app** (`backend/app/services/notification_service.py` → `notify(...)`):
- Inserts a `notifications` row
- User sees it via the `NotificationsBell` component (polls
  `/notifications/unread-count` every 60s)

**Email** (only for high-value events):
- Donation captured (donor receives confirmation + receipt)
- Distance approved (donor sees the runner is making progress)
- Milestone unlocked (runner gets celebratory email — only for big ones)
- Tax receipt (with PDF attachment)

Failures in email send NEVER undo the underlying DB action. Always:

```python
try:
    await send_email(...)
except Exception as exc:
    logger.error("email_send_failed", error=str(exc))
```

---

## 8. Soft delete + redact (DPDP compliance)

User clicks "Delete account" on `/account`:

1. `DELETE /auth/me` with their email as confirmation
2. `redact_user(user)` mutates the row:
   - email → `deleted-{user.id.hex}@runforacause.local`
   - full_name → "Deleted user"
   - phone, avatar_url, bio, hashed_password → NULL
   - is_active → false
   - deleted_at → now
   - purge_scheduled_at → now + 30 days
3. Audit log: `user.account_deleted`
4. Cookie cleared; user is logged out

After 30 days, the future cron (or `POST /admin/dpdp/purge`) calls
`purge_expired_users(db)` which `db.delete(user)`. Donations and audit
logs survive (FK is `ondelete=SET NULL` so the financial trail is
preserved for tax/audit).

**Restore** is super-admin-only — the redacted email/name are gone
forever, but the row can be reactivated within the grace window.

---

## 9. Slug pattern (collision-resistant)

```python
def make_slug(text: str) -> str:
    base = slugify(text)
    suffix = secrets.token_hex(3)  # 6 hex chars
    return f"{base}-{suffix}"
```

**Why hex suffix**: human-readable + collision-proof. Two NGOs both
named "Asha Foundation" get distinct slugs (`asha-foundation-9f48af`
vs `asha-foundation-3c12bb`).

**Implication**: never hardcode slugs in tests, instructions, or seed
imports. Always look up via DB query (use the `find-slugs` skill).

---

## 10. OG image route pattern (the one that took 6 iterations)

`app/og/event/[slug]/route.tsx` and `app/og/runner/[slug]/route.tsx` are
the canonical examples. The pattern:

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";  // ⚠️ MUST be edge — Node breaks on Windows

export async function GET(_req, { params }) {
  const { slug } = await params;

  // 1. Fetch via 127.0.0.1, not localhost (edge runtime DNS quirk)
  const url = `${API_URL}/...`.replace("://localhost:", "://127.0.0.1:");
  const data = await safeJson(url);  // returns null on failure

  // 2. Compute defaults for every field — never let a null reach JSX
  const title = data?.title ?? "Default";
  const orgName = data?.organisation?.name ?? "RunForACause";  // ⚠️ optional chain ALL levels

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", ... }}>
        {/* ⚠️ Every container with children needs display: "flex" */}
        {/* ⚠️ Bare text must NOT be sibling of element — wrap in <span> */}
        <div style={{ display: "flex", ... }}>
          <span>label · {value}</span>  {/* ✅ wrapped */}
          {/* ❌ "label · " + <Icon /> would crash mid-stream */}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },  // ⚠️ Default font (Noto Sans) works on edge
  );
}
```

**Wiring into pages**: in `generateMetadata()` of the corresponding page,
add `openGraph.images` and `twitter.images` pointing to this route.

---

## 11. JSON setting + frontend pattern

For arrays of objects (e.g. HowItWorks 4 steps):

```ts
// Frontend type
export interface HowItWorksStep {
  icon: string;       // resolved via iconMap
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
}

// Component accepts an optional steps prop, falls back to hardcoded defaults
export function HowItWorks({ steps }: { steps?: HowItWorksStep[] }) {
  const items = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  return ...
}

// Page reads from settings
const items = parseJsonSetting<HowItWorksStep[]>(s["howitworks.steps"], []);
return <HowItWorks steps={items} />;
```

Defaults stay hardcoded in the component so the page works even before
seed runs. Settings JSON overrides at runtime.

---

## 12. Rate limiting

Token-bucket per (client IP, scope). Lives in `backend/app/utils/rate_limit.py`.

```python
from app.utils.rate_limit import RateLimitAuth

@router.post("/login")
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rate: RateLimitAuth = None,  # 10 / minute, burst 5
) -> AuthResponse:
    ...
```

Predefined limits in the same file:
- `RateLimitAuth` — 10/min, burst 5 (login, password reset)
- `RateLimitRegister` — 5/min, burst 3
- `RateLimitUpload` — 30/min, burst 10
- `RateLimitNewsletter` — 5/min, burst 3

Add a new limiter:

```python
MyLimit = Annotated[
    None,
    rate_limit("scope.name", per_minute=20, burst=8)
]
```

Returns HTTP 429 with `Retry-After` header on overage. In-memory only —
swap storage to Redis for multi-instance prod.

---

## 13. KYC gate (lock-after-verification)

`OrganisationUpdate` accepts PAN / GSTIN / 80G / bank fields, but the
endpoint rejects edits to those fields when `kyc_status == VERIFIED`:

```python
locked = kyc_locked_attempted_edits(payload, is_verified)
if locked:
    raise HTTPException(409, f"Cannot change after verification: {locked}")
```

Editing any KYC field while NOT verified auto-flips status back to
`SUBMITTED` so the super-admin queue picks it up again. This is the
DPDP / fraud-prevention industry pattern: post-verification immutability.

---

## 14. Email templates

`backend/app/services/email_service.py` houses `render_*` functions that
return `(subject, html)` tuples. Add new templates beside the existing
ones:

```python
def render_milestone_email(
    runner_first_name: str,
    event_title: str,
    milestone_title: str,
    ...
) -> tuple[str, str]:
    subject = f"🏅 {milestone_title} — {event_title}"
    html = f"""<div style="font-family:Inter,...">..."""
    return subject, html
```

Sending uses `EmailMessage` + `send_email()`. Backend selected by
`EMAIL_PROVIDER` env (`console` or `resend`).

Inline CSS only — most email clients strip `<style>` tags. No external
images (use base64 or skip).

---

## 15. Mouse parallax (3D hero effect)

Multi-layer technique, see `components/landing/HeroSection.tsx`:

```ts
const mx = useMotionValue(0);
const my = useMotionValue(0);

// Each layer gets a different transform amount
const photoX = useSpring(useTransform(mx, [-1, 1], [18, -18]), SPRING);
const lensX = useSpring(useTransform(mx, [-1, 1], [-9, 9]), SPRING);  // opposite direction
const vigX = useSpring(useTransform(mx, [-1, 1], [-4, 4]), SPRING);   // smaller, anchors

// onMouseMove sets mx/my from cursor position relative to the section
```

The opposite-direction trick on the mid-layer is what creates the
"looking through a window" depth illusion. Each layer also has springs
with different stiffness/damping so they feel weighty.

For video: SIBLING (not nested in Ken Burns scale loop) + `translateZ(0)`
+ `will-change: transform` to force its own GPU compositor layer.
Otherwise stacking transforms on `<video>` causes stuttering decode.

---

## 16. Page boilerplate (every dashboard page must)

```tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

export default function MyPage(): React.ReactNode {
  const [data, setData] = useState<MyType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setData(await api.get<MyType>("/endpoint"));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.detail ?? err.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Loading state
  if (loading) return <div className="p-10 flex items-center gap-2 text-ink-500">
    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
  </div>;

  // Empty / error state
  if (!data) return <div className="p-10 text-center">
    <p className="text-ink-700">No data yet.</p>
    <Link href="/..." className="btn-primary mt-4 inline-flex">CTA</Link>
  </div>;

  // Happy path
  return <div className="p-6 md:p-10">...</div>;
}
```

**Three required states** for every page:
1. Loading (spinner or skeleton)
2. Empty (illustrated, with a CTA)
3. Error (toast + recovery path)

Mobile: `p-6 md:p-10` is the standard responsive padding.

---

## 17. Pydantic 422 error flattening

FastAPI's validation errors have shape `{ detail: [{type, loc, msg, input, ctx}] }`.
Passing this array directly to a React child crashes with "Objects are not valid as a React child."

**Fix lives in `frontend/lib/api.ts` — `flattenDetail()`**:

```ts
function flattenDetail(detail: unknown): string | undefined {
  if (detail == null) return undefined;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        if (d && typeof d === "object") {
          const issue = d as PydanticIssue;
          const loc = Array.isArray(issue.loc)
            ? issue.loc.filter((p) => p !== "body").join(".")
            : "";
          const msg = issue.msg ?? "Invalid value";
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(d);
      })
      .filter(Boolean)
      .join("; ");
  }
  return String(detail);
}
```

`ApiError` runs `flattenDetail` before storing `this.detail`, so callers can safely pass `err.detail` to `toast.error()` without ever touching the raw array.

**Never** destructure `err.detail` from `ApiError` and pass it to JSX directly. Use `err.detail ?? err.message` which is already a string.

---

## 18. Share button (navigator.share → clipboard fallback)

`components/shared/ShareButton.tsx` provides a universal share action that:
1. Calls `navigator.share()` on mobile (native OS share sheet)
2. Falls back to `navigator.clipboard.writeText()` on desktop
3. Handles `AbortError` (user dismissed native sheet) silently

```tsx
import { ShareButton } from "@/components/shared/ShareButton";

<ShareButton
  url={shareUrl}
  title="Sponsor Meera"
  text="Help Meera run 100 km for education"
/>
```

`variant` prop: `"primary" | "secondary" | "ghost"`. `label` prop overrides the button text.

A `WhatsAppShare` named export creates a direct `wa.me/?text=...` link — useful for runner profile pages where WhatsApp sharing is high-value.

---

## 19. RSC slot pattern (server component inside client component)

A server component cannot be *imported* inside a `"use client"` component, but it can be *passed as a ReactNode prop*. This is the "slot" pattern.

```tsx
// app/(public)/runners/[username]/page.tsx  (Server Component)
const awareness = <AwarenessBlocks causeId={event.cause_id} />;

return (
  <RunnerProfile
    awarenessSlot={awareness}  // ← pass the RSC as a prop
    ...
  />
);

// components/runner/RunnerProfile.tsx  (Client Component)
interface RunnerProfileProps {
  awarenessSlot?: React.ReactNode;  // ← accept as ReactNode
}
export function RunnerProfile({ awarenessSlot, ... }) {
  return (
    <article>
      ...
      {awarenessSlot}  {/* ← render it like any React child */}
    </article>
  );
}
```

**When to use**: when a client component (needs state/effects) wants to embed a data-fetching server component (e.g. a server-side `fetch()` block that must NOT be on the client).

**Don't** try to `import` the RSC directly inside the client component — Next.js will error at build time.

---

## 20. Date / time formatters

All visible dates use `formatDate` / `formatDateTime` from `@/lib/utils`. Never use raw `toLocaleDateString()`.

```ts
import { formatDate, formatDateTime } from "@/lib/utils";

formatDate("2026-05-08T00:00:00Z")       // → "08-05-26"
formatDateTime("2026-05-08T12:00:00Z")   // → "08-05-26, 5:30 PM"
formatDate(null)                          // → "—"  (safe on undefined/invalid)
```

Both use `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"` so they render the same value on server and client (no hydration mismatch).

**Backend** (PDF / receipt generation): use Python's `strftime('%d-%m-%y')`.

**Relative time** (e.g. "5 days left"): use `daysBetween(start, end)` from `@/lib/utils`.

---

## 21. Awareness blocks (cause-level content injected into runner profiles)

Each `Cause` has an `awareness_blocks: AwarenessBlock[]` JSONB column (max 8 items). The manager sets these once per cause — they auto-propagate to every runner profile under that cause.

**Schema** (`backend/app/schemas/cause.py`):

```python
class AwarenessBlock(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    body: str  = Field(min_length=2, max_length=600)
    source_url: str | None = Field(default=None, max_length=500)
```

**Frontend rendering** uses the RSC slot pattern (Pattern 19):
- Server component: `components/runner/AwarenessBlocks.tsx` — fetches the cause, returns `null` when blocks are empty.
- Client host: `components/runner/RunnerProfile.tsx` — receives `awarenessSlot: ReactNode`.

**Manager editor**: `/manager/causes` — full CRUD for causes + inline block editor (up to 8 blocks with title / body / source URL). Blocks with empty title or body are stripped before saving.

Blank-block filtering is intentional — managers can leave partial rows without them showing up publicly.
