import { cookies } from "next/headers";
import Link from "next/link";
import { Heart, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { formatCompactInr, progressPct } from "@/lib/utils";
import type { RunnerProfilePublic } from "@/types";

interface DonationPublic {
  id: string;
  donor_name: string;
  is_anonymous: boolean;
  estimated_amount: string;
  final_amount: string | null;
  status: string;
  message: string | null;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchMyRunnerProfiles(): Promise<RunnerProfilePublic[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];
  try {
    const res = await fetch(`${apiUrl}/me/runner-events`, {
      headers: { Cookie: `access_token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as RunnerProfilePublic[];
  } catch {
    return [];
  }
}

async function fetchDonationsForRunner(runnerId: string, token: string): Promise<DonationPublic[]> {
  try {
    const res = await fetch(`${apiUrl}/donations/by-runner/${runnerId}`, {
      headers: { Cookie: `access_token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as DonationPublic[];
  } catch {
    return [];
  }
}

export default async function MyDonorsPage(): Promise<React.ReactNode> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value ?? "";

  const profiles = await fetchMyRunnerProfiles();

  // Fetch donations in parallel for all runner profiles (capped at 5 events)
  const profilesWithDonations = await Promise.all(
    profiles.slice(0, 5).map(async (p) => ({
      profile: p,
      donations: await fetchDonationsForRunner(p.id, token),
    })),
  );

  const totalDonors = profilesWithDonations.reduce(
    (sum, p) => sum + p.profile.donor_count,
    0,
  );
  const totalRaised = profilesWithDonations.reduce(
    (sum, p) => sum + parseFloat(p.profile.amount_raised),
    0,
  );

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-8">
      <header>
        <span className="eyebrow">My sponsors</span>
        <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
          People cheering you on
        </h1>
        <p className="mt-2 text-ink-500">
          {totalDonors > 0
            ? `${totalDonors} sponsor${totalDonors !== 1 ? "s" : ""} across all your events · ${formatCompactInr(totalRaised)} raised`
            : "Your sponsors will appear here once you start receiving donations."}
        </p>
      </header>

      {profiles.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="donations"
            title="No events joined yet"
            description="Join a run event as a runner and share your profile to start receiving sponsors."
            action={
              <Link href="/events" className="btn-primary inline-flex">
                Browse events
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {profilesWithDonations.map(({ profile, donations }) => {
            const raised = parseFloat(profile.amount_raised);
            const goal = parseFloat(profile.personal_goal_amount ?? "50000") || 50000;
            const pct = progressPct(raised, goal);
            const captured = donations.filter(
              (d) => d.status === "captured" || d.status === "settled",
            );

            return (
              <div key={profile.id} className="card p-6">
                {/* Event header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg text-ink-900 leading-snug">
                      {profile.event_title || "Event"}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="font-mono font-bold text-ink-900 tabular">
                        {formatCompactInr(raised)}
                      </span>
                      <span className="text-xs text-ink-400">
                        of {formatCompactInr(goal)} · {pct}%
                      </span>
                    </div>
                    <ProgressBar pct={pct} height="sm" className="mt-2 max-w-xs" />
                  </div>
                  <Link
                    href={`/runners/${profile.public_slug}`}
                    target="_blank"
                    className="btn-ghost btn-sm inline-flex items-center gap-1 flex-shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Public page
                  </Link>
                </div>

                {/* Donors list */}
                {captured.length === 0 ? (
                  <p className="text-sm text-ink-400 py-2">
                    No sponsors yet for this event — share your profile link to get started.
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-50">
                    {captured.map((d) => (
                      <li key={d.id} className="py-2.5 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {d.donor_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-900 truncate">
                            {d.is_anonymous ? "Anonymous donor" : d.donor_name}
                          </p>
                          {d.message && (
                            <p className="text-xs text-ink-500 italic truncate">
                              &ldquo;{d.message}&rdquo;
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-sm font-semibold text-ink-900 tabular flex-shrink-0">
                          {formatCompactInr(d.final_amount ?? d.estimated_amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {profile.donor_count > captured.length && (
                  <p className="mt-3 text-xs text-ink-400">
                    +{profile.donor_count - captured.length} pledged (pending payment capture)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
