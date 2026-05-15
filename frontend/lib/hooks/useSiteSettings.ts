/**
 * Server-side helpers for fetching public data on landing pages.
 * Each helper has a short ISR cache and a safe fallback.
 *
 * NOTE: AbortSignal.timeout() is silently ignored by Next.js 15's patched
 * fetch (the cache layer decouples the signal from the real HTTP request).
 * Use timedFetch() instead — it wraps Promise.race + setTimeout which is
 * pure JS and cannot be bypassed by any fetch wrapper.
 */

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface PublicStats {
  total_raised: string;
  total_distance_km: string;
  total_runners: number;
  total_donors: number;
  total_events: number;
  active_events: number;
  total_organisations: number;
  raised_this_month: string;
  raised_this_week: string;
  new_runners_this_month: number;
  donors_this_month: number;
}

export interface FeedItem {
  id: string;
  type: "donation" | "distance" | "payout" | "verified";
  text: string;
  amount: string | null;
  timestamp: string;
}

/**
 * Fetch with a hard wall-clock timeout that works regardless of how the
 * underlying fetch is patched (Next.js cache, polyfills, etc.).
 * Returns null on timeout or network error.
 */
export async function timedFetch(
  url: string,
  opts?: Parameters<typeof fetch>[1],
  ms = 8000,
): Promise<Response | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  return Promise.race([fetch(url, opts).catch(() => null), timeout]);
}

export async function fetchPublicSettings(): Promise<Record<string, string>> {
  const res = await timedFetch(`${apiUrl}/site-settings`, {
    next: { revalidate: 30, tags: ["site-settings"] },
  });
  if (!res || !res.ok) return {};
  try {
    return (await res.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function fetchPublicStats(): Promise<PublicStats | null> {
  const res = await timedFetch(`${apiUrl}/stats/public`, {
    next: { revalidate: 30 },
  });
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as PublicStats;
  } catch {
    return null;
  }
}

export async function fetchPublicFeed(): Promise<FeedItem[]> {
  const res = await timedFetch(`${apiUrl}/audit-feed/public?limit=8`, {
    next: { revalidate: 15 },
  });
  if (!res || !res.ok) return [];
  try {
    return (await res.json()) as FeedItem[];
  } catch {
    return [];
  }
}

/**
 * Parse a JSON-blob settings value with a typed fallback. Settings store every
 * value as a string, so blob fields (arrays, objects) need explicit parsing.
 * Never throws — corrupted JSON falls back to the supplied default.
 */
export function parseJsonSetting<T>(
  raw: string | undefined | null,
  fallback: T,
): T {
  if (!raw || raw.trim() === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
