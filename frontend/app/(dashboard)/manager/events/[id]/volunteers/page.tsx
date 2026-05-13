"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";

interface Volunteer {
  id: string;
  role_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  notes: string | null;
  created_at: string;
}

interface VolunteerRole {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  filled: number;
}

const STATUS_VARIANT: Record<
  Volunteer["status"],
  "warning" | "success" | "danger" | "outline"
> = {
  pending: "warning",
  confirmed: "success",
  declined: "danger",
  cancelled: "outline",
};

export default function ManagerVolunteersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: eventId } = use(params);
  const [vols, setVols] = useState<Volunteer[]>([]);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Volunteer["status"]>("pending");

  const refresh = async () => {
    setLoading(true);
    try {
      const [v, r] = await Promise.all([
        api.get<Volunteer[]>(`/events/${eventId}/volunteers`),
        api.get<VolunteerRole[]>(`/events/${eventId}/volunteer-roles`),
      ]);
      setVols(v);
      setRoles(r);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [eventId]);

  const decide = async (id: string, status: Volunteer["status"]) => {
    setUpdating(id);
    try {
      await api.put(`/volunteers/${id}/status`, { status });
      toast.success(`Marked ${status}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setUpdating(null);
    }
  };

  const visible = vols.filter((v) => filter === "all" || v.status === filter);
  const counts = vols.reduce<Record<string, number>>(
    (acc, v) => ({ ...acc, [v.status]: (acc[v.status] || 0) + 1 }),
    {},
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/manager/events/${eventId}`}
        className="btn-link inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to event
      </Link>

      <div className="flex items-start gap-3">
        <Users className="h-6 w-6 text-primary-500 mt-1" aria-hidden />
        <div>
          <h1 className="font-display text-3xl text-ink-900">Volunteers</h1>
          <p className="text-ink-600">
            Confirm or decline signups across {roles.length} role
            {roles.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      {roles.length > 0 && (
        <div className="card">
          <p className="eyebrow mb-3 text-ink-500">Roles & capacity</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-lg border border-ink-100 bg-cream-50/50"
              >
                <p className="font-semibold text-ink-900">{r.title}</p>
                <p className="tabular text-sm text-ink-600 mt-1">
                  {r.filled} / {r.capacity} filled
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pending", "Pending"],
            ["confirmed", "Confirmed"],
            ["declined", "Declined"],
            ["all", "All"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`chip cursor-pointer ${
              filter === k
                ? "bg-ink-900 text-cream-50 border-ink-900"
                : "bg-cream-50"
            }`}
          >
            {label}
            {k !== "all" && counts[k] !== undefined && (
              <span className="ml-2 tabular">{counts[k]}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="runners"
            title="Nothing to review"
            description={
              filter === "pending"
                ? "All signups have been decided. Switch to 'All' to see history."
                : "No signups in this filter yet."
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((v) => (
            <li key={v.id} className="card flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{v.full_name}</p>
                  <Badge variant={STATUS_VARIANT[v.status]}>{v.status}</Badge>
                </div>
                <p className="text-sm text-ink-600 mt-0.5">
                  {v.email}
                  {v.phone && ` · ${v.phone}`}
                </p>
                {v.notes && (
                  <p className="text-sm text-ink-700 mt-2 italic">
                    &ldquo;{v.notes}&rdquo;
                  </p>
                )}
              </div>
              {v.status === "pending" && (
                <div className="flex sm:flex-col gap-2 self-start">
                  <button
                    type="button"
                    onClick={() => decide(v.id, "confirmed")}
                    disabled={updating === v.id}
                    className="btn-primary btn-sm flex items-center gap-1"
                  >
                    {updating === v.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(v.id, "declined")}
                    disabled={updating === v.id}
                    className="btn-secondary btn-sm flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
