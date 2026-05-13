import { cookies } from "next/headers";
import Link from "next/link";
import { Users, ExternalLink } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCompactInr, formatDistance } from "@/lib/utils";

interface RunnerRow {
  id: string;
  public_slug: string;
  full_name: string;
  profile_photo_url: string | null;
  amount_raised: string;
  distance_completed_km: string;
  event_title: string;
  event_slug: string;
  event_cause_summary: string;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchRunners(): Promise<RunnerRow[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  try {
    const res = await fetch(`${apiUrl}/runners/spotlight?limit=500`, {
      headers: token ? { Cookie: `access_token=${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as RunnerRow[];
  } catch {
    return [];
  }
}

export default async function AdminRunnersPage(): Promise<React.ReactNode> {
  const runners = await fetchRunners();

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <span className="eyebrow">Runners</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Runner directory
        </h1>
        <p className="mt-2 text-ink-500">
          All approved runners across every event.{" "}
          <span className="font-mono tabular text-ink-900">{runners.length}</span> total.
        </p>
      </header>

      {runners.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="runners"
            title="No approved runners yet"
            description="Runners appear here once a manager approves their event registration."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-subtle border-b border-ink-100">
              <tr>
                <Th>Runner</Th>
                <Th>Event</Th>
                <Th align="right">Raised</Th>
                <Th align="right">Distance</Th>
                <Th align="right">Profile</Th>
              </tr>
            </thead>
            <tbody>
              {runners.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-ink-50 last:border-0 hover:bg-canvas-subtle/60 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink-900">{r.full_name}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/events/${r.event_slug}`}
                      target="_blank"
                      className="text-primary-600 hover:underline underline-offset-4 text-xs"
                    >
                      {r.event_title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular font-semibold text-ink-900">
                    {formatCompactInr(r.amount_raised)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular text-ink-600">
                    {formatDistance(r.distance_completed_km)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/runners/${r.public_slug}`}
                      target="_blank"
                      className="btn-ghost btn-sm inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-500 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}
