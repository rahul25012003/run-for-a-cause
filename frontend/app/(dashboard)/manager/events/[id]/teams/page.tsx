"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, Users2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  total_raised: string;
  total_distance_km: string;
  member_count: number;
}

interface FormState {
  name: string;
  description: string;
  logo_url: string;
}

const EMPTY: FormState = { name: "", description: "", logo_url: "" };

export default function ManagerTeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: eventId } = use(params);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setTeams(await api.get<Team[]>(`/events/${eventId}/teams`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, [eventId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        logo_url: form.logo_url.trim() || null,
      };
      if (editing === "new") {
        await api.post(`/events/${eventId}/teams`, payload);
        toast.success("Team created");
      } else if (editing) {
        await api.put(`/teams/${editing}`, payload);
        toast.success("Team updated");
      }
      setEditing(null);
      setForm(EMPTY);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this team? Members keep their progress; they're just unassigned.")) return;
    try {
      await api.delete(`/teams/${id}`);
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
          <Users2 className="h-6 w-6 text-primary-500 mt-1" aria-hidden />
          <div>
            <h1 className="font-display text-3xl text-ink-900">Teams</h1>
            <p className="text-ink-600">
              Group runners into teams. Their fundraising and distance roll up
              into team totals on the public leaderboard.
            </p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing("new");
              setForm(EMPTY);
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add team
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={submit} className="card space-y-3">
          <label className="block">
            <span className="label">Team name</span>
            <input
              required
              className="input mt-1 w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Description</span>
            <textarea
              rows={2}
              className="input mt-1 w-full"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="label">Logo URL</span>
            <input
              type="url"
              className="input mt-1 w-full"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing === "new" ? "Create" : "Save"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : teams.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="teams"
            title="No teams yet"
            description="Create one — runners will be able to pick it from their event page."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {teams.map((t, i) => (
            <li key={t.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="eyebrow text-primary-500 tabular">
                      #{i + 1}
                    </span>
                    <p className="font-semibold text-ink-900">{t.name}</p>
                    <span className="chip">{t.member_count} members</span>
                  </div>
                  {t.description && (
                    <p className="text-sm text-ink-600 mt-1">{t.description}</p>
                  )}
                  <p className="mt-2 tabular text-sm text-ink-700">
                    {formatCurrency(t.total_raised)} raised ·{" "}
                    {parseFloat(t.total_distance_km).toFixed(1)} km
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(t.id);
                      setForm({
                        name: t.name,
                        description: t.description ?? "",
                        logo_url: t.logo_url ?? "",
                      });
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="btn-ghost btn-sm text-danger-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
