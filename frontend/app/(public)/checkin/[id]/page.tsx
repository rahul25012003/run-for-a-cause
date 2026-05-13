"use client";

import { use, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ScanLine, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface CheckInResult {
  event_runner_id: string;
  runner_name: string;
  runner_slug: string;
  checked_in_at: string;
  was_already_checked_in: boolean;
}

/**
 * Manager-facing landing page for a scanned QR. The QR encodes
 * `${FRONTEND_URL}/checkin/{event_runner_id}` — when the manager's phone
 * resolves the URL after scan, this page loads. They tap "Mark present"
 * which POSTs to the auth-guarded check-in endpoint.
 *
 * If a non-manager (or a logged-out user) opens it, the API returns 401/403
 * and we show a friendly "you can't check yourself in" message.
 */
export default function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id } = use(params);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<CheckInResult>(
        `/event-runners/${id}/checkin`,
        {},
      );
      setResult(r);
      if (r.was_already_checked_in) {
        toast.info("Already checked in");
      } else {
        toast.success("Checked in!");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setError(
            "Only the event manager can check runners in. Sign in as the event manager and try again.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Couldn't reach the server.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[80vh] container-page py-12">
      <div className="max-w-md mx-auto card text-center">
        <ScanLine className="h-10 w-10 text-primary-500 mx-auto" aria-hidden />
        <h1 className="font-display text-2xl text-ink-900 mt-3">
          Event check-in
        </h1>
        <p className="text-ink-600 mt-1 text-sm tabular">runner · {id.slice(0, 8)}…</p>

        {!result && !error && (
          <button
            type="button"
            onClick={checkIn}
            disabled={busy}
            className="btn-primary mt-6 inline-flex items-center gap-2 w-full justify-center"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Mark present
          </button>
        )}

        {result && (
          <div className="mt-6 p-4 rounded-xl bg-success-50 border border-success-200 text-left">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success-600" aria-hidden />
              <p className="font-semibold text-ink-900">
                {result.was_already_checked_in ? "Already checked in" : "Checked in"}
              </p>
            </div>
            <p className="mt-1 text-sm text-ink-700">{result.runner_name}</p>
            <p className="text-xs text-ink-500 mt-1 tabular">
              {formatDateTime(result.checked_in_at)}
            </p>
            <Link
              href={`/runners/${result.runner_slug}`}
              className="btn-link text-sm mt-2 inline-block"
            >
              View runner →
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-danger-50 border border-danger-200 text-left">
            <div className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-danger-600" aria-hidden />
              <p className="font-semibold text-ink-900">Can&apos;t check in</p>
            </div>
            <p className="mt-1 text-sm text-ink-700">{error}</p>
            <Link href="/login" className="btn-link text-sm mt-2 inline-block">
              Sign in →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
