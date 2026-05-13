"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Loader2,
  ArrowLeft,
  Activity,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDistance } from "@/lib/utils";

interface QueueItem {
  id: string;
  event_runner_id: string;
  runner_name: string;
  runner_slug: string;
  distance_km: string;
  activity_date: string;
  proof_url: string | null;
  proof_source: string;
  notes: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

export default function DistanceApprovalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: eventId } = use(params);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const url =
        tab === "pending"
          ? `/distance-logs/queue/by-event/${eventId}`
          : `/distance-logs/queue/by-event/${eventId}?include_reviewed=true`;
      const list = await api.get<QueueItem[]>(url);
      setItems(list);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Load failed",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, tab]);

  const approve = async (id: string): Promise<void> => {
    setActingOn(id);
    try {
      await api.post(`/distance-logs/${id}/approve`);
      toast.success("Distance approved");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    } finally {
      setActingOn(null);
    }
  };

  const reject = async (id: string): Promise<void> => {
    if (!rejectReason.trim()) {
      toast.error("Rejection reason required");
      return;
    }
    setActingOn(id);
    try {
      await api.post(`/distance-logs/${id}/reject`, {
        rejection_reason: rejectReason,
      });
      toast.success("Distance rejected");
      setRejectingId(null);
      setRejectReason("");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link
        href={`/manager/events/${eventId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to event
      </Link>

      <header className="mb-8">
        <span className="eyebrow">Distance approvals</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Review submitted runs
        </h1>
        <p className="mt-2 text-ink-500">
          Approve or reject every distance log before it counts toward the
          event total.
        </p>
      </header>

      <div className="flex gap-2 border-b border-ink-100 mb-6">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-primary-500 text-primary-700"
                : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {t === "pending" ? "Pending" : "All entries"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title={tab === "pending" ? "No pending entries" : "No entries yet"}
            description="Runners' new distance logs will appear here for your review."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="card p-5 grid md:grid-cols-12 gap-5 items-start"
            >
              {/* Proof */}
              <div className="md:col-span-3">
                {item.proof_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.proof_url}
                    alt=""
                    className="w-full aspect-[4/3] object-cover rounded-xl border border-ink-100"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] rounded-xl bg-canvas-subtle border border-ink-100 flex items-center justify-center text-ink-300">
                    <Activity className="w-6 h-6" />
                  </div>
                )}
                {item.proof_url && (
                  <a
                    href={item.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                  >
                    Open full size <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Details */}
              <div className="md:col-span-6">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/runners/${item.runner_slug}`}
                    className="font-semibold text-ink-900 hover:text-primary-700"
                  >
                    {item.runner_name}
                  </Link>
                  <Badge
                    variant={
                      item.status === "approved"
                        ? "success"
                        : item.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="font-mono font-bold text-2xl text-ink-900 tabular">
                  {formatDistance(item.distance_km)}
                </p>
                <p className="text-sm text-ink-500 mt-1">
                  {item.activity_date} · via{" "}
                  <span className="capitalize">
                    {item.proof_source.replace("_", " ")}
                  </span>
                </p>
                {item.notes && (
                  <p className="mt-3 text-sm text-ink-600 bg-canvas-subtle rounded-xl p-3 italic">
                    &ldquo;{item.notes}&rdquo;
                  </p>
                )}
                {item.rejection_reason && (
                  <p className="mt-3 text-sm text-danger-600 bg-danger-50 rounded-xl p-3">
                    Rejected: {item.rejection_reason}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="md:col-span-3 flex flex-col gap-2">
                {(item.status === "submitted" ||
                  item.status === "under_review") && (
                  <>
                    {rejectingId === item.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          placeholder="Reason for rejection…"
                          className="input text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            className="btn-secondary btn-sm flex-1"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => reject(item.id)}
                            disabled={actingOn === item.id}
                            className="btn-primary btn-sm flex-1 !bg-danger-500 hover:!bg-danger-600"
                          >
                            {actingOn === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Confirm reject"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => approve(item.id)}
                          disabled={actingOn === item.id}
                          className="btn-primary btn-sm w-full"
                        >
                          {actingOn === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" /> Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setRejectingId(item.id)}
                          className="btn-secondary btn-sm w-full"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
