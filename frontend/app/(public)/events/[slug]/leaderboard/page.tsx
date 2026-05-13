import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Medal, Award, ArrowLeft, Heart, Activity } from "lucide-react";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { formatCompactInr, formatDistance, formatCurrency } from "@/lib/utils";

interface LeaderboardRunner {
  rank: number;
  runner_id: string;
  name: string;
  public_slug: string;
  profile_photo_url: string | null;
  amount_raised: string;
  distance_km: string;
  donor_count: number;
}

interface PublicLeaderboard {
  event_id: string;
  event_title: string;
  event_slug: string;
  cause_summary: string;
  organisation_name: string;
  total_raised: string;
  total_distance_km: string;
  total_runners: number;
  fundraising_goal: string;
  fundraising_progress_pct: number;
  by_amount: LeaderboardRunner[];
  by_distance: LeaderboardRunner[];
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchLeaderboard(
  slug: string,
): Promise<PublicLeaderboard | null> {
  try {
    const res = await fetch(
      `${apiUrl}/analytics/events/${slug}/leaderboard?limit=25`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicLeaderboard;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lb = await fetchLeaderboard(slug);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
  const ogImage = `${siteUrl}/og/leaderboard/${slug}`;
  const title = lb ? `${lb.event_title} · Leaderboard` : "Leaderboard";
  const description = lb
    ? `Top fundraisers for ${lb.event_title} — ${lb.organisation_name}.`
    : "Top fundraisers on RunForACause.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactNode> {
  const { slug } = await params;
  const data = await fetchLeaderboard(slug);
  if (!data) return notFound();

  return (
    <div className="bg-canvas">
      {/* HERO ------------------------------------------------------------ */}
      <header className="relative overflow-hidden bg-ink-900 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 30%, rgba(237,108,15,0.35), transparent 70%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(45,106,79,0.25), transparent 70%)",
          }}
        />
        <div className="container-page relative pt-14 pb-16">
          <Link
            href={`/events/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to event
          </Link>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-[10px] font-bold tracking-[0.22em] uppercase text-primary-300">
            <Trophy className="w-3 h-3" /> Live leaderboard
          </span>
          <h1 className="mt-5 font-display font-medium text-display-xl text-white leading-[1.05] max-w-3xl">
            The runners moving the most for{" "}
            <em className="not-italic text-primary-300">{data.event_title}</em>.
          </h1>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-white/70 leading-relaxed">
            {data.cause_summary} · Hosted by {data.organisation_name}.
          </p>

          {/* Aggregate stats */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
            <Reveal>
              <p className="font-display text-3xl text-primary-300 tabular leading-none">
                {formatCompactInr(data.total_raised)}
              </p>
              <p className="font-condensed text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2 font-semibold">
                Raised so far
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="font-display text-3xl text-white tabular leading-none">
                {formatDistance(data.total_distance_km)}
              </p>
              <p className="font-condensed text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2 font-semibold">
                Distance covered
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-display text-3xl text-white tabular leading-none">
                {data.total_runners}
              </p>
              <p className="font-condensed text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2 font-semibold">
                Runners
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="font-display text-3xl text-white tabular leading-none">
                {data.fundraising_progress_pct}%
              </p>
              <p className="font-condensed text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2 font-semibold">
                of goal
              </p>
            </Reveal>
          </div>

          {/* Progress bar to goal */}
          <div className="mt-7 max-w-3xl">
            <ProgressBar pct={data.fundraising_progress_pct} />
            <p className="mt-2 text-xs text-white/50 tabular">
              {formatCompactInr(data.total_raised)} of{" "}
              {formatCompactInr(data.fundraising_goal)} goal
            </p>
          </div>
        </div>
      </header>

      {/* PODIUM TOP 3 BY AMOUNT --------------------------------------- */}
      <section className="container-page py-16 md:py-20">
        <Reveal>
          <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
            <div>
              <span className="eyebrow">Top fundraisers</span>
              <h2 className="mt-3 font-display font-medium text-display-md text-ink-900">
                Most ₹ raised
              </h2>
            </div>
            <Link href={`/events/${slug}`} className="btn-link">
              ← Event page
            </Link>
          </div>
        </Reveal>

        {data.by_amount.length === 0 ? (
          <EmptyLeaderboard />
        ) : (
          <>
            {/* Podium for top 3 */}
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              <PodiumCard
                runner={data.by_amount[1]}
                metric="amount"
                rank={2}
              />
              <PodiumCard
                runner={data.by_amount[0]}
                metric="amount"
                rank={1}
                tall
              />
              <PodiumCard
                runner={data.by_amount[2]}
                metric="amount"
                rank={3}
              />
            </div>

            {/* Remaining ranks 4-25 */}
            {data.by_amount.length > 3 && (
              <ul className="card divide-y divide-ink-100 overflow-hidden">
                {data.by_amount.slice(3).map((r) => (
                  <LeaderboardRow key={r.runner_id} runner={r} metric="amount" />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* DIVIDER ---------------------------------------------------------- */}
      <div className="container-page">
        <div className="border-t border-ink-100" />
      </div>

      {/* TOP BY DISTANCE -------------------------------------------------- */}
      <section className="container-page py-16 md:py-20">
        <Reveal>
          <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
            <div>
              <span className="eyebrow">Top runners</span>
              <h2 className="mt-3 font-display font-medium text-display-md text-ink-900">
                Most kilometres logged
              </h2>
            </div>
          </div>
        </Reveal>

        {data.by_distance.length === 0 ? (
          <EmptyLeaderboard />
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              <PodiumCard
                runner={data.by_distance[1]}
                metric="distance"
                rank={2}
              />
              <PodiumCard
                runner={data.by_distance[0]}
                metric="distance"
                rank={1}
                tall
              />
              <PodiumCard
                runner={data.by_distance[2]}
                metric="distance"
                rank={3}
              />
            </div>

            {data.by_distance.length > 3 && (
              <ul className="card divide-y divide-ink-100 overflow-hidden">
                {data.by_distance.slice(3).map((r) => (
                  <LeaderboardRow key={r.runner_id} runner={r} metric="distance" />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------------

function PodiumCard({
  runner,
  metric,
  rank,
  tall,
}: {
  runner?: LeaderboardRunner;
  metric: "amount" | "distance";
  rank: 1 | 2 | 3;
  tall?: boolean;
}): React.ReactNode {
  if (!runner) return <div />;
  const trim =
    rank === 1
      ? "ring-2 ring-gold-500 bg-gradient-to-b from-gold-50 to-white"
      : rank === 2
        ? "ring-1 ring-ink-200 bg-gradient-to-b from-canvas-subtle to-white"
        : "ring-1 ring-primary-200 bg-gradient-to-b from-primary-50 to-white";
  const Icon = rank === 1 ? Trophy : rank === 2 ? Medal : Award;
  const iconColor =
    rank === 1
      ? "text-gold-500"
      : rank === 2
        ? "text-ink-400"
        : "text-primary-500";
  const value =
    metric === "amount"
      ? formatCurrency(parseFloat(runner.amount_raised))
      : formatDistance(runner.distance_km);
  const sub =
    metric === "amount"
      ? `${formatDistance(runner.distance_km)} · ${runner.donor_count} donors`
      : `${formatCompactInr(runner.amount_raised)} raised`;
  return (
    <Tilt3D max={5} scale={1.02} className={tall ? "md:-mt-4" : ""}>
      <Link
        href={`/runners/${runner.public_slug}`}
        className={`relative block rounded-2xl p-7 ${trim} hover:shadow-lift transition-all overflow-hidden`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={`absolute -top-1 -right-1 w-12 h-12 flex items-center justify-center ${rank === 1 ? "bg-gold-500" : rank === 2 ? "bg-ink-400" : "bg-primary-500"} text-white font-display font-bold text-xl rounded-bl-2xl rounded-tr-2xl`}
          style={{ transform: "translateZ(40px)" }}
        >
          {rank}
        </div>
        <div className="flex flex-col items-center text-center">
          <div
            className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lift bg-canvas-deep mb-4"
            style={{ transform: "translateZ(30px)" }}
          >
            {runner.profile_photo_url ? (
              <Image
                src={runner.profile_photo_url}
                alt={runner.name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-display text-ink-400">
                {runner.name.charAt(0)}
              </div>
            )}
          </div>
          <div
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${iconColor}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {rank === 1 ? "Leading" : rank === 2 ? "Second" : "Third"}
          </div>
          <h3 className="mt-2 font-display text-xl text-ink-900 leading-tight">
            {runner.name}
          </h3>
          <p
            className={`mt-3 font-mono font-bold tabular leading-none text-ink-900 ${rank === 1 ? "text-3xl" : "text-2xl"}`}
            style={{ transform: "translateZ(20px)" }}
          >
            {value}
          </p>
          <p className="mt-2 text-xs text-ink-500">{sub}</p>
        </div>
      </Link>
    </Tilt3D>
  );
}

function LeaderboardRow({
  runner,
  metric,
}: {
  runner: LeaderboardRunner;
  metric: "amount" | "distance";
}): React.ReactNode {
  const value =
    metric === "amount"
      ? formatCompactInr(runner.amount_raised)
      : formatDistance(runner.distance_km);
  const sub =
    metric === "amount"
      ? formatDistance(runner.distance_km)
      : formatCompactInr(runner.amount_raised);
  const SubIcon = metric === "amount" ? Activity : Heart;
  return (
    <li className="hover:bg-canvas-subtle/50 transition">
      <Link
        href={`/runners/${runner.public_slug}`}
        className="flex items-center gap-4 px-5 py-4"
      >
        <span className="font-mono font-bold text-ink-400 w-6 tabular text-sm">
          {runner.rank}
        </span>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-canvas-deep flex-shrink-0">
          {runner.profile_photo_url ? (
            <Image
              src={runner.profile_photo_url}
              alt=""
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-display text-ink-400">
              {runner.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink-900 truncate">{runner.name}</p>
          <p className="text-xs text-ink-500 inline-flex items-center gap-1.5 mt-0.5">
            <SubIcon className="w-3 h-3" />
            {sub} · {runner.donor_count} donors
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold tabular text-ink-900">{value}</p>
        </div>
      </Link>
    </li>
  );
}

function EmptyLeaderboard(): React.ReactNode {
  return (
    <div className="card p-12 text-center">
      <Trophy className="w-8 h-8 text-ink-300 mx-auto mb-3" />
      <p className="text-ink-600">No runners ranked yet — be the first.</p>
    </div>
  );
}
