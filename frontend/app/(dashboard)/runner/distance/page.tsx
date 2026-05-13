"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatDistance, formatDate } from "@/lib/utils";
import { FileUploadDropzone } from "@/components/shared/FileUploadDropzone";
import type { RunnerProfilePublic } from "@/types";

interface DistanceLog {
  id: string;
  distance_km: string;
  activity_date: string;
  proof_source: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

export default function LogDistancePage(): React.ReactNode {
  const [events, setEvents] = useState<RunnerProfilePublic[]>([]);
  const [eventRunnerId, setEventRunnerId] = useState<string>("");
  const [distance, setDistance] = useState("5");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [proofSource, setProofSource] = useState("strava");
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<DistanceLog[]>([]);

  useEffect(() => {
    void api.get<RunnerProfilePublic[]>("/me/runner-events").then((items) => {
      setEvents(items);
      if (items.length > 0) setEventRunnerId(items[0].id);
    });
  }, []);

  useEffect(() => {
    if (!eventRunnerId) return;
    void api
      .get<DistanceLog[]>(`/distance-logs/by-runner/${eventRunnerId}`)
      .then(setHistory);
  }, [eventRunnerId]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!eventRunnerId) {
      toast.error("You need to join an event first.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/distance-logs", {
        event_runner_id: eventRunnerId,
        distance_km: Number(distance),
        activity_date: date,
        proof_source: proofSource,
        proof_url: proofUrl || undefined,
        notes: notes || undefined,
      });
      toast.success("Distance submitted for review");
      setDistance("5");
      setNotes("");
      setProofUrl("");
      const refreshed = await api.get<DistanceLog[]>(
        `/distance-logs/by-runner/${eventRunnerId}`,
      );
      setHistory(refreshed);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Submit failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <span className="eyebrow">Running</span>
      <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
        Log distance
      </h1>
      <p className="mt-2 text-ink-500">
        Submit your run with proof. Your event manager reviews and approves.
      </p>

      <form onSubmit={onSubmit} className="mt-8 card p-6 space-y-4">
        <Field label="Event">
          <select
            value={eventRunnerId}
            onChange={(e) => setEventRunnerId(e.target.value)}
            className="input"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.event_title || e.public_slug}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Distance (km)" required>
            <input
              type="number"
              step="0.1"
              required
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Date" required>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <Field label="Proof source">
          <select
            value={proofSource}
            onChange={(e) => setProofSource(e.target.value)}
            className="input"
          >
            <option value="strava">Strava</option>
            <option value="apple_health">Apple Health</option>
            <option value="garmin">Garmin</option>
            <option value="nike_run">Nike Run</option>
            <option value="manual">Manual</option>
          </select>
        </Field>
        <Field label="Proof image (screenshot from your fitness app)">
          <FileUploadDropzone
            endpoint="proof"
            value={proofUrl}
            onUploaded={(url) => setProofUrl(url)}
            label="Drop your Strava/Apple Health screenshot here"
          />
          <details className="mt-2 text-xs text-ink-500">
            <summary className="cursor-pointer hover:text-ink-700">
              Or paste a Strava activity URL
            </summary>
            <input
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="input mt-2 text-sm"
              placeholder="https://strava.com/activities/..."
            />
          </details>
        </Field>
        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input"
          />
        </Field>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for review"}
        </button>
      </form>

      <h2 className="font-display text-xl text-ink-900 mt-12 mb-4">
        Your history
      </h2>
      <div className="space-y-2">
        {history.length === 0 ? (
          <p className="text-ink-500 text-sm">No entries yet.</p>
        ) : (
          history.map((log) => (
            <div
              key={log.id}
              className="card p-4 flex items-center justify-between text-sm"
            >
              <div>
                <p className="font-semibold text-ink-900">
                  {formatDistance(log.distance_km)} on{" "}
                  {formatDate(log.activity_date)}
                </p>
                <p className="text-xs text-ink-500 capitalize mt-0.5">
                  via {log.proof_source.replace("_", " ")}
                  {log.rejection_reason && ` · Rejected: ${log.rejection_reason}`}
                </p>
              </div>
              <span
                className={`chip capitalize ${
                  log.status === "approved"
                    ? "bg-secondary-100 text-secondary-700"
                    : log.status === "rejected"
                      ? "bg-danger-100 text-danger-700"
                      : "bg-primary-100 text-primary-700"
                }`}
              >
                {log.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <label className="block">
      <span className="label">
        {label} {required && <span className="text-accent-500">*</span>}
      </span>
      {children}
    </label>
  );
}
