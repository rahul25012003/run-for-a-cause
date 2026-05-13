# Code Conventions

These rules apply to all new code. Existing code may diverge — that's
fine, but don't introduce new divergences.

---

## When to write a comment

**Default: don't.** Well-named identifiers + obvious code structure carry
most of the weight. A comment that restates what the code does is noise.

**Write a comment when**:
- The reason isn't obvious from the code (a *why*, not a *what*)
- There's a hidden constraint (rate limit, ordering requirement, FK behaviour)
- A workaround exists for a third-party bug — link the issue
- An invariant the function depends on is asserted elsewhere
- A future reader could plausibly delete it and break something

**Don't write**:
- Function-level "this function does X" — the name should say so
- Inline comments that mirror the next line ("set the user id" above `user.id = ...`)
- Refer to the current task / commit ("removed for v2", "from issue #234") — those belong in the PR description
- Multi-paragraph docstrings — one line max, only when the why isn't obvious

**Comment style**:

```python
# ✅ Good — explains the why
# Capacity check against confirmed only — pending applicants don't block
# new signups; manager decides who to confirm.
if confirmed_count >= role.capacity:
    raise HTTPException(409)

# ❌ Bad — mirrors the code
# Increment counter
counter += 1

# ✅ Good — points at a non-obvious side effect
# IMPORTANT: this updates the running total_matched on every active sponsor.
# Caller is responsible for committing the surrounding transaction.
await compute_match(...)

# ❌ Bad — references a dead task
# TODO(2025-01-15): rewrite when v2 ships
```

---

## TypeScript

- `strict: true` always
- **Never `any`**. Use `unknown` + narrowing, or define a type
- `interface` for object shapes, `type` for unions / tuples / aliases
- `import type { Foo }` for type-only imports
- Generics: descriptive name when shape matters: `<TItem>`, not `<T>`
- Discriminated unions for state machines:
  ```ts
  type Status =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready", data: Foo }
    | { kind: "error", error: ApiError };
  ```
- `// @ts-expect-error` only with a comment explaining why. NEVER `// @ts-ignore`
- Prefer `??` over `||` when nullish-only fallback (let `0` and `""` pass)

## Python

- Type hints on every function parameter and return (`-> None` if void)
- `from __future__ import annotations` at top of model files
- Pydantic v2 (`model_validate`, `model_dump`)
- Async everywhere in routers / services. No `def`s mixed with `async def`s in the same call chain
- `Decimal` for money, never `float`
- `datetime.now(UTC)` for timestamps, never `datetime.utcnow()` (deprecated)
- F-string for log messages? **No** — `logger.info("event", key=value)` for structured logs

## Naming

| What | Convention | Example |
|---|---|---|
| Python files / modules | `snake_case.py` | `match_funding_service.py` |
| Python classes | `PascalCase` | `OrganisationDetail` |
| Python functions / vars | `snake_case` | `compute_and_record_match` |
| Python constants | `UPPER_SNAKE` | `EMAIL_WORTHY` |
| TS/JS files | `camelCase.ts` for utils, `PascalCase.tsx` for components | `useSiteSettings.ts`, `HeroSection.tsx` |
| TS types / interfaces | `PascalCase` | `EventDetail` |
| TS variables / functions | `camelCase` | `formatCurrency` |
| TS constants | `UPPER_SNAKE` | `DEFAULTS`, `API_URL` |
| React components | `PascalCase` | `<EventCard />` |
| URL paths | `kebab-case` | `/manager/events/[id]/distance-approvals` |
| DB tables | `snake_case`, plural | `event_runners`, `corporate_sponsors` |
| DB columns | `snake_case` | `created_at`, `is_80g_eligible` |
| Audit actions | `<entity>.<verb>` | `runner.approved`, `donation.refunded` |
| Notification types | `<entity>.<event>` | `donation.received`, `achievement.unlocked` |

## File organisation

**Backend module**:

```python
"""Module-level docstring — one sentence on what this file does."""
from __future__ import annotations

# Standard library
import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

# Third-party
from sqlalchemy import ...
from fastapi import APIRouter

# First-party (app.*)
from app.database import Base
from app.models.user import User

# Type-checking-only imports (avoid circular)
if TYPE_CHECKING:
    from app.models.event import Event

# Module body
```

**Frontend component**:

```tsx
"use client";  // only if needed

// Framework
import { useState, useEffect } from "react";
import Link from "next/link";

// Third-party
import { motion } from "framer-motion";
import { toast } from "sonner";

// Lucide icons (separate group)
import { Loader2, Save } from "lucide-react";

// First-party (@/*)
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";

// Types
import type { EventDetail } from "@/types";

// Component
export function MyComponent(): React.ReactNode { ... }

// Helpers (functions used only in this file)
function helper(...) { ... }
```

## Error handling

**Backend** — always raise `HTTPException` with user-readable detail:

```python
# ✅ Good
if not org:
    raise HTTPException(
        status_code=404,
        detail="No organisation found for this user",
    )

# ❌ Bad — leaks Python internals
if not org:
    raise ValueError("org is None")
```

**Frontend** — catch `ApiError`, surface via toast:

```tsx
try {
  await api.put("/endpoint", body);
} catch (err) {
  toast.error(err instanceof ApiError ? err.detail ?? err.message : "Save failed");
}
```

Never `console.error` for user-facing errors. The toast IS the error UI.

## Git / commits

- **Don't commit unless asked.** When the user does ask, follow root CLAUDE.md commit rules.
- One logical change per commit. Don't bundle a feature + a refactor + a typo fix.
- Commit message: imperative mood, lowercase first letter is fine, no period at end.
  - ✅ `add corporate match-funding model + payment service hook`
  - ✅ `fix hero video stuttering — separate from Ken Burns layer`
  - ❌ `Updated stuff.`
- Never amend a published commit. Always create a new one.

## Testing

- **Backend**: pytest in `backend/tests/`. Use the `client` and `db_session` fixtures from `conftest.py`. Mock external services.
- **Frontend**: Vitest in `frontend/__tests__/`. Use `@testing-library/react`. Don't query by class name.
- Each test must be independent — order shouldn't matter.
- Test the public contract, not the implementation. Refactoring shouldn't break tests unless behaviour changed.

## Imports

- Relative paths (`./`, `../`) only inside the same feature folder
- Cross-folder: use the `@/` alias (frontend) or `app.` (backend)
- Don't `import * as Foo` — explicit named imports (helps tree-shaking)
- Re-export through index files (`__init__.py`, `index.ts`) only when there's a stable public API

---

## Date / time formatting

**Rule: always use `formatDate` / `formatDateTime` from `@/lib/utils`. Never `toLocaleDateString` / `toLocaleString`.**

| ✅ Correct | ❌ Wrong |
|---|---|
| `formatDate(iso)` | `new Date(x).toLocaleDateString("en-IN", {...})` |
| `formatDateTime(iso)` | `new Date(x).toLocaleString()` |
| `formatDate(null)` → `"—"` | `x ? new Date(x).toLocaleDateString() : "—"` |

Output format: `dd-mm-yy` for dates (`08-05-26`), `dd-mm-yy, h:mm AM/PM` for datetimes (`08-05-26, 5:30 PM`). Both IST-locked via `Intl.DateTimeFormat(... timeZone: "Asia/Kolkata")`.

The helpers return `"—"` for null / undefined / invalid input, so you don't need null guards at call sites.

**Backend PDF / receipts**: `strftime('%d-%m-%y')` in Python (ReportLab templates).

---

## Brand wordmark

The wordmark is always `runfora` + `cause` where `cause` gets the accent colour.

```tsx
// Tailwind — in any component
<span>runfora<span className="text-primary-500">cause</span></span>

// Satori (OG routes) — must use inline styles
<span>runfora</span><span style={{ color: "#ED6C0F" }}>cause</span>
```

Do **not** accent `for` (old style) or `run` — the accent is always on `cause`. This applies to all 6+ locations: `Logo.tsx`, `BrandLoader.tsx`, 4 OG routes.

---

## API error handling — Pydantic 422 arrays

FastAPI returns `{ detail: [{type, loc, msg, ...}] }` for validation errors.
`ApiError` in `lib/api.ts` flattens this to a readable string via `flattenDetail()` before
storing it in `err.detail`. Callers don't need to know the shape:

```tsx
// ✅ Always safe
toast.error(err instanceof ApiError ? err.detail ?? err.message : "Save failed");

// ❌ Never — detail may still be an array from an older code path
toast.error(err.detail);  // crashes with "Objects are not valid as a React child"
```

## Comments in OG / Satori code

These files DO need extra comments — Satori's quirks aren't obvious:

```tsx
// Satori is strict: every container with multiple children needs an
// explicit `display: flex`, and bare text must NOT be a sibling of an
// element inside a flex container — wrap text in spans.
```

Same for any place where we work around a third-party bug. Future Claude /
future Rahul will thank you.

---

## Common style mistakes to avoid

| Anti-pattern | Why it's bad | Fix |
|---|---|---|
| `if not value:` for nullable strings | `""` triggers it; sometimes you want only `None` | `if value is None:` |
| `value or default` for nullable numerics | `0` triggers fallback | `value if value is not None else default` |
| `console.log` in shipped code | Pollutes the dev console; signals abandoned debugging | Remove before commit |
| `// @ts-ignore` | Hides type errors that may matter | Use `// @ts-expect-error` with a comment explaining why |
| Catch-all `except Exception` | Masks bugs | Catch specific exceptions; or catch + log + re-raise |
| Bare `print(...)` in backend | Doesn't go through structured logger | `logger.info("event_name", ...)` |
| Hardcoded slugs in code/tests | Breaks when DB reseeds | Always look up via DB |
| `useEffect(() => fetchData(), [])` without abort | Leaks if component unmounts mid-fetch | Use `AbortController` or `void`-prefix the IIFE |
| Component file > 500 lines | Hard to scan, hard to test | Split into sub-components |
| Importing client component into RSC | Crashes hydration | Make the wrapper RSC and only the inner part client |
