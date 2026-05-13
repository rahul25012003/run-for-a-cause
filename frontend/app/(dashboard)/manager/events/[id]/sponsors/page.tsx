"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";

type MatchType = "multiply" | "fixed_add" | "percentage";

interface Sponsor {
  id: string;
  event_id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  multiplier: string;
  cap_amount: string;
  total_matched: string;
  is_active: boolean;
  match_type: MatchType;
  match_value: string;
  starts_at: string | null;
  ends_at: string | null;
}

interface FormState {
  name: string;
  logo_url: string;
  website: string;
  description: string;
  match_type: MatchType;
  match_value: string;
  cap_amount: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: "",
  logo_url: "",
  website: "",
  description: "",
  match_type: "multiply",
  match_value: "2.0",
  cap_amount: "100000",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

const MATCH_HELP: Record<MatchType, string> = {
  multiply:
    "Each ₹1 donated triggers (value − 1) extra rupees from the sponsor. e.g. 2.0 = 1× match.",
  fixed_add:
    "Sponsor adds this many rupees flat to every donation, regardless of size.",
  percentage:
    "Sponsor adds this percent of every donation. e.g. 25 = +25% on top.",
};

export default function ManagerSponsorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: eventId } = use(params);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await api.get<Sponsor[]>(
        `/events/${eventId}/sponsors?include_inactive=true`,
      );
      setSponsors(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [eventId]);

  const startEdit = (s: Sponsor) => {
    setEditing(s.id);
    setForm({
      name: s.name,
      logo_url: s.logo_url ?? "",
      website: s.website ?? "",
      description: s.description ?? "",
      match_type: s.match_type,
      match_value: s.match_value,
      cap_amount: s.cap_amount,
      starts_at: s.starts_at ? s.starts_at.slice(0, 16) : "",
      ends_at: s.ends_at ? s.ends_at.slice(0, 16) : "",
      is_active: s.is_active,
    });
  };

  const startCreate = () => {
    setEditing("new");
    setForm(EMPTY);
  };

  const cancel = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        logo_url: form.logo_url.trim() || null,
        website: form.website.trim() || null,
        description: form.description.trim() || null,
        match_type: form.match_type,
        match_value: form.match_value,
        multiplier: form.match_type === "multiply" ? form.match_value : "2.0",
        cap_amount: form.cap_amount,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
      };
      if (editing === "new") {
        await api.post(`/events/${eventId}/sponsors`, payload);
        toast.success("Sponsor added");
      } else if (editing) {
        await api.put(`/sponsors/${editing}`, payload);
        toast.success("Sponsor updated");
      }
      cancel();
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sponsor? Match-funding for this event will stop.")) return;
    try {
      await api.delete(`/sponsors/${id}`);
      toast.success("Removed");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/manager/events/${eventId}`}
        className="btn-link inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to event
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Building2 className="h-6 w-6 text-primary-500 mt-1" aria-hidden />
          <div>
            <h1 className="font-display text-3xl text-ink-900">
              Match-funding sponsors
            </h1>
            <p className="text-ink-600">
              Corporate partners who multiply, top-up or percentage-match every
              donation — up to a cap, optionally within a window.
            </p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startCreate}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add sponsor
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={submit} className="card space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Sponsor name</span>
              <input
                required
                className="input mt-1 w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Website</span>
              <input
                type="url"
                placeholder="https://"
                className="input mt-1 w-full"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label">Logo URL</span>
              <input
                type="url"
                className="input mt-1 w-full"
                value={form.logo_url}
                onChange={(e) =>
                  setForm({ ...form, logo_url: e.target.value })
                }
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label">Short description</span>
              <textarea
                rows={2}
                className="input mt-1 w-full"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="block">
              <span className="label">Match type</span>
              <select
                className="input mt-1 w-full"
                value={form.match_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    match_type: e.target.value as MatchType,
                  })
                }
              >
                <option value="multiply">Multiplier (×N)</option>
                <option value="fixed_add">Fixed top-up (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </label>
            <label className="block">
              <span className="label">
                {form.match_type === "multiply"
                  ? "Multiplier"
                  : form.match_type === "fixed_add"
                  ? "Rupees per donation"
                  : "Percent"}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="input mt-1 w-full tabular"
                value={form.match_value}
                onChange={(e) =>
                  setForm({ ...form, match_value: e.target.value })
                }
              />
            </label>
            <label className="block">
              <span className="label">Cap amount (₹)</span>
              <input
                type="number"
                min="0"
                required
                className="input mt-1 w-full tabular"
                value={form.cap_amount}
                onChange={(e) =>
                  setForm({ ...form, cap_amount: e.target.value })
                }
              />
            </label>
          </div>
          <p className="text-xs text-ink-500">{MATCH_HELP[form.match_type]}</p>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Starts at (optional)</span>
              <input
                type="datetime-local"
                className="input mt-1 w-full"
                value={form.starts_at}
                onChange={(e) =>
                  setForm({ ...form, starts_at: e.target.value })
                }
              />
            </label>
            <label className="block">
              <span className="label">Ends at (optional)</span>
              <input
                type="datetime-local"
                className="input mt-1 w-full"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            <span className="text-sm text-ink-700">Active</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing === "new" ? "Add sponsor" : "Save changes"}
            </button>
            <button type="button" onClick={cancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : sponsors.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="donations"
            title="No sponsors yet"
            description="Adding a corporate match-funder amplifies every donation. Start with one partner and one cap."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {sponsors.map((s) => {
            const cap = parseFloat(s.cap_amount);
            const matched = parseFloat(s.total_matched);
            const remaining = Math.max(0, cap - matched);
            const pct = cap > 0 ? Math.min(100, (matched / cap) * 100) : 0;
            return (
              <li key={s.id} className="card">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink-900">{s.name}</p>
                      <Badge variant={s.is_active ? "success" : "outline"}>
                        {s.is_active ? "active" : "inactive"}
                      </Badge>
                      <Badge variant="primary">
                        {s.match_type === "multiply"
                          ? `×${s.match_value}`
                          : s.match_type === "fixed_add"
                          ? `+${formatCurrency(s.match_value)}`
                          : `+${s.match_value}%`}
                      </Badge>
                      {(s.starts_at || s.ends_at) && (
                        <Badge variant="warning">time-boxed</Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-sm text-ink-600 mt-1">
                        {s.description}
                      </p>
                    )}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-ink-500 mb-1 tabular">
                        <span>{formatCurrency(matched)} matched</span>
                        <span>cap {formatCurrency(cap)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className="h-full bg-primary-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-ink-400 mt-1">
                        ₹{remaining.toLocaleString("en-IN")} remaining
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      className="btn-ghost btn-sm text-danger-600"
                      aria-label="Delete sponsor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
