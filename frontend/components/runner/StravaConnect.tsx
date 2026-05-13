"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2, Unlink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

interface MeStrava {
  strava_athlete_id: number | null;
}

/**
 * "Connect Strava" card on the runner profile page (C1).
 *
 * - Reads `/auth/me/strava-status` to know whether the runner is linked.
 * - Connect button hits `/strava/authorize` to get the OAuth URL, then
 *   does a top-level redirect (Strava won't iframe).
 * - Sync button pulls the last 14 days of Run / TrailRun / VirtualRun
 *   activities, creating SUBMITTED distance logs against every active
 *   event the runner is in.
 *
 * Renders nothing if the backend returns 503 (Strava not configured) —
 * keeps the UI clean on dev installs without keys.
 */
export function StravaConnect(): React.ReactNode {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [available, setAvailable] = useState<boolean>(true);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(
    null,
  );

  const load = async () => {
    try {
      const r = await api.get<MeStrava>("/strava/me-status");
      setLinked(!!r.strava_athlete_id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setAvailable(false);
      } else {
        setLinked(false);
      }
    }
  };

  useEffect(() => {
    load();
    // Surface success after OAuth round-trip
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("strava") === "connected") {
        toast.success("Strava connected");
      }
    }
  }, []);

  const connect = async () => {
    setBusy("connect");
    try {
      const r = await api.get<{ url: string }>("/strava/authorize");
      window.location.href = r.url;
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Couldn't start",
      );
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const r = await api.post<{ imported: number; scanned: number }>(
        "/strava/sync",
        {},
      );
      if (r.imported === 0) {
        toast.info(`Scanned ${r.scanned} activities — nothing new to import.`);
      } else {
        toast.success(
          `Imported ${r.imported} activit${
            r.imported === 1 ? "y" : "ies"
          } as draft logs. Manager will review.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Sync failed",
      );
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Strava? Your past distance logs are kept.")) return;
    setBusy("disconnect");
    try {
      await api.post("/strava/disconnect", {});
      toast.success("Disconnected");
      setLinked(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    } finally {
      setBusy(null);
    }
  };

  if (!available || linked === null) return null;

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      <div
        className="flex-shrink-0 h-12 w-12 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center"
        aria-hidden
      >
        <Activity className="h-6 w-6 text-[#FC4C02]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink-900">Strava</p>
        <p className="text-sm text-ink-600">
          {linked
            ? "Auto-import the last 14 days of runs as draft distance logs. Manager still approves each."
            : "Connect once to skip manual screenshots — your runs flow into the queue automatically."}
        </p>
      </div>
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        {linked ? (
          <>
            <button
              type="button"
              onClick={sync}
              disabled={!!busy}
              className="btn-primary inline-flex items-center gap-2"
            >
              {busy === "sync" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={!!busy}
              className="btn-ghost btn-sm inline-flex items-center gap-1"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={!!busy}
            className="btn-primary inline-flex items-center gap-2"
          >
            {busy === "connect" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Connect Strava
          </button>
        )}
      </div>
    </div>
  );
}
