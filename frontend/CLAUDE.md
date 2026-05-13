# Frontend conventions (RunForACause)

This file extends the root `../CLAUDE.md` with frontend-specific rules.

## Component model

- **Server Components by default**. Add `"use client"` ONLY when a component needs:
  - React state / effects (`useState`, `useEffect`, `useRef`)
  - Browser APIs (`window`, `document`, `localStorage`, `IntersectionObserver`)
  - Event handlers (`onClick`, `onChange`)
  - Third-party client-only libraries (framer-motion, recharts, react-leaflet)
- **Don't import client-only modules from Server Components** — common bug. If you need a client-only library inside an RSC, isolate it in a small `"use client"` wrapper component. (We hit this with `iconMap.ts` once.)

## Routing & layouts

- Route groups: `(public)`, `(auth)`, `(dashboard)`. Folders in parentheses don't appear in the URL.
- Each segment can have `loading.tsx`, `error.tsx`, `not-found.tsx`. Use them.
- Dynamic routes: `[slug]`. The page receives `params: Promise<{ slug: string }>` in Next 15 — must `await` it.
- Metadata: `export const metadata: Metadata = { ... }` for static pages, or `export async function generateMetadata({params})` for dynamic.

## Data fetching

- **Server pages**: `fetch(url, { cache: 'no-store' | next: { revalidate: N } })`. Pass cookies via `await cookies()` for authenticated requests.
- **Client components**: use `api.get/post/put/delete<T>()` from `@/lib/api`. It auto-includes credentials and throws `ApiError` on non-2xx.
- **Cache strategy**:
  - Public listings (events, orgs): `revalidate: 30-60`
  - Admin / manager dashboards: `cache: 'no-store'`
  - Stats / live feeds: `revalidate: 15`
- **Never** parallelise dependent fetches. Use `Promise.all` only for independent ones.

## Styling

- Tailwind utilities first. Custom classes in `globals.css` under `@layer components`.
- Don't write inline `<style>` blocks except in OG routes (Satori limitation).
- Brand utility classes already defined: `container-page`, `card`, `card-hover`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-link`, `btn-sm`, `eyebrow`, `label`, `input`, `chip`, `tabular`, `clip-parallelogram`, `clip-parallelogram-sm`, `text-outline`, `text-outline-thick`.
- Display sizes (in `tailwind.config.ts`): `text-display-xl`, `-lg`, `-md`, `-sm` — use these instead of arbitrary px.
- Always use the brand colour tokens (`bg-primary-500`, `text-ink-900`, `border-ink-100`). Never hardcode hex except in motion props or OG routes.

## Imagery

- `next/image`'s `<Image>` with explicit `width`/`height` OR `fill` + `sizes`.
- Always check truthiness before rendering: `{src && <Image src={src} />}`. Empty string crashes Image.
- `unoptimized` only when the image source is unstable (e.g. user-provided URL).
- Lazy-load below the fold; `priority` only for hero/LCP image.

## Forms

- Controlled inputs. State in the page or via `useReducer` for complex forms.
- Validation: hand-rolled or Zod. Show errors inline (red text under field).
- Loading state on submit button — replace label with `<Loader2 className="animate-spin" />`.
- Success: show a `toast.success()` from sonner. Failure: `toast.error()` with the API error detail.
- Disable the submit button while pending. Add `aria-disabled` for accessibility.

## Animation

- `framer-motion` only — don't pull other animation libraries.
- Mouse parallax + Tilt3D + Reveal already exist in `components/shared/`. Reuse, don't duplicate.
- For OG / image generation: no animation; static SVG only.
- Respect `prefers-reduced-motion`: framer-motion does this by default; don't override.

## Icons

- `lucide-react` ONLY. If a CMS-supplied icon name needs resolving, use `iconMap.ts` (`resolveIcon()`).
- Icon size: `w-3 h-3` (chips), `w-4 h-4` (buttons), `w-5 h-5` (inline body), `w-6+ h-6+` (heroes).

## TypeScript

- `strict: true` in tsconfig.
- Prefer `interface` over `type` for object shapes (extendable).
- Prefer `import type { Foo } from "./bar"` for type-only imports.
- Generics: name them descriptively (`<TItem>`, not `<T>`) when shape matters.
- Discriminated unions for state machines: `{ status: 'idle' } | { status: 'loading' } | { status: 'error', error: ApiError }`.
- Never `as any`. Use `as unknown as Foo` only when you can prove safety, with a comment why.

## Testing

- `npm test` runs Vitest. Component tests in `components/**/__tests__/*.test.tsx`. Page tests in `app/**/__tests__/*.test.tsx`.
- Use `@testing-library/react` for queries: `screen.getByRole`, `getByText`. Avoid querying by class name.
- Mock `fetch` via `vi.fn()` or MSW (when wired).
- Snapshot tests: only for stable, finished components.

## Performance

- Don't import the entire `lucide-react` package. Tree-shaken imports already are. But `import * as Icons from 'lucide-react'` IS bad — never do that.
- Heavy `recharts` charts: lazy-load with `dynamic(() => import(...), { ssr: false })`.
- Images: WebP/AVIF when possible. Use Next's image optimizer.
- Bundle: keep route-level pages small. Move heavy components into `components/` and `dynamic()`-import.

## Accessibility

- Every interactive element must be keyboard-reachable. Buttons not divs.
- Forms: `<label>` linked to inputs (htmlFor / nested).
- Icons: decorative ones get `aria-hidden`. Meaningful ones get `aria-label`.
- Colour contrast: text on `#FBF6EE` cream needs `#1A1612` ink minimum (we're at AA). Check before changing.

## Common pitfalls

- ⚠️ **Hydration error**: don't compare `Date.now()` or `Math.random()` between server + client. Render only after mount: `useEffect(() => setMounted(true), [])`.
- ⚠️ **`use client` boundary**: a non-client utility marked `"use client"` becomes uncallable from RSC. Drop the directive if no client-only API is used.
- ⚠️ **OG routes**: `runtime = "edge"` mandatory on Windows. JSX needs strict Satori rules — see `docs/PATTERNS.md` and `app/og/event/[slug]/route.tsx` for the canonical pattern.
- ⚠️ **Image fallback**: `<Image src={url || DEFAULTS.url}>` — empty string is falsy in JS, but Image still receives `""` if you `<Image src={url}>` without checks. Always guard.
