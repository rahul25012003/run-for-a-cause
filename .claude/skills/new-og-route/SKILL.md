---
name: new-og-route
description: Scaffold a new Next.js OG image route at /og/<type>/[slug] with all the gotchas baked in (edge runtime, IPv4 fetch, span-wrapped text, display:flex everywhere, null-safe optional chaining). Use when adding share-card images for a new entity type.
allowed-tools: Read, Write, Bash
---

# New OG image route

## Critical rules (do not deviate)

1. **`runtime = "edge"`** is mandatory. Node + Windows mangles the bundled
   font path → 500.
2. **Fetch via `127.0.0.1`** not `localhost` — edge dev DNS quirk.
3. **`display: "flex"`** on every container that has multiple children.
4. **Bare text NOT a sibling of an element** inside a flex container —
   wrap text in `<span>`.
5. **Optional chain ALL levels** of nullable property access:
   `event?.organisation?.name`, never `event?.organisation.name`.

## Steps

1. Create the route file at
   `frontend/app/og/<type>/[slug]/route.tsx`:

```tsx
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime — Node + Windows breaks @vercel/og's bundled font URL.
export const runtime = "edge";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface MyData {
  title: string;
  // ...
}

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(
      url.replace("://localhost:", "://127.0.0.1:"),
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const data = await safeJson<MyData>(`${API_URL}/<endpoint>/${slug}`);

  // Compute every field with a default — never let null reach JSX.
  const title = data?.title ?? "Default title";
  const subtitle = data?.subtitle ?? "Default subtitle";

  // Sanitise / truncate long strings.
  const safeTitle = title.length > 60 ? title.slice(0, 58) + "…" : title;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FBF6EE",
          padding: "60px 70px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand strip */}
        <div style={{ display: "flex", alignItems: "center", color: "#1A1612" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "#ED6C0F",
              color: "white",
              fontSize: 22,
              fontWeight: 900,
              marginRight: 14,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
            <span>run</span>
            <span style={{ color: "#ED6C0F" }}>for</span>
            <span>acause</span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            marginTop: 50,
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#1A1612",
            maxWidth: "85%",
          }}
        >
          <span>{safeTitle}</span>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Bottom row — stats with vertical dividers */}
        <div style={{ display: "flex", gap: 40 }}>
          {/* Build stats with span-wrapped values and labels */}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

2. **Wire into `generateMetadata`** of the corresponding page so social
   crawlers find it:

```ts
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
return {
  // ...
  openGraph: {
    images: [`${siteUrl}/og/<type>/${slug}`],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${siteUrl}/og/<type>/${slug}`],
  },
};
```

3. **Test directly** in the browser:
   `http://localhost:3000/og/<type>/<actual-slug>` — should return a
   1200×630 PNG, not an error page.

4. **Test the metadata wiring**: visit the parent page, view-source, and
   confirm `<meta property="og:image" content="...">` points at the new
   route URL.

## If it 500s

- Check the `npm run dev` terminal — Satori's error message is verbose.
- Most common cause: bare text mixed with element inside a flex
  container. Wrap text in `<span>`.
- Second most common: `event?.organisation.name` should be
  `event?.organisation?.name`.
- Third: a `<div>` with multiple children but no `display: "flex"`.

## Don't

- Don't use `runtime = "nodejs"` on Windows — it crashes
- Don't pass custom fonts unless you have a working TTF in the repo
  (we tried; default is fine on edge)
- Don't try to render external `<img src={remoteUrl}>` without a robust
  fallback — Satori's image fetch can fail and crash the stream
