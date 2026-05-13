import { cookies } from "next/headers";
import Link from "next/link";
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

export default async function RunnerEventsPage(): Promise<React.ReactNode> {
  const events = await fetchMyEvents();
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <span className="eyebrow">My events</span>
        <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
          Events you&apos;re running
        </h1>
      </header>

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="card p-10 text-center text-ink-500 text-sm">
            You haven&apos;t joined any events yet.{" "}
            <Link href="/events" className="text-primary-600 hover:underline">Browse events →</Link>
          </div>
        ) : (
          events.map((er) => (
            <div
              key={er.id}
              className="card p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/runners/${er.public_slug}`}
                  className="font-semibold text-ink-900 hover:text-primary-700 transition-colors"
                >
                  {er.event_title || er.public_slug}
                </Link>
                <p className="text-sm text-ink-500 mt-0.5">
                  {formatCompactInr(er.amount_raised)} raised ·{" "}
                  {formatDistance(er.distance_completed_km)} run · {er.donor_count} donors
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`chip capitalize ${
                  er.status === "active" || er.status === "approved"
                    ? "bg-secondary-100 text-secondary-700"
                    : "bg-canvas-subtle text-ink-500"
                }`}>
                  {er.status}
                </span>
                <Link
                  href={`/runners/${er.public_slug}`}
                  className="btn-ghost btn-sm"
                  title="View public profile"
                >
                  View
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
