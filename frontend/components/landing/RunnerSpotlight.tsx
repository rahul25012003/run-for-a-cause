import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { formatCompactInr, formatDistance } from "@/lib/utils";

interface SpotlightItem {
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

const FALLBACK: SpotlightItem[] = [
  {
    id: "fallback-1",
    public_slug: "ravi-runs-for-education",
    full_name: "Ravi Kumar",
    profile_photo_url: "https://i.pravatar.cc/300?u=ravi.kumar@example.com",
    cover_photo_url:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80",
    personal_story:
      "I ran 100 km in March. Forty-seven friends sponsored me. Twelve girls go to school for a year because of it.",
    amount_raised: "47300",
    distance_completed_km: "100",
    event_title: "Run for Education 2026",
    event_slug: "run-for-education",
    event_cause_summary: "Education for Underprivileged Girls",
  },
  {
    id: "fallback-2",
    public_slug: "priya-runs-for-forests",
    full_name: "Priya Shah",
    profile_photo_url: "https://i.pravatar.cc/300?u=priya.shah@example.com",
    cover_photo_url:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&q=80",
    personal_story:
      "Lost 30 kg last year. This was the first time my running was about something bigger than me.",
    amount_raised: "32100",
    distance_completed_km: "75",
    event_title: "Run for the Forest",
    event_slug: "run-for-the-forest",
    event_cause_summary: "Reforestation in the Western Ghats",
  },
  {
    id: "fallback-3",
    public_slug: "sneha-runs-for-education",
    full_name: "Sneha Iyer",
    profile_photo_url: "https://i.pravatar.cc/300?u=sneha.iyer@example.com",
    cover_photo_url:
      "https://images.unsplash.com/photo-1486218119243-13883505764c?w=1200&q=80",
    personal_story:
      "Every km I run is a sentence in a book a girl will read. That's the math that matters.",
    amount_raised: "58900",
    distance_completed_km: "120",
    event_title: "Run for Education 2026",
    event_slug: "run-for-education",
    event_cause_summary: "Education for Underprivileged Girls",
  },
];

// Cover photo fallbacks — rotated by index when the runner hasn't uploaded one.
const COVER_FALLBACKS = [
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80",
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&q=80",
  "https://images.unsplash.com/photo-1486218119243-13883505764c?w=1200&q=80",
];

async function fetchSpotlight(): Promise<SpotlightItem[]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  try {
    const res = await fetch(`${apiUrl}/runners/spotlight?limit=3`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return FALLBACK;
    const items = (await res.json()) as SpotlightItem[];
    return items.length > 0 ? items : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export async function RunnerSpotlight(): Promise<React.ReactNode> {
  const runners = await fetchSpotlight();

  return (
    <section className="section relative overflow-hidden">
      <div
        className="absolute left-0 top-0 select-none pointer-events-none hidden lg:block"
        aria-hidden
      >
        <p
          className="font-condensed italic font-black leading-none tracking-[-0.02em] text-outline-thick"
          style={{
            fontSize: "clamp(180px, 22vw, 360px)",
            color: "#FFC79A",
            opacity: 0.45,
          }}
        >
          STORIES
        </p>
      </div>

      <div className="container-page relative">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-14 flex-wrap">
            <div className="max-w-xl">
              <span className="eyebrow">Runner stories</span>
              <h2 className="mt-4 font-display font-medium text-display-lg text-ink-900">
                The protagonists, not the platform.
              </h2>
              <p className="mt-4 text-lg text-ink-600 max-w-md leading-relaxed">
                Every fundraising page is someone&apos;s personal challenge —
                their story, their distance, their donor list.
              </p>
            </div>
            <Link href="/events" className="btn-link">
              Meet more runners →
            </Link>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {runners.map((r, i) => {
            const story = r.personal_story?.trim() || r.event_cause_summary;
            const coverImage =
              r.cover_photo_url || COVER_FALLBACKS[i % COVER_FALLBACKS.length];
            return (
              <Reveal key={r.id} delay={i * 0.08}>
                <Tilt3D max={6} scale={1.02} className="h-full">
                  <Link
                    href={`/runners/${r.public_slug}`}
                    className="group card overflow-hidden flex flex-col h-full"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-canvas-deep">
                      <Image
                        src={coverImage}
                        alt={r.full_name}
                        fill
                        sizes="(min-width:768px) 33vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{ transform: "translateZ(50px)" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/40 to-transparent" />

                      <div
                        className="absolute bottom-0 left-0 right-0 p-6 text-white"
                        style={{ transform: "translateZ(30px)" }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {r.profile_photo_url && (
                            <Image
                              src={r.profile_photo_url}
                              alt=""
                              width={36}
                              height={36}
                              className="rounded-full ring-2 ring-white/40"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">
                              {r.full_name}
                            </p>
                            <p className="text-[11px] text-white/60 truncate">
                              Running for {r.event_cause_summary}
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all flex-shrink-0" />
                        </div>
                        <blockquote className="font-display text-lg leading-snug italic line-clamp-3">
                          &ldquo;{story}&rdquo;
                        </blockquote>
                      </div>
                    </div>
                    <div
                      className="px-5 py-4 grid grid-cols-3 gap-2 items-center bg-white border-t border-ink-100"
                      style={{ transform: "translateZ(15px)" }}
                    >
                      <div>
                        <p className="font-condensed text-[10px] uppercase tracking-[0.22em] text-ink-400 font-semibold">
                          Raised
                        </p>
                        <p className="font-mono font-extrabold text-ink-900 tabular text-lg leading-none mt-1">
                          {formatCompactInr(r.amount_raised)}
                        </p>
                      </div>
                      <div>
                        <p className="font-condensed text-[10px] uppercase tracking-[0.22em] text-ink-400 font-semibold">
                          Distance
                        </p>
                        <p className="font-mono font-extrabold text-primary-600 tabular text-lg leading-none mt-1">
                          {formatDistance(r.distance_completed_km)}
                        </p>
                      </div>
                      <span className="text-right text-xs font-bold text-primary-600 group-hover:text-primary-700 inline-flex items-center justify-end gap-1">
                        Sponsor →
                      </span>
                    </div>
                  </Link>
                </Tilt3D>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
