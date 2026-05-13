"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  ScanLine,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/shared/EmptyState";

interface Runner {
  id: string;
  user_id: string;
  full_name: string;
  public_slug: string;
  status: string;
  checked_in_at: string | null;
}

const IST_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default function ManagerCheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: eventId } = use(params);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await api.get<Runner[]>(`/events/${eventId}/runners`);
      setRunners(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [eventId]);

  const checkIn = async (runnerId: string) => {
    setBusyId(runnerId);
    try {
      const r = await api.post<{ was_already_checked_in: boolean }>(
        `/event-runners/${runnerId}/checkin`,
        {},
      );
      toast.success(r.was_already_checked_in ? "Already in" : "Checked in!");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = runners.filter((r) =>
    search ? r.full_name.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const checkedIn = runners.filter((r) => r.checked_in_at).length;

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
        <ScanLine className="h-6 w-6 text-primary-500 mt-1" aria-hidden />
        <div>
          <h1 className="font-display text-3xl text-ink-900">Check-in</h1>
          <p className="text-ink-600">
            {checkedIn} of {runners.length} runners present. Scan a runner&apos;s QR
            with your phone, or tap to mark in.
          </p>
        </div>
      </div>

      <div className="card relative">
        <Search
          aria-hidden
          className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400"
        />
        <input
          type="search"
          placeholder="Search runners..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9 w-full"
          aria-label="Search runners"
        />
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="No runners" description="No matches for that search." />
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const isIn = !!r.checked_in_at;
            return (
              <li
                key={r.id}
                className="card flex items-center gap-3 py-3"
              >
                {isIn ? (
                  <CheckCircle2
                    className="h-5 w-5 text-success-600 flex-shrink-0"
                    aria-label="Checked in"
                  />
                ) : (
                  <Circle
                    className="h-5 w-5 text-ink-300 flex-shrink-0"
                    aria-label="Not checked in"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink-900 truncate">
                    {r.full_name}
                  </p>
                  {isIn && (
                    <p className="text-xs text-ink-500 tabular">
                      checked in {IST_FMT.format(new Date(r.checked_in_at!))} IST
                    </p>
                  )}
                </div>
                {!isIn && (
                  <button
                    type="button"
                    onClick={() => checkIn(r.id)}
                    disabled={busyId === r.id}
                    className="btn-primary btn-sm"
                  >
                    {busyId === r.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Mark in"
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
