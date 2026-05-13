import Image from "next/image";
import { Sparkles, Building2 } from "lucide-react";
import { formatCompactInr } from "@/lib/utils";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  multiplier: string;
  cap_amount: string;
  total_matched: string;
  is_active: boolean;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchSponsors(eventId: string): Promise<Sponsor[]> {
  try {
    const res = await fetch(`${apiUrl}/events/${eventId}/sponsors`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Sponsor[];
  } catch {
    return [];
  }
}

/**
 * Server component — fetches active sponsors for an event and renders a
 * "match-funded" banner. Returns null if no active sponsors so the event
 * page is unchanged for events without match-funding.
 */
export async function SponsorStrip({
  eventId,
}: {
  eventId: string;
}): Promise<React.ReactNode> {
  const sponsors = await fetchSponsors(eventId);
  if (sponsors.length === 0) return null;

  const totalCap = sponsors.reduce(
    (s, x) => s + parseFloat(x.cap_amount),
    0,
  );
  const totalMatched = sponsors.reduce(
    (s, x) => s + parseFloat(x.total_matched),
    0,
  );
  const remaining = Math.max(0, totalCap - totalMatched);

  return (
    <section className="container-page my-8">
      <div className="rounded-3xl bg-gradient-to-br from-secondary-50 via-white to-primary-50 border border-secondary-200/60 p-6 md:p-8 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-secondary-200/40 blur-2xl"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-500/15 text-secondary-700 text-[10px] font-bold tracking-[0.22em] uppercase">
                <Sparkles className="w-3 h-3" /> Match-funded
              </span>
              <h3 className="mt-3 font-display text-2xl text-ink-900 leading-tight">
                Every donation is matched by these partners.
              </h3>
              <p className="mt-2 text-sm text-ink-600 max-w-xl">
                {formatCompactInr(remaining)} of corporate matching remaining.
                Donate now to maximise your impact.
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-display-md text-secondary-700 tabular leading-none">
                {formatCompactInr(totalMatched)}
              </p>
              <p className="font-condensed text-[10px] uppercase tracking-[0.22em] text-ink-500 mt-2 font-semibold">
                Matched so far · cap {formatCompactInr(totalCap)}
              </p>
            </div>
          </div>

          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sponsors.map((s) => {
              const mx = parseFloat(s.multiplier);
              const matchLabel =
                mx === 2 ? "1× match" : `${(mx - 1).toFixed(1)}× match`;
              const card = (
                <div className="card p-4 flex items-center gap-3 hover:shadow-soft transition h-full">
                  {s.logo_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-canvas-deep flex-shrink-0">
                      <Image
                        src={s.logo_url}
                        alt={s.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-secondary-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{s.name}</p>
                    <p className="text-xs text-ink-500">
                      {matchLabel} · up to {formatCompactInr(s.cap_amount)}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={s.id}>
                  {s.website ? (
                    <a href={s.website} target="_blank" rel="noreferrer">
                      {card}
                    </a>
                  ) : (
                    card
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
