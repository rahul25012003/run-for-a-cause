"use client";

import { useEffect, useState } from "react";
import {
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/shared/Badge";

interface AwarenessBlock {
  title: string;
  body: string;
  source_url: string | null;
}

interface Cause {
  id: string;
  organisation_id: string;
  title: string;
  slug: string;
  summary: string;
  story: string | null;
  cover_image_url: string | null;
  awareness_blocks: AwarenessBlock[];
  total_events_hosted: number;
  total_raised_lifetime: string;
}

const EMPTY_BLOCK: AwarenessBlock = { title: "", body: "", source_url: "" };

export default function ManagerCausesPage(): React.ReactNode {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Cause | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await api.get<Cause[]>("/causes/");
      setCauses(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load causes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const updateBlock = (idx: number, patch: Partial<AwarenessBlock>) => {
    if (!editing) return;
    const next = [...editing.awareness_blocks];
    next[idx] = { ...next[idx], ...patch };
    setEditing({ ...editing, awareness_blocks: next });
  };

  const addBlock = () => {
    if (!editing) return;
    if (editing.awareness_blocks.length >= 8) {
      toast.error("Max 8 awareness facts per cause.");
      return;
    }
    setEditing({
      ...editing,
      awareness_blocks: [...editing.awareness_blocks, { ...EMPTY_BLOCK }],
    });
  };

  const removeBlock = (idx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      awareness_blocks: editing.awareness_blocks.filter((_, i) => i !== idx),
    });
  };

  const save = async () => {
    if (!editing) return;
    const clean = editing.awareness_blocks
      .filter((b) => b.title.trim() && b.body.trim())
      .map((b) => ({
        title: b.title.trim(),
        body: b.body.trim(),
        source_url: b.source_url?.trim() || null,
      }));
    setSaving(true);
    try {
      await api.put(`/causes/${editing.id}`, {
        title: editing.title,
        summary: editing.summary,
        story: editing.story,
        cover_image_url: editing.cover_image_url,
        awareness_blocks: clean,
      });
      toast.success("Cause saved.");
      setEditing(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const createCause = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/causes/", { title: newTitle, summary: newSummary });
      toast.success("Cause created — add awareness facts to it now.");
      setNewTitle("");
      setNewSummary("");
      setShowCreate(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Causes</span>
          <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
            Your causes
          </h1>
          <p className="mt-2 text-ink-500 max-w-xl">
            Long-running missions under your organisation. Events are created
            under a cause, and the awareness facts you add here appear on every
            runner profile for that cause.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="btn-primary flex-shrink-0 inline-flex items-center gap-2"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Cancel" : "New cause"}
        </button>
      </div>

      {/* ── Create form (collapsible) ── */}
      {showCreate && (
        <form
          onSubmit={createCause}
          className="card p-6 space-y-4 border-primary-200 bg-primary-50/40"
        >
          <p className="font-semibold text-ink-900">Create a new cause</p>
          <label className="block">
            <span className="label">Title</span>
            <input
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Education for rural girls"
              className="input mt-1"
              minLength={3}
              maxLength={255}
            />
          </label>
          <label className="block">
            <span className="label">Summary</span>
            <input
              required
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="One sentence describing the cause"
              className="input mt-1"
              minLength={10}
              maxLength={500}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="btn-primary inline-flex items-center gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create cause
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Causes list ── */}
      {causes.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="search"
            title="No causes yet"
            description="Create your first cause to start linking events to it."
            action={
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New cause
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {causes.map((c) => (
            <div key={c.id} className="card p-5 md:p-6">
              {/* Cause header row */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg text-ink-900 leading-snug">
                    {c.title}
                  </h3>
                  <p className="text-sm text-ink-600 mt-1 leading-relaxed line-clamp-2">
                    {c.summary}
                  </p>
                  {/* Stats chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={c.total_events_hosted > 0 ? "success" : "default"}>
                      {c.total_events_hosted} event{c.total_events_hosted !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant={c.awareness_blocks.length > 0 ? "primary" : "default"}>
                      <Lightbulb className="w-3 h-3" />
                      {c.awareness_blocks.length} awareness fact
                      {c.awareness_blocks.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={`/causes/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View public cause page"
                    className="btn-ghost btn-sm inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </a>
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit modal ── */}
      {editing && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-ink-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="font-display text-xl text-ink-900 truncate pr-4">
                {editing.title}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-400 hover:text-ink-900 hover:bg-canvas-subtle transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Core fields */}
              <label className="block">
                <span className="label">Title</span>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="input mt-1"
                  required
                  minLength={3}
                  maxLength={255}
                />
              </label>
              <label className="block">
                <span className="label">Summary</span>
                <input
                  value={editing.summary}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                  className="input mt-1"
                  required
                  minLength={10}
                  maxLength={500}
                />
              </label>
              <label className="block">
                <span className="label">Story (optional long narrative)</span>
                <textarea
                  rows={4}
                  value={editing.story ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, story: e.target.value || null })
                  }
                  className="input mt-1"
                  placeholder="Tell the full story behind this cause…"
                />
              </label>

              {/* Awareness blocks */}
              <div className="pt-4 border-t border-ink-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-ink-900 inline-flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary-500" />
                    Awareness facts
                  </p>
                  <button
                    type="button"
                    onClick={addBlock}
                    disabled={editing.awareness_blocks.length >= 8}
                    className="btn-secondary btn-sm inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add fact
                  </button>
                </div>
                <p className="text-xs text-ink-400 mb-4">
                  These appear on every runner profile under this cause.
                  Up to 8. Keep them short and sourced.
                </p>

                {editing.awareness_blocks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center">
                    <Lightbulb className="w-6 h-6 text-ink-300 mx-auto mb-2" />
                    <p className="text-sm text-ink-400">
                      No facts yet — click &ldquo;Add fact&rdquo; to start.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editing.awareness_blocks.map((block, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-ink-100 p-4 bg-canvas-subtle"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="eyebrow text-ink-400">
                            Fact {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeBlock(idx)}
                            aria-label="Remove fact"
                            className="text-danger-500 hover:text-danger-700 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          value={block.title}
                          onChange={(e) => updateBlock(idx, { title: e.target.value })}
                          placeholder="Headline (e.g. 1 in 4 girls drop out before grade 8)"
                          className="input mb-2"
                          maxLength={120}
                        />
                        <textarea
                          rows={2}
                          value={block.body}
                          onChange={(e) => updateBlock(idx, { body: e.target.value })}
                          placeholder="Explain the fact in 1–2 sentences."
                          className="input mb-2"
                          maxLength={600}
                        />
                        <input
                          type="url"
                          value={block.source_url ?? ""}
                          onChange={(e) =>
                            updateBlock(idx, { source_url: e.target.value || null })
                          }
                          placeholder="Source URL (optional)"
                          className="input"
                          maxLength={500}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white border-t border-ink-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-ghost"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
