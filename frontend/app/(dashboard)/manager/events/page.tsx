import { cookies } from "next/headers";
import Link from "next/link";
import { Pencil, Activity, ExternalLink, PlusCircle, FileText } from "lucide-react";
import { SubmitEventButton } from "@/components/events/SubmitEventButton";
import { Badge } from "@/components/shared/Badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  formatCompactInr,
  daysBetween,
  progressPct,
} from "@/lib/utils";
import type { EventPublic } from "@/types";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchEvents(): Promise<EventPublic[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  // mine=true scopes results to this manager's organisation (any status,
  // including drafts that were excluded by the public filter)
  const res = await fetch(`${apiUrl}/events/?mine=true&limit=200`, {
    headers: token ? { Cookie: `access_token=${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as EventPublic[];
}

export default async function ManagerEventsPage(): Promise<React.ReactNode> {
  const events = await fetchEvents();
  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">My events</span>
          <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
            Events you&apos;re hosting
          </h1>
        </div>
        <Link href="/manager/events/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> New event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No events yet"
            description="Create your first event to start fundraising."
            action={
              <Link href="/manager/events/new" className="btn-primary">
                Create event
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const pct = progressPct(e.total_raised, e.fundraising_goal);
            const days = daysBetween(e.end_date);
            return (
              <div
                key={e.id}
                className="card p-5 grid md:grid-cols-12 gap-4 items-center"
              >
                <div className="md:col-span-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        e.status === "live"
                          ? "success"
                          : e.status === "draft"
                            ? "default"
                            : e.status === "pending_approval"
                              ? "warning"
                              : "primary"
                      }
                    >
                      {e.status.replace("_", " ")}
                    </Badge>
                    {e.is_featured && (
                      <Badge variant="warning">Featured</Badge>
                    )}
                  </div>
                  <Link
                    href={`/manager/events/${e.id}`}
                    className="font-display text-lg text-ink-900 leading-snug hover:text-primary-700 transition"
                  >
                    {e.title}
                  </Link>
                  <p className="text-sm text-ink-500 mt-0.5">
                    {e.cause_summary}
                  </p>
                </div>

                <div className="md:col-span-3">
                  <p className="font-mono font-bold text-ink-900 tabular text-base">
                    {formatCompactInr(e.total_raised)}
                  </p>
                  <p className="text-xs text-ink-400 tabular mb-1">
                    of {formatCompactInr(e.fundraising_goal)} · {pct}%
                  </p>
                  <ProgressBar pct={pct} height="sm" />
                </div>

                <div className="md:col-span-2 text-xs text-ink-500">
                  <p>{e.total_runners} runners</p>
                  <p>{days > 0 ? `${days}d left` : "Ended"}</p>
                </div>

                <div className="md:col-span-2 flex flex-wrap justify-end gap-1.5">
                  {/* Draft events: prominent submit-for-review button */}
                  {e.status === "draft" && (
                    <SubmitEventButton eventId={e.id} />
                  )}
                  {e.status !== "draft" && (
                    <Link
                      href={`/manager/events/${e.id}/distance-approvals`}
                      className="btn-secondary btn-sm"
                      title="Review distance entries"
                    >
                      <Activity className="w-3.5 h-3.5" /> Approve
                    </Link>
                  )}
                  <Link
                    href={`/manager/events/${e.id}/edit`}
                    className="btn-secondary btn-sm"
                    title="Edit event"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/manager/events/${e.id}/impact-report`}
                    className="btn-secondary btn-sm"
                    title="Publish impact report"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/events/${e.slug}`}
                    target="_blank"
                    className="btn-ghost btn-sm"
                    title="View public page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
