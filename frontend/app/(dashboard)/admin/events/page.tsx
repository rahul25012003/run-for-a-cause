"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Star,
  CheckSquare,
  XSquare,
  Wallet,
  ExternalLink,
  Pencil,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCompactInr, formatDate, progressPct } from "@/lib/utils";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { EventPublic } from "@/types";

// ── Status legend shown at the top ──────────────────────────────────────────
const STATUS_LEGEND = [
  { status: "draft", label: "Draft", desc: "Manager saved but hasn't submitted yet." },
  { status: "pending_approval", label: "Pending", desc: "Submitted by manager — needs your review." },
  { status: "approved", label: "Approved", desc: "Approved but start date hasn't arrived yet." },
  { status: "live", label: "Live", desc: "Actively running — runners logging distance." },
  { status: "completed", label: "Completed", desc: "End date passed. Ready to close & settle." },
  { status: "settling", label: "Settling", desc: "True-up calculation in progress." },
  { status: "settled", label: "Settled", desc: "Funds computed. Payout can be created." },
];

export default function AdminEventsPage(): React.ReactNode {
  const [events, setEvents] = useState<EventPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await api.get<EventPublic[]>("/events?all=true&limit=200");
      setEvents(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async (
    id: string,
    successMsg: string,
    fn: () => Promise<unknown>,
  ): Promise<void> => {
    setActingOn(id);
    try {
      await fn();
      toast.success(successMsg);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Action failed");
    } finally {
      setActingOn(null);
    }
  };

  const confirmReject = async (): Promise<void> => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason so the manager knows what to fix.");
      return;
    }
    setRejecting(true);
    try {
      await api.post(`/events/${rejectTarget}/reject`, { reason: rejectReason.trim() });
      toast.success("Event sent back to draft with your feedback.");
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Reject failed");
    } finally {
      setRejecting(false);
    }
  };

  // Determine if an "approved" event's start date has already passed
  const isOverdue = (event: EventPublic) =>
    event.status === "approved" && event.start_date <= new Date().toISOString().split("T")[0];

  const pendingCount = events.filter((e) => e.status === "pending_approval").length;
  const overdueCount = events.filter(isOverdue).length;

  return (
    <div className="p-6 md:p-10 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="eyebrow">Admin</span>
          <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
            All events
          </h1>
          <p className="mt-2 text-ink-500">
            Approve, feature, settle, and pay out events here.{" "}
            <button
              type="button"
              onClick={() => setShowLegend((v) => !v)}
              className="text-primary-600 hover:underline underline-offset-4 text-sm"
            >
              {showLegend ? "Hide" : "How does this work?"}
            </button>
          </p>
        </div>
        <Link href="/manager/events/new" className="btn-primary">
          Create event
        </Link>
      </div>

      {/* ── Lifecycle legend ── */}
      {showLegend && (
        <div className="card p-6 bg-canvas-subtle border-ink-200">
          <p className="font-semibold text-ink-900 mb-4 text-sm">
            Event lifecycle — how statuses flow
          </p>
          {/* Flow diagram */}
          <div className="flex flex-wrap items-center gap-2 mb-5 text-xs font-mono">
            {["draft", "→", "pending_approval", "→", "approved / live", "→", "completed", "→", "settled", "→", "payout"].map(
              (step, i) => (
                <span
                  key={i}
                  className={step === "→" ? "text-ink-300" : "chip bg-white border border-ink-200 text-ink-700"}
                >
                  {step}
                </span>
              ),
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STATUS_LEGEND.map((s) => (
              <div key={s.status} className="rounded-lg border border-ink-100 bg-white p-3">
                <p className="font-semibold text-ink-900 text-xs uppercase tracking-wide mb-1">
                  {s.label}
                </p>
                <p className="text-xs text-ink-500 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100 text-xs text-ink-500 space-y-1">
            <p><strong>Approve</strong> → If today is within the event&apos;s date range, it goes straight to <em>live</em>. Otherwise it waits as <em>approved</em> until the start date.</p>
            <p><strong>Go live</strong> → Manually push an approved event to live when its start date has passed.</p>
            <p><strong>Close &amp; settle</strong> → Locks distance, true-ups per-km donations, records refund intents. Status becomes <em>settled</em>.</p>
            <p><strong>Payout</strong> → Creates the Payout record and triggers the Razorpay transfer to the NGO&apos;s bank account.</p>
          </div>
        </div>
      )}

      {/* ── Alert banners ── */}
      {pendingCount > 0 && (
        <div className="card p-4 border-yellow-300 bg-yellow-50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0" />
          <p className="text-sm text-ink-900">
            <strong>{pendingCount} event{pendingCount !== 1 ? "s" : ""}</strong> waiting for your approval.
          </p>
        </div>
      )}
      {overdueCount > 0 && (
        <div className="card p-4 border-orange-300 bg-orange-50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-700 flex-shrink-0" />
          <p className="text-sm text-ink-900">
            <strong>{overdueCount} approved event{overdueCount !== 1 ? "s" : ""}</strong>{" "}
            past their start date — click <em>Go live</em> to activate.
          </p>
        </div>
      )}

      {/* ── Events table ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center gap-2 text-ink-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading events…
          </div>
        ) : events.length === 0 ? (
          <EmptyState title="No events yet" description="Events created by managers appear here." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-canvas-subtle border-b border-ink-100">
              <tr>
                <Th>Event</Th>
                <Th>Status</Th>
                <Th>Dates</Th>
                <Th>Raised</Th>
                <Th>Runners</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const pct = progressPct(event.total_raised, event.fundraising_goal);
                const busy = actingOn === event.id;
                const overdue = isOverdue(event);

                return (
                  <tr
                    key={event.id}
                    className={`border-b border-ink-50 last:border-0 align-top ${overdue ? "bg-orange-50/40" : ""}`}
                  >
                    {/* Event name + cause summary + progress */}
                    <td className="px-5 py-4 max-w-xs">
                      <p className="font-semibold text-ink-900 leading-snug">{event.title}</p>
                      <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">
                        {event.cause_summary}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar pct={pct} height="sm" className="w-24" />
                        <span className="text-[11px] text-ink-400 tabular">{pct}%</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          event.status === "live"
                            ? "success"
                            : event.status === "settled"
                              ? "primary"
                              : event.status === "pending_approval"
                                ? "warning"
                                : event.status === "approved"
                                  ? "primary"
                                  : "default"
                        }
                      >
                        {event.status.replace(/_/g, " ")}
                      </Badge>
                      {overdue && (
                        <p className="text-[10px] text-orange-600 font-semibold mt-1">
                          start date passed
                        </p>
                      )}
                      {event.is_featured && (
                        <p className="text-[10px] text-gold-600 font-semibold mt-1 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-gold-500 text-gold-500" /> featured
                        </p>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-ink-500">
                      <p>{formatDate(event.start_date)}</p>
                      <p>→ {formatDate(event.end_date)}</p>
                    </td>

                    {/* Raised */}
                    <td className="px-5 py-4 font-mono tabular text-ink-900 font-bold whitespace-nowrap">
                      {formatCompactInr(event.total_raised)}
                    </td>

                    {/* Runners */}
                    <td className="px-5 py-4 text-ink-700 tabular">
                      {event.total_runners}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 justify-end">

                        {/* Pending approval: Approve + Reject */}
                        {event.status === "pending_approval" && (
                          <>
                            <button
                              onClick={() =>
                                act(event.id, "Event approved ✓", () =>
                                  api.post(`/events/${event.id}/approve`, {}),
                                )
                              }
                              disabled={busy}
                              className="btn-primary btn-sm inline-flex items-center gap-1"
                            >
                              {busy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckSquare className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectTarget(event.id)}
                              disabled={busy}
                              className="btn-secondary btn-sm inline-flex items-center gap-1"
                            >
                              <XSquare className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {/* Approved + overdue: Go live */}
                        {overdue && (
                          <button
                            onClick={() =>
                              act(event.id, "Event is now live", () =>
                                api.post(`/events/${event.id}/approve`, {}),
                              )
                            }
                            disabled={busy}
                            className="btn-primary btn-sm inline-flex items-center gap-1"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PlayCircle className="w-3.5 h-3.5" />
                            )}
                            Go live
                          </button>
                        )}

                        {/* Live/completed: Close & settle */}
                        {(event.status === "live" || event.status === "completed") && (
                          <button
                            onClick={() =>
                              act(event.id, "Event closed & settled", () =>
                                api.post(`/settlement/events/${event.id}/close`),
                              )
                            }
                            disabled={busy}
                            className="btn-secondary btn-sm"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Close & settle"
                            )}
                          </button>
                        )}

                        {/* Settled: Payout */}
                        {event.status === "settled" && (
                          <button
                            onClick={() =>
                              act(event.id, "Payout created", () =>
                                api.post(`/settlement/events/${event.id}/create-payout`),
                              )
                            }
                            disabled={busy}
                            className="btn-primary btn-sm inline-flex items-center gap-1"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Wallet className="w-3.5 h-3.5" />
                            )}
                            Payout
                          </button>
                        )}

                        {/* Feature toggle (all statuses) */}
                        <button
                          onClick={() =>
                            act(
                              event.id,
                              event.is_featured ? "Unfeatured" : "Featured on homepage",
                              () => api.post(`/events/${event.id}/feature`, {}),
                            )
                          }
                          disabled={busy}
                          className="btn-ghost btn-sm"
                          title={event.is_featured ? "Remove from featured" : "Feature on homepage"}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${event.is_featured ? "fill-gold-500 text-gold-500" : "text-ink-400"}`}
                          />
                        </button>

                        {/* Edit */}
                        <Link
                          href={`/manager/events/${event.id}/edit`}
                          className="btn-ghost btn-sm"
                          title="Edit event"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>

                        {/* Preview public event page */}
                        <Link
                          href={`/events/${event.slug}`}
                          target="_blank"
                          className="btn-ghost btn-sm"
                          title="Preview public event page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Reject modal ── */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setRejectTarget(null); setRejectReason(""); }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl text-ink-900 mb-2">
              Reject this event
            </h2>
            <p className="text-sm text-ink-500 mb-4">
              The event will go back to <strong>draft</strong>. Tell the manager exactly what needs to be fixed.
            </p>
            <label className="block">
              <span className="label">Rejection reason <span className="text-danger-500">*</span></span>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Cause summary is too vague — please add specific impact goals and beneficiary numbers."
                className="input mt-1"
                autoFocus
              />
            </label>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="btn-ghost"
                disabled={rejecting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={rejecting || !rejectReason.trim()}
                className="btn-secondary inline-flex items-center gap-2"
              >
                {rejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send back to draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}): React.ReactNode {
  return (
    <th
      className={`px-5 py-3 text-${align} text-xs font-semibold text-ink-500 uppercase tracking-wider`}
    >
      {children}
    </th>
  );
}
