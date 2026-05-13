"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Heart,
  MapPin,
  Calendar,
  Trophy,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Badge } from "@/components/shared/Badge";
import { Reveal } from "@/components/shared/Reveal";
import { ShareButton, WhatsAppShare } from "@/components/runner/ShareButton";
import { DonationModal } from "@/components/donations/DonationModal";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { AchievementBadges } from "@/components/runner/AchievementBadges";
import {
  formatCurrency,
  formatCompactInr,
  formatDate,
  formatDistance,
  progressPct,
} from "@/lib/utils";
import type {
  DonationPublic,
  EventDetail,
  RunnerProfilePublic,
} from "@/types";

interface RunnerProfileProps {
  runner: RunnerProfilePublic;
  event: EventDetail;
  donations: DonationPublic[];
  ownerName: string;
  shareUrl: string;
  /** Server-rendered "Why this cause matters" section (RSC slot). */
  awarenessSlot?: React.ReactNode;
}

export function RunnerProfile({
  runner,
  event,
  donations,
  ownerName,
  shareUrl,
  awarenessSlot,
}: RunnerProfileProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const goalAmt = parseFloat(runner.personal_goal_amount ?? "0") || 50000;
  const raised = parseFloat(runner.amount_raised);
  const goalKm = parseFloat(runner.personal_goal_km ?? "100");
  const completedKm = parseFloat(runner.distance_completed_km);
  const distancePct = progressPct(completedKm, goalKm);
  const moneyPct = progressPct(raised, goalAmt);
  const firstName = ownerName.split(" ")[0];

  return (
    <article className="bg-canvas pb-32 md:pb-12">
      {/* Hero — full bleed */}
      <header className="relative h-[55vh] min-h-[420px] bg-ink-900 overflow-hidden">
        {runner.cover_photo_url ? (
          <Image
            src={runner.cover_photo_url}
            alt=""
            fill
            className="object-cover opacity-90"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/30 to-transparent" />

        <div className="container-page relative h-full flex flex-col justify-end pb-24 md:pb-28 text-white">
          <Reveal>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition mb-4"
            >
              <span className="w-1 h-1 rounded-full bg-white/50" />
              {event.title}
            </Link>
            <h1 className="font-display font-medium text-display-2xl text-white leading-[0.95] max-w-3xl">
              {ownerName}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
              Running {goalKm.toFixed(0)} km for{" "}
              <em className="not-italic text-primary-300">
                {event.cause_summary.split(".")[0].toLowerCase()}
              </em>
              .
            </p>
          </Reveal>
        </div>
      </header>

      {/* Sticky donation rail + main content */}
      <div className="container-page -mt-16 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main story column */}
          <main className="lg:col-span-8">
            <div className="card p-8 md:p-10">
              <div className="flex items-start gap-5">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden ring-4 ring-white shadow-lift bg-canvas-deep">
                    {runner.profile_photo_url && (
                      <Image
                        src={runner.profile_photo_url}
                        alt={ownerName}
                        width={96}
                        height={96}
                        className="object-cover"
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0 pt-2">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="success">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-pulse" />
                      {runner.status}
                    </Badge>
                    {runner.team_name && (
                      <Badge variant="primary">{runner.team_name}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-ink-500">
                    Running for{" "}
                    <Link
                      href={`/events/${event.slug}`}
                      className="text-primary-600 font-semibold hover:underline underline-offset-2"
                    >
                      {event.organisation.name}
                    </Link>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(event.start_date)} → {formatDate(event.end_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.format.replace("_", "-")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Big at-a-glance "what they've done" line */}
              <div className="mt-8 pt-7 border-t border-ink-100">
                <p className="font-display text-2xl sm:text-3xl md:text-4xl text-ink-900 leading-[1.15]">
                  {firstName} has run{" "}
                  <span className="font-mono font-extrabold text-primary-600 tabular whitespace-nowrap">
                    {formatDistance(runner.distance_completed_km)}
                  </span>{" "}
                  so far.
                </p>
                <p className="mt-2 text-sm text-ink-500">
                  Goal {goalKm.toFixed(0)} km · Raising{" "}
                  <span className="font-mono font-bold text-ink-900 tabular">
                    {formatCurrency(raised)}
                  </span>{" "}
                  of {formatCurrency(goalAmt)}
                </p>
              </div>

              {runner.personal_story && (
                <div className="mt-10">
                  <span className="quote-mark block">&ldquo;</span>
                  <div className="-mt-8 pl-12 font-display text-xl md:text-2xl text-ink-800 leading-relaxed italic max-w-2xl">
                    {runner.personal_story}
                  </div>
                  <p className="mt-6 pl-12 text-sm font-medium text-ink-500">
                    — {ownerName}
                  </p>
                </div>
              )}

              <div className="mt-10 pt-10 border-t border-ink-100">
                <h2 className="eyebrow">The cause</h2>
                <p className="mt-3 font-display text-xl text-ink-800 leading-relaxed">
                  {event.cause_summary}
                </p>
                <p className="mt-4 text-ink-600 leading-relaxed line-clamp-4">
                  {event.description}
                </p>
                <Link
                  href={`/events/${event.slug}`}
                  className="btn-link mt-4"
                >
                  Read more about the cause →
                </Link>
              </div>
            </div>

            {/* Gallery — runner's own race-day / training photos */}
            {runner.gallery_urls && runner.gallery_urls.length > 0 && (
              <div className="card mt-6 p-8 md:p-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="eyebrow">Moments from the road</span>
                  <span className="text-xs text-ink-400 tabular">
                    {runner.gallery_urls.length} photos
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {runner.gallery_urls.map((url, i) => (
                    <a
                      key={url + i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-xl bg-canvas-deep block"
                    >
                      <Image
                        src={url}
                        alt={`${firstName} — photo ${i + 1}`}
                        fill
                        sizes="(min-width:768px) 25vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        Open
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="card mt-6 p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <span className="eyebrow">Achievements</span>
                <Trophy className="w-5 h-5 text-gold-500" />
              </div>
              <AchievementBadges eventRunnerId={runner.id} />
            </div>

            {/* "Why this cause matters" — server-rendered, auto-hides if no blocks */}
            {awarenessSlot}

            {/* Donor wall */}
            <div className="card mt-6 p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="eyebrow">The donor wall</span>
                  <h3 className="mt-2 font-display text-2xl text-ink-900">
                    {runner.donor_count}{" "}
                    {runner.donor_count === 1 ? "person" : "people"} are
                    cheering {firstName} on.
                  </h3>
                </div>
                <Trophy className="w-7 h-7 text-gold-500 hidden sm:block" />
              </div>

              {donations.length === 0 ? (
                <div className="py-10 text-center text-ink-500">
                  <Sparkles className="w-6 h-6 text-primary-400 mx-auto mb-3" />
                  Be the first to sponsor {firstName}.
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {donations.slice(0, 10).map((d, idx) => (
                    <li
                      key={d.id}
                      className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center font-display font-bold text-white flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-900 truncate">
                          {d.is_anonymous ? "Anonymous donor" : d.donor_name}
                        </p>
                        {d.message && (
                          <p className="mt-0.5 text-sm text-ink-600 italic line-clamp-2">
                            &ldquo;{d.message}&rdquo;
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-ink-900 tabular flex-shrink-0">
                        {formatCompactInr(d.final_amount ?? d.estimated_amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </main>

          {/* Sticky donate panel */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-5">
            <div className="card p-6 md:p-7">
              <p className="eyebrow">Raised so far</p>
              <p className="mt-3 font-display text-display-md text-ink-900 tabular leading-none">
                <AnimatedCounter
                  value={raised}
                  formatter={(n) => formatCurrency(Math.round(n))}
                />
              </p>
              <p className="mt-2 text-sm text-ink-500">
                of {formatCompactInr(goalAmt)} goal · {moneyPct}%
              </p>
              <ProgressBar pct={moneyPct} className="mt-4" />

              <div className="mt-6 pt-6 border-t border-ink-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-ink-500 uppercase tracking-wide mb-1">
                    Distance
                  </p>
                  <p className="font-display text-2xl text-ink-900 tabular">
                    {formatDistance(completedKm)}
                  </p>
                  <p className="text-xs text-ink-500">
                    of {goalKm.toFixed(0)} km
                  </p>
                  <ProgressBar
                    pct={distancePct}
                    variant="secondary"
                    height="sm"
                    className="mt-2"
                  />
                </div>
                <div>
                  <p className="text-xs text-ink-500 uppercase tracking-wide mb-1">
                    Donors
                  </p>
                  <p className="font-display text-2xl text-ink-900 tabular">
                    {runner.donor_count}
                  </p>
                  <p className="text-xs text-ink-500">supporters</p>
                </div>
              </div>

              <button
                onClick={() => setOpen(true)}
                className="btn-primary w-full mt-6 py-3.5 text-base"
              >
                <Heart className="w-4 h-4" /> Sponsor {firstName}
              </button>

              <Link
                href={`/audit/${event.id}`}
                className="block mt-3 text-center text-sm text-ink-500 hover:text-ink-900"
              >
                Where does the money go? →
              </Link>
            </div>

            <div className="card p-6">
              <h4 className="font-display text-base text-ink-900 mb-3">
                Spread the word
              </h4>
              <div className="flex gap-2">
                <ShareButton
                  url={shareUrl}
                  text={`Sponsor ${ownerName} for ${event.title}`}
                />
                <WhatsAppShare
                  url={shareUrl}
                  message={`I'm sponsoring ${ownerName} who's running ${goalKm.toFixed(0)} km for ${event.cause_summary} — join me!`}
                />
              </div>
              <p className="mt-3 text-xs text-ink-500 leading-relaxed">
                One share averages 3 new donations.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card p-6 bg-secondary-50 border-secondary-200"
            >
              <TrendingUp className="w-5 h-5 text-secondary-600 mb-2" />
              <p className="text-sm text-secondary-800 leading-relaxed">
                <strong className="font-display text-base">100% transparent</strong>
                <br />
                Funds sit in escrow. They&apos;re only released when the event
                closes and distance is verified — and you can see it on the
                public audit page.
              </p>
            </motion.div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky donate */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-ink-100 p-4 z-30 shadow-lift">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-500">{moneyPct}% of goal</p>
            <p className="font-mono font-bold text-ink-900 tabular truncate">
              {formatCurrency(raised)}
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Heart className="w-4 h-4" /> Sponsor
          </button>
        </div>
      </div>

      <DonationModal
        open={open}
        onClose={() => setOpen(false)}
        eventRunnerId={runner.id}
        runnerName={ownerName}
        runnerGoalKm={goalKm}
        is80gEligible={event.organisation.is_80g_eligible}
      />
    </article>
  );
}
