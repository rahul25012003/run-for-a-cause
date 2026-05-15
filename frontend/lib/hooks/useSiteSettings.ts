/**
 * Server-side helpers for fetching public data on landing pages.
 * Each helper has a short ISR cache and a safe fallback.
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

export async function fetchPublicSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${apiUrl}/site-settings`, {
      next: { revalidate: 30, tags: ["site-settings"] },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function fetchPublicStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${apiUrl}/stats/public`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicStats;
  } catch {
    return null;
  }
}

export async function fetchPublicFeed(): Promise<FeedItem[]> {
  try {
    const res = await fetch(`${apiUrl}/audit-feed/public?limit=8`, {
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
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
