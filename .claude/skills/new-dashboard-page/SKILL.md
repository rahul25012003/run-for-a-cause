---
name: new-dashboard-page
description: Scaffold a role-gated dashboard page with the required loading + empty + error states + a sidebar entry. Use when the user wants a new admin/manager/runner page.
allowed-tools: Read, Write, Edit, Bash
---

# New dashboard page

## Decisions to gather first

- **Role**: super_admin / event_manager / runner / donor / shared
- **URL path**: e.g. `/manager/events/[id]/sponsors`
- **Layout pattern**: list / list+detail / form / analytics
- **Backend endpoint**(s): does it already exist? if not, add it first

## Steps

1. **Pick the path** under `frontend/app/(dashboard)/<role>/...`. Create
   the directory if needed.

2. **Scaffold `page.tsx`** with all three required states baked in:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, /* domain icons */ } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
// Optional, depending on layout:
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";

interface MyData {
  // Mirror the backend response shape
}

export default function MyPage(): React.ReactNode {
  const [data, setData] = useState<MyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setData(await api.get<MyData[]>("/<endpoint>"));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.detail ?? err.message : "Load failed",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header>
        <span className="eyebrow">Section name</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Page title
        </h1>
        <p className="mt-2 text-ink-500">One-line subtitle.</p>
      </header>

      {data.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-700 font-medium">Nothing here yet.</p>
          <p className="mt-2 text-sm text-ink-500">
            Empty-state hint that points the user toward the next action.
          </p>
          <Link href="/..." className="btn-primary mt-5 inline-flex">
            Go do the thing
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data.map((item) => (
            <div key={item.id} className="card p-5">
              {/* Render */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

3. **Add the sidebar entry** in
   `frontend/components/layout/DashboardSidebar.tsx`:

   ```tsx
   <role>: [
     // ...existing entries
     { href: "/<role>/...", label: "Page name", icon: SomeIcon },
   ],
   ```

4. **Mobile responsive**: the boilerplate above already uses `p-6 md:p-10`
   for padding and `grid md:grid-cols-2` for layout. If your page has
   tables, wrap them in `<div className="overflow-x-auto">`.

5. **Verify**:
   - Loading state shows momentarily on first load
   - Empty state shows when no data
   - Error toast shows when API fails (test by stopping the backend mid-load)
   - Page is accessible only to the right role (Next.js middleware + backend role guard)

## Common follow-ups

- For pages with multiple tabs, use Tilt3D / Reveal animations from `components/shared/`
- For pages that need real-time data, add `useEffect` polling (60s default)
- For pages with forms, use sonner toasts for save success / failure
- For pages with destructive actions, use a confirm step (type-to-confirm pattern from `/account` delete)

## Don't

- Skip any of the three states (loading / empty / error)
- Fetch via raw `fetch()` — use `api.get/put/post/delete<T>()` from `@/lib/api`
- Forget the sidebar entry — page becomes unreachable for users
- Hardcode role checks in JSX — middleware + dependency injection handle this
