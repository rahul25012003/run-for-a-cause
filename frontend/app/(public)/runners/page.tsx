import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/shared/PageHero";
import { EmptyState } from "@/components/shared/EmptyState";
import { Reveal } from "@/components/shared/Reveal";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { formatCompactInr, formatDistance, progressPct } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Runners",
  description: "Meet the people running for causes they believe in.",
};

interface RunnerSpotlightItem {
  id: string;
  public_slug: string;
  full_name: string;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  personal_story: string | null;
  amount_raised: string;
  distance_completed_km: string;
  event_title: string;
  event_slug: string;
  event_cause_summary: string;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchRunners(): Promise<RunnerSpotlightItem[]> {
  try {
    const res = await fetch(`${apiUrl}/runners/spotlight?limit=200`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return (await res.json()) as RunnerSpotlightItem[];
  } catch {
    return [];
  }
}

export default async function RunnersPage(): Promise<React.ReactNode> {
  const runners = await fetchRunners();

  return (
    <>
      <PageHero
        eyebrow="Runners"
        heading="People running for change"
        subtitle="Every runner here has pledged their kilometres to a cause. Sponsor one and double their impact."
        variant="primary"
      />

      <section className="container-page py-12 md:py-16">
        {runners.length === 0 ? (
          <div className="card">
            <EmptyState
              illustration="runners"
              title="No runners yet"
              description="When someone joins an event as a runner, they'll appear here."
              action={
                <Link href="/events" className="btn-primary inline-flex">
                  Browse events
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <p className="eyebrow mb-6 text-ink-400">
              {runners.length} runner{runners.length !== 1 ? "s" : ""} across all events
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {runners.map((runner, i) => {
                const raised = parseFloat(runner.amount_raised);
                const km = parseFloat(runner.distance_completed_km);
                const initials = runner.full_name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("");

                return (
                  <Reveal key={runner.id} delay={i * 0.03}>
                    <Link
                      href={`/runners/${runner.public_slug}`}
                      className="card overflow-hidden flex flex-col h-full hover:shadow-lift hover:-translate-y-0.5 transition-all group"
                    >
                      {/* Cover photo / gradient header */}
                      <div className="relative h-28 bg-gradient-to-br from-primary-400 to-secondary-500 overflow-hidden">
                        {runner.cover_photo_url && (
                          <Image
                            src={runner.cover_photo_url}
                            alt=""
                            fill
                            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                            className="object-cover opacity-80"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/50 to-transparent" />
                        {/* Profile avatar */}
                        <div className="absolute bottom-0 left-4 translate-y-1/2">
                          <div className="w-12 h-12 rounded-full ring-2 ring-white overflow-hidden bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white font-display font-bold text-sm">
                            {runner.profile_photo_url ? (
                              <Image
                                src={runner.profile_photo_url}
                                alt={runner.full_name}
                                width={48}
                                height={48}
                                className="object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 pt-8 flex-1 flex flex-col">
                        <p className="font-semibold text-ink-900 group-hover:text-primary-700 transition-colors truncate">
                          {runner.full_name}
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5 truncate">
                          Running for{" "}
                          <span className="font-medium text-ink-700">
                            {runner.event_title}
                          </span>
                        </p>

                        {runner.personal_story && (
                          <p className="text-xs text-ink-500 mt-2 line-clamp-2 italic leading-relaxed">
                            &ldquo;{runner.personal_story}&rdquo;
                          </p>
                        )}

                        {/* Stats */}
                        <div className="mt-auto pt-4 grid grid-cols-2 gap-3 border-t border-ink-50">
                          <div>
                            <p className="text-[11px] text-ink-400 uppercase tracking-wider font-condensed">
                              Raised
                            </p>
                            <p className="font-mono font-bold text-ink-900 tabular text-sm">
                              {formatCompactInr(raised)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-ink-400 uppercase tracking-wider font-condensed">
                              Distance
                            </p>
                            <p className="font-mono font-bold text-ink-900 tabular text-sm">
                              {formatDistance(km)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
