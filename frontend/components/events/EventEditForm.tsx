"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { FileUploadDropzone } from "@/components/shared/FileUploadDropzone";
import { Badge } from "@/components/shared/Badge";
import type { EventDetail } from "@/types";

interface EventEditFormProps {
  eventId: string;
  /** Where to redirect after save (default: back to the events list). */
  backHref: string;
  /** True if the actor is super_admin — unlocks fields manager can't change. */
  isSuperAdmin?: boolean;
}

export function EventEditForm({
  eventId,
  backHref,
  isSuperAdmin = false,
}: EventEditFormProps): React.ReactNode {
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [causeSummary, setCauseSummary] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [fundraisingGoal, setFundraisingGoal] = useState("");
  const [distanceGoal, setDistanceGoal] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxRunners, setMaxRunners] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const detail = await api.get<EventDetail>(`/events/by-id/${eventId}`);
        setEvent(detail);
        setTitle(detail.title);
        setDescription(detail.description);
        setCauseSummary(detail.cause_summary);
        setCoverImageUrl(detail.cover_image_url ?? "");
        setFundraisingGoal(detail.fundraising_goal);
        setDistanceGoal(detail.distance_goal_km ?? "");
        setEndDate(detail.end_date);
        setMaxRunners("");
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          toast.error("Event not found");
          router.push(backHref);
          return;
        }
        toast.error(
          err instanceof ApiError ? err.detail ?? err.message : "Load failed",
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const save = async (): Promise<void> => {
    if (!event) return;
    setSaving(true);
    try {
      await api.put(`/events/${event.id}`, {
        title,
        description,
        cause_summary: causeSummary,
        cover_image_url: coverImageUrl || undefined,
        fundraising_goal: Number(fundraisingGoal),
        distance_goal_km: distanceGoal ? Number(distanceGoal) : undefined,
        end_date: endDate,
        max_runners: maxRunners ? Number(maxRunners) : undefined,
      });
      toast.success("Saved");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Save failed",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async (): Promise<void> => {
    if (!event) return;
    setSubmitting(true);
    try {
      await save();
      await api.post(`/events/${event.id}/submit`);
      toast.success("Submitted for approval");
      router.push(backHref);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Submit failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading event…
      </div>
    );
  }

  if (!event) return null;

  const editableNow = event.status === "draft" || isSuperAdmin;

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      <header>
        <span className="eyebrow">Edit event</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          {event.title}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <Badge>{event.status.replace("_", " ")}</Badge>
          {!editableNow && (
            <span className="text-xs text-ink-500">
              Read-only outside draft (only super-admin can override).
            </span>
          )}
        </div>
      </header>

      <div className="card p-6 md:p-8 space-y-5">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            disabled={!editableNow}
          />
        </Field>
        <Field label="Cause summary">
          <input
            value={causeSummary}
            onChange={(e) => setCauseSummary(e.target.value)}
            className="input"
            maxLength={500}
            disabled={!editableNow}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            rows={6}
            disabled={!editableNow}
          />
        </Field>
        <Field label="Cover image">
          <FileUploadDropzone
            endpoint="image"
            value={coverImageUrl}
            onUploaded={(url) => setCoverImageUrl(url)}
          />
          <details className="mt-2 text-xs text-ink-500">
            <summary className="cursor-pointer">Or paste URL</summary>
            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="input mt-2 text-sm"
              placeholder="https://..."
            />
          </details>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Fundraising goal (₹)">
            <input
              type="number"
              value={fundraisingGoal}
              onChange={(e) => setFundraisingGoal(e.target.value)}
              className="input"
              disabled={!editableNow}
            />
          </Field>
          <Field label="Distance goal (km)">
            <input
              type="number"
              step="0.1"
              value={distanceGoal}
              onChange={(e) => setDistanceGoal(e.target.value)}
              className="input"
              disabled={!editableNow}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
              disabled={!editableNow}
            />
          </Field>
          <Field label="Max runners (optional)">
            <input
              type="number"
              value={maxRunners}
              onChange={(e) => setMaxRunners(e.target.value)}
              className="input"
              disabled={!editableNow}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving || !editableNow}
            className="btn-secondary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" /> Save changes
              </>
            )}
          </button>
          {event.status === "draft" && (
            <button
              onClick={submitForApproval}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit for approval
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
