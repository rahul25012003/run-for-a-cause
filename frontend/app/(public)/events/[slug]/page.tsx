import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Users,
  Heart,
  ShieldCheck,
  Trophy,
  HandHeart,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { SponsorStrip } from "@/components/events/SponsorStrip";
import { TeamLeaderboard } from "@/components/events/TeamLeaderboard";
import { DonorWall } from "@/components/events/DonorWall";
import { ShareEventCard } from "@/components/events/ShareEventCard";
import {
  formatCompactInr,
  formatCurrency,
  formatDate,
  daysBetween,
  progressPct,
} from "@/lib/utils";
import type { EventDetail, RunnerCardPublic } from "@/types";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchEvent(slug: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${apiUrl}/events/${slug}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as EventDetail;
  } catch {
    return null;
  }
}

async function fetchRunners(eventId: string): Promise<RunnerCardPublic[]> {
  try {
    const res = await fetch(`${apiUrl}/events/${eventId}/runners`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return (await res.json()) as RunnerCardPublic[];
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
  const event = await fetchEvent(slug);
  if (!event) return { title: "Event not found" };
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
  return {
    title: event.title,
    description: event.cause_summary,
    openGraph: {
      title: event.title,
      description: event.cause_summary,
      images: [`${siteUrl}/og/event/${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.cause_summary,
      images: [`${siteUrl}/og/event/${slug}`],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactNode> {
  const { slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) notFound();
  const runners = await fetchRunners(event.id);

  const pct = progressPct(event.total_raised, event.fundraising_goal);
  const days = daysBetween(event.end_date);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
  const eventUrl = `${siteUrl}/events/${event.slug}`;

  return (
    <div className="bg-canvas min-h-screen">
      {/* Hero */}
      <div className="relative h-64 md:h-[420px] bg-ink-900 overflow-hidden">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            className="object-cover opacity-80"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 container-page pb-8 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="primary">
              {event.cause_category.replace("_", " ")}
            </Badge>
            {event.is_featured && <Badge variant="success">Featured</Badge>}
            <Badge>{event.format.replace("_", "-")}</Badge>
          </div>
          <h1 className="font-display font-medium text-display-lg md:text-display-xl text-white leading-tight max-w-3xl">
            {event.title}
          </h1>
          <p className="mt-3 max-w-2xl text-white/80 leading-relaxed">
            {event.cause_summary}
          </p>
        </div>
      </div>

      {/* Match-funding banner */}
      <SponsorStrip eventId={event.id} />

      <div className="container-page py-10 grid lg:grid-cols-3 gap-8">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Impact report banner */}
          {event.impact_report_published_at && (
            <div className="card p-6 bg-gradient-to-br from-secondary-50 to-white border-secondary-200">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-secondary-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="eyebrow text-secondary-700">
                    Impact report · published{" "}
                    {formatDate(event.impact_report_published_at)}
                  </p>
                  {event.utilisation_summary && (
                    <p className="mt-2 text-ink-800 leading-relaxed">
                      {event.utilisation_summary}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {event.impact_report_url && (
                      <a
                        href={event.impact_report_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary btn-sm"
                      >
                        Download full report
                      </a>
                    )}
                    <Link href={`/audit/${event.id}`} className="btn-link text-sm">
                      Public audit trail →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description card */}
          <div className="card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-secondary-500" />
              <Link href="/about" className="text-sm text-ink-600 font-medium hover:text-ink-900">
                Verified by RunForACause · Hosted by{" "}
                <span className="text-primary-600 font-semibold">
                  {event.organisation.name}
                </span>
              </Link>
            </div>
            <p className="text-ink-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <Stat
                icon={<Calendar className="w-4 h-4" />}
                label="Dates"
                value={`${formatDate(event.start_date)} → ${formatDate(event.end_date)}`}
              />
              <Stat
                icon={<MapPin className="w-4 h-4" />}
                label="Format"
                value={event.format.replace("_", " ")}
              />
              <Stat
                icon={<Users className="w-4 h-4" />}
                label="Participation"
                value={event.participation}
              />
            </div>
          </div>

          {/* Team leaderboard */}
          <TeamLeaderboard eventId={event.id} />

          {/* Donor wall */}
          <DonorWall eventId={event.id} />

          {/* Runners */}
          <div className="card p-6 md:p-8" id="runners">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <span className="eyebrow">Participants</span>
                <h2 className="mt-1 font-display text-2xl text-ink-900">
                  {runners.length} runner{runners.length !== 1 ? "s" : ""}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/events/${event.slug}/leaderboard`}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" /> Leaderboard
                </Link>
                <Link
                  href={`/events/${event.slug}/volunteer`}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                >
                  <HandHeart className="w-3.5 h-3.5" /> Volunteer
                </Link>
                <Link
                  href={`/register?role=runner&event=${event.id}`}
                  className="btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5" /> Join as runner
                </Link>
              </div>
            </div>
            {runners.length === 0 ? (
              <p className="text-ink-500 text-sm">
                Be the first to join this event.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {runners.map((runner) => (
                  <Link
                    key={runner.id}
                    href={`/runners/${runner.public_slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 hover:border-primary-200 hover:bg-primary-50/40 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0 overflow-hidden">
                      {runner.profile_photo_url ? (
                        <Image
                          src={runner.profile_photo_url}
                          alt={runner.full_name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        runner.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink-900 truncate text-sm">
                        {runner.full_name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatCompactInr(runner.amount_raised)} raised ·{" "}
                        {parseFloat(runner.distance_completed_km).toFixed(0)} km
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          {/* Fundraising progress */}
          <div className="card p-6">
            <p className="eyebrow">Raised so far</p>
            <p className="mt-2 font-display text-display-md text-ink-900 tabular leading-none">
              {formatCurrency(event.total_raised)}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              of {formatCompactInr(event.fundraising_goal)} goal · {pct}%
            </p>
            <ProgressBar pct={pct} className="mt-3" />

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-canvas-subtle py-2">
                <p className="font-display text-lg text-ink-900 tabular">
                  {event.total_runners}
                </p>
                <p className="text-[11px] text-ink-500">runners</p>
              </div>
              <div className="rounded-lg bg-canvas-subtle py-2">
                <p className="font-display text-lg text-ink-900 tabular">
                  {event.total_donors}
                </p>
                <p className="text-[11px] text-ink-500">donors</p>
              </div>
              <div className="rounded-lg bg-canvas-subtle py-2">
                <p className="font-display text-lg text-ink-900 tabular">
                  {days > 0 ? `${days}d` : "—"}
                </p>
                <p className="text-[11px] text-ink-500">left</p>
              </div>
            </div>

            <Link
              href={`/events/${event.slug}#runners`}
              className="btn-primary w-full mt-5 inline-flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" /> Donate to a runner
            </Link>
            <Link
              href={`/audit/${event.id}`}
              className="btn-ghost w-full mt-2 text-sm justify-center"
            >
              View public audit →
            </Link>
          </div>

          {/* Share this event */}
          <ShareEventCard
            url={eventUrl}
            title={event.title}
            text={event.cause_summary}
          />
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.ReactNode {
  return (
    <div className="rounded-xl bg-canvas-subtle border border-ink-100 p-4">
      <div className="flex items-center gap-1.5 text-ink-400 text-xs uppercase tracking-wide font-medium">
        {icon} {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink-900 capitalize">{value}</p>
    </div>
  );
}
