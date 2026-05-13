import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { EventDetail } from "@/types";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";

export const metadata: Metadata = {
  // Embedded widget — search engines don't need to index it.
  robots: { index: false, follow: false },
};

async function fetchEvent(slug: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${apiUrl}/events/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as EventDetail;
  } catch {
    return null;
  }
}

export default async function EventWidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactNode> {
  const { slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) {
    return (
      <main className="p-6 font-sans text-sm text-ink-700">
        Event not found.
      </main>
    );
  }

  const goal = parseFloat(event.fundraising_goal);
  const raised = parseFloat(event.total_raised);
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const eventLink = `${siteUrl}/events/${event.slug}`;

  return (
    <main className="p-5 font-sans bg-cream-50">
      <a
        href={eventLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl bg-white border border-ink-100 shadow-soft p-5 hover:border-primary-300 transition"
      >
        <p className="font-condensed text-[10px] tracking-[0.22em] uppercase font-bold text-primary-600">
          Run for a cause
        </p>
        <h1 className="mt-1 font-display text-xl text-ink-900 leading-snug">
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-ink-600 line-clamp-2">
          {event.cause_summary}
        </p>

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="font-mono tabular text-lg font-bold text-ink-900">
              {formatCurrency(raised)}
            </p>
            <p className="text-xs text-ink-500 tabular">
              of {formatCurrency(goal)}
            </p>
          </div>
          <div className="mt-1 h-2 rounded-full bg-ink-100 overflow-hidden">
            <div
              className="h-full bg-primary-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-500 tabular">
            {event.total_donors} donor{event.total_donors === 1 ? "" : "s"} ·{" "}
            {event.total_runners} runner{event.total_runners === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold">
            <Heart className="h-3 w-3" /> Donate
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            runforacause.in <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </a>
    </main>
  );
}
