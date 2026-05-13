import { Users2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  total_raised: string;
  total_distance_km: string;
  member_count: number;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchTeams(eventId: string): Promise<Team[]> {
  try {
    const res = await fetch(`${apiUrl}/events/${eventId}/teams`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Team[];
  } catch {
    return [];
  }
}

export async function TeamLeaderboard({ eventId }: { eventId: string }) {
  const teams = await fetchTeams(eventId);
  if (teams.length === 0) return null;

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-4">
        <Users2 className="h-5 w-5 text-primary-500" aria-hidden />
        <h2 className="font-display text-xl text-ink-900">Team leaderboard</h2>
      </div>
      <ol className="space-y-2">
        {teams.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-3 py-2 border-b border-ink-50 last:border-0"
          >
            <span className="tabular text-ink-400 font-condensed text-sm w-6 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-900 truncate">{t.name}</p>
              <p className="text-xs text-ink-500">
                {t.member_count} runner{t.member_count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular font-mono font-semibold text-ink-900 text-sm">
                {formatCurrency(t.total_raised)}
              </p>
              <p className="text-xs text-ink-500 tabular">
                {parseFloat(t.total_distance_km).toFixed(1)} km
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
