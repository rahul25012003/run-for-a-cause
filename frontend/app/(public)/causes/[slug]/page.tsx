import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Heart,
  Lightbulb,
  TrendingUp,
  Users,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Reveal } from "@/components/shared/Reveal";
import { formatCompactInr, formatCurrency, progressPct } from "@/lib/utils";
import type { EventPublic } from "@/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface AwarenessBlock {
  title: string;
  body: string;
  source_url: string | null;
}

interface CauseDetail {
  id: string;
  organisation_id: string;
  title: string;
  slug: string;
  summary: string;
  story: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  awareness_blocks: AwarenessBlock[];
  total_raised_lifetime: string;
  total_events_hosted: number;
}

async function fetchCause(slug: string): Promise<CauseDetail | null> {
  try {
    const res = await fetch(`${apiUrl}/causes/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CauseDetail;
  } catch {
    return null;
  }
}

async function fetchCauseEvents(causeId: string): Promise<EventPublic[]> {
  try {
    const res = await fetch(
      `${apiUrl}/events/?cause_id=${causeId}&limit=12`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    return (await res.json()) as EventPublic[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cause = await fetchCause(slug);
  if (!cause) return { title: "Cause not found" };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
  return {
    title: cause.title,
    description: cause.summary,
    openGraph: {
      title: cause.title,
      description: cause.summary,
      images: cause.cover_image_url ? [cause.cover_image_url] : [`${siteUrl}/og/leaderboard/${cause.slug}`],
    },
  };
}

export default async function CauseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactNode> {
  const { slug } = await params;
  const cause = await fetchCause(slug);
  if (!cause) notFound();

  const events = await fetchCauseEvents(cause.id);

  return (
    <div className="bg-canvas min-h-screen">
      {/* Hero */}
      <div className="relative h-56 md:h-80 bg-ink-900 overflow-hidden">
        {cause.cover_image_url ? (
          <Image
            src={cause.cover_image_url}
            alt={cause.title}
            fill
            className="object-cover opacity-75"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-600 via-secondary-700 to-primary-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 container-page pb-8 text-white">
          <p className="eyebrow text-white/60 mb-2">Cause</p>
          <h1 className="font-display font-medium text-display-lg md:text-display-xl text-white leading-tight max-w-3xl">
            {cause.title}
          </h1>
          <p className="mt-3 text-white/80 max-w-2xl leading-relaxed">
            {cause.summary}
          </p>
        </div>
      </div>

      <div className="container-page py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Story */}
            {cause.story && (
              <div className="card p-6 md:p-8">
                <h2 className="font-display text-xl text-ink-900 mb-4">About this cause</h2>
                <p className="text-ink-700 leading-relaxed whitespace-pre-line">
                  {cause.story}
                </p>
              </div>
            )}

            {/* Events under this cause */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="eyebrow">Events</span>
                  <h2 className="mt-1 font-display text-2xl text-ink-900">
                    {events.length > 0
                      ? `${events.length} event${events.length !== 1 ? "s" : ""} running for this cause`
                      : "No events yet"}
                  </h2>
                </div>
                <Link href="/events" className="btn-link text-sm">
                  All events →
                </Link>
              </div>

              {events.length === 0 ? (
                <div className="card p-8 text-center">
                  <Calendar className="w-8 h-8 text-ink-300 mx-auto mb-3" />
                  <p className="text-ink-500">
                    No active events for this cause yet.
                  </p>
                  <Link href="/events" className="btn-secondary btn-sm mt-4 inline-flex">
                    Browse all events
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((e, i) => {
                    const pct = progressPct(e.total_raised, e.fundraising_goal);
                    return (
                      <Reveal key={e.id} delay={i * 0.04}>
                        <Link
                          href={`/events/${e.slug}`}
                          className="card p-5 flex items-center gap-5 hover:shadow-lift hover:-translate-y-0.5 transition-all group"
                        >
                          {/* Cover thumbnail */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-canvas-deep flex-shrink-0">
                            {e.cover_image_url ? (
                              <Image
                                src={e.cover_image_url}
                                alt=""
                                width={64}
                                height={64}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary-200 to-secondary-300" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={e.status === "live" ? "success" : "default"}
                              >
                                {e.status.replace("_", " ")}
                              </Badge>
                              {e.is_featured && (
                                <Badge variant="warning">Featured</Badge>
                              )}
                            </div>
                            <p className="font-semibold text-ink-900 truncate group-hover:text-primary-700 transition-colors">
                              {e.title}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <ProgressBar pct={pct} height="sm" className="flex-1" />
                              <span className="font-mono text-xs text-ink-500 tabular whitespace-nowrap flex-shrink-0">
                                {formatCompactInr(e.total_raised)} raised
                              </span>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-ink-300 group-hover:text-primary-500 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </Link>
                      </Reveal>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Awareness blocks */}
            {cause.awareness_blocks.length > 0 && (
              <div className="card p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Lightbulb className="w-5 h-5 text-primary-500" />
                  <h2 className="font-display text-xl text-ink-900">
                    Why this cause matters
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {cause.awareness_blocks.map((block, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-ink-100 bg-canvas-subtle p-5"
                    >
                      <p className="font-display text-base text-ink-900 leading-snug mb-2">
                        {block.title}
                      </p>
                      <p className="text-sm text-ink-600 leading-relaxed">
                        {block.body}
                      </p>
                      {block.source_url && (
                        <a
                          href={block.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 text-xs text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                        >
                          Source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            {/* Stats */}
            <div className="card p-6">
              <p className="eyebrow mb-4">Cause at a glance</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink-500 text-sm">
                    <TrendingUp className="w-4 h-4" /> Lifetime raised
                  </div>
                  <p className="font-mono font-bold text-ink-900 tabular">
                    {formatCurrency(cause.total_raised_lifetime)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink-500 text-sm">
                    <Calendar className="w-4 h-4" /> Events hosted
                  </div>
                  <p className="font-mono font-bold text-ink-900 tabular">
                    {cause.total_events_hosted}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink-500 text-sm">
                    <Users className="w-4 h-4" /> Active events
                  </div>
                  <p className="font-mono font-bold text-ink-900 tabular">
                    {events.filter((e) => e.status === "live").length}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="card p-6 bg-primary-50 border-primary-200">
              <Heart className="w-5 h-5 text-primary-600 mb-3" />
              <p className="font-display text-lg text-ink-900 leading-snug mb-2">
                Support this cause
              </p>
              <p className="text-sm text-ink-600 mb-4">
                Sponsor a runner in any active event to donate directly to this cause.
              </p>
              {events.filter((e) => e.status === "live").length > 0 ? (
                <Link
                  href={`/events/${events.find((e) => e.status === "live")?.slug}`}
                  className="btn-primary w-full inline-flex items-center justify-center gap-2"
                >
                  <Heart className="w-4 h-4" /> Donate now
                </Link>
              ) : (
                <Link
                  href="/events"
                  className="btn-secondary w-full inline-flex items-center justify-center"
                >
                  Browse all events
                </Link>
              )}
            </div>

            {/* Back */}
            <Link
              href="/causes"
              className="block text-center text-sm text-ink-500 hover:text-ink-900"
            >
              ← All causes
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
