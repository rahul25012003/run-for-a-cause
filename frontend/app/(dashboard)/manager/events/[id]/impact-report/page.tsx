"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { FileUploadDropzone } from "@/components/shared/FileUploadDropzone";
import { Badge } from "@/components/shared/Badge";
import type { EventDetail } from "@/types";

export default function ImpactReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: eventId } = use(params);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportUrl, setReportUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [drafting, setDrafting] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const detail = await api.get<EventDetail>(`/events/by-id/${eventId}`);
      setEvent(detail);
      setReportUrl(detail.impact_report_url ?? "");
      setSummary(detail.utilisation_summary ?? "");
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
  }, [eventId]);

  const draftWithAi = async (): Promise<void> => {
    if (
      summary.trim() &&
      !confirm(
        "This will replace the current summary with an AI-generated draft. Continue?",
      )
    ) {
      return;
    }
    setDrafting(true);
    try {
      const r = await api.post<{ markdown: string; source: "ai" | "rules" }>(
        `/events/${eventId}/draft-impact`,
        {},
      );
      // Backend may return up to 2 KB of markdown; the textarea cap is 2000 chars
      setSummary(r.markdown.slice(0, 2000));
      toast.success(
        r.source === "ai"
          ? "Drafted with AI — review and edit before publishing"
          : "Draft generated from event metrics — review and edit before publishing",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Draft failed",
      );
    } finally {
      setDrafting(false);
    }
  };

  const publish = async (): Promise<void> => {
    setSaving(true);
    try {
      await api.post(`/events/${eventId}/impact-report`, {
        impact_report_url: reportUrl || null,
        utilisation_summary: summary || null,
      });
      toast.success("Impact report published — visible on the audit page");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Publish failed",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!event) return null;

  const published = !!event.impact_report_published_at;

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      <Link
        href={`/manager/events/${eventId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to event
      </Link>

      <header>
        <span className="eyebrow">Impact report</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          {event.title}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          {published ? (
            <Badge variant="success">
              <CheckCircle2 className="w-3 h-3" /> Published
            </Badge>
          ) : (
            <Badge variant="warning">Draft — not yet public</Badge>
          )}
          <Link
            href={`/audit/${event.id}`}
            target="_blank"
            className="text-xs text-primary-600 inline-flex items-center gap-1 hover:underline"
          >
            View public audit page <Eye className="w-3 h-3" />
          </Link>
        </div>
      </header>

      <div className="card p-6 md:p-8 space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="label">Utilisation summary</span>
            <button
              type="button"
              onClick={draftWithAi}
              disabled={drafting}
              className="btn-secondary btn-sm inline-flex items-center gap-1.5"
              title="Generate a starting draft from this event's metrics"
            >
              {drafting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Draft with AI
            </button>
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            className="input"
            placeholder="Describe how the funds were used. e.g. ₹4.3 lakh utilised on schooling for 32 girls. Books, fees, uniforms covered."
            maxLength={2000}
          />
          <p className="mt-1.5 text-xs text-ink-400">
            Plain text. Shown on the public audit page. {summary.length}/2000
          </p>
        </div>

        <div>
          <span className="label">Detailed report (PDF or external link)</span>
          <FileUploadDropzone
            endpoint="image"
            value={reportUrl}
            onUploaded={(url) => setReportUrl(url)}
            label="Drop PDF / report here, or paste a URL below"
          />
          <details className="mt-2 text-xs text-ink-500">
            <summary className="cursor-pointer hover:text-ink-700">
              Or paste an external URL
            </summary>
            <input
              type="url"
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
              className="input mt-2 text-sm"
              placeholder="https://..."
            />
          </details>
        </div>

        <div className="pt-2">
          <button
            onClick={publish}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />{" "}
                {published ? "Update impact report" : "Publish impact report"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
