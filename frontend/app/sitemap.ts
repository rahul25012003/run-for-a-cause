import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface EventRow {
  slug: string;
  updated_at: string;
}
interface SpotlightRow {
  public_slug: string;
}
interface OrgRow {
  slug: string;
}

async function fetchEvents(): Promise<EventRow[]> {
  try {
    const res = await fetch(`${API_URL}/events/?limit=200`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return (await res.json()) as EventRow[];
  } catch {
    return [];
  }
}

async function fetchRunners(): Promise<SpotlightRow[]> {
  try {
    const res = await fetch(`${API_URL}/runners/spotlight?limit=200`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return (await res.json()) as SpotlightRow[];
  } catch {
    return [];
  }
}

async function fetchOrgs(): Promise<OrgRow[]> {
  try {
    const res = await fetch(`${API_URL}/organisations/?verified_only=true`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return (await res.json()) as OrgRow[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/events`, changeFrequency: "hourly", priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/organisations`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/causes`, changeFrequency: "weekly", priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/map`, changeFrequency: "daily", priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/transparency`, changeFrequency: "weekly", priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.5, lastModified: now },
  ];

  const [events, runners, orgs] = await Promise.all([
    fetchEvents(),
    fetchRunners(),
    fetchOrgs(),
  ]);

  const eventEntries: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${SITE_URL}/events/${e.slug}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : now,
    changeFrequency: "daily",
    priority: 0.8,
  }));
  // Each event also has a leaderboard sub-page.
  const leaderboardEntries: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${SITE_URL}/events/${e.slug}/leaderboard`,
    lastModified: e.updated_at ? new Date(e.updated_at) : now,
    changeFrequency: "hourly",
    priority: 0.6,
  }));

  const runnerEntries: MetadataRoute.Sitemap = runners.map((r) => ({
    url: `${SITE_URL}/runners/${r.public_slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const orgEntries: MetadataRoute.Sitemap = orgs.map((o) => ({
    url: `${SITE_URL}/organisations/${o.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...eventEntries,
    ...leaderboardEntries,
    ...runnerEntries,
    ...orgEntries,
  ];
}
