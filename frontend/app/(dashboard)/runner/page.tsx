import { cookies } from "next/headers";
import Link from "next/link";
import { Activity, Heart, Trophy, Award, ExternalLink } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCompactInr, formatDistance } from "@/lib/utils";
import type { RunnerProfilePublic } from "@/types";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchMyEvents(): Promise<RunnerProfilePublic[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];
  const res = await fetch(`${apiUrl}/me/runner-events`, {
    headers: { Cookie: `access_token=${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as RunnerProfilePublic[];
}

export default async function RunnerOverviewPage(): Promise<React.ReactNode> {
  const events = await fetchMyEvents();
  const totalRaised = events.reduce(
    (s, e) => s + parseFloat(e.amount_raised),
    0,
  );
  const totalKm = events.reduce(
    (s, e) => s + parseFloat(e.distance_completed_km),
    0,
  );
  const totalDonors = events.reduce((s, e) => s + e.donor_count, 0);

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header>
        <span className="eyebrow">Your fundraising</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Every kilometre is funding something real.
        </h1>
        <p className="mt-2 text-ink-500">
          Log distance, share your page, watch the donations roll in.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Total raised"
          value={formatCompactInr(totalRaised)}
          icon={<Heart className="w-4 h-4" />}
          variant="primary"
        />
        <StatCard
          label="Total distance"
          value={formatDistance(totalKm)}
          icon={<Activity className="w-4 h-4" />}
          variant="secondary"
        />
        <StatCard
          label="Sponsors"
          value={String(totalDonors)}
          icon={<Trophy className="w-4 h-4" />}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink-900">Your events</h2>
        <Link href="/events" className="btn-link text-sm">
          Browse more →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-600">
            You haven&apos;t joined any events yet.
          </p>
          <Link href="/events" className="btn-primary mt-5 inline-flex">
            Browse events
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map((er) => (
            <div key={er.id} className="card p-6 hover:shadow-lift transition">
              <p className="text-xs text-ink-400 uppercase tracking-wider font-semibold">
                Public profile
              </p>
              <Link
                href={`/runners/${er.public_slug}`}
                className="mt-2 font-display text-lg text-ink-900 truncate hover:text-primary-600 block"
              >
                /runners/{er.public_slug}
              </Link>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-ink-400">Raised</p>
                  <p className="font-mono font-bold text-ink-900 tabular">
                    {formatCompactInr(er.amount_raised)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Distance</p>
                  <p className="font-mono font-bold text-ink-900 tabular">
                    {formatDistance(er.distance_completed_km)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/runners/${er.public_slug}`}
                  target="_blank"
                  className="btn-primary btn-sm flex-1 justify-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Public page
                </Link>
                <a
                  href={`/api/v1/certificates/runner/${er.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary btn-sm flex-1 justify-center"
                  title="Download certificate"
                >
                  <Award className="w-3.5 h-3.5" /> Certificate
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
