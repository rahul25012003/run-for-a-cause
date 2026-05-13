"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { FileUploadDropzone } from "@/components/shared/FileUploadDropzone";
import { GalleryUploader } from "@/components/shared/GalleryUploader";
import { Badge } from "@/components/shared/Badge";
import { StravaConnect } from "@/components/runner/StravaConnect";
import { RunnerEventControls } from "@/components/runner/RunnerEventControls";
import { StreakChip } from "@/components/runner/StreakChip";
import type { RunnerProfilePublic } from "@/types";

export default function RunnerProfileSettingsPage(): React.ReactNode {
  const [items, setItems] = useState<RunnerProfilePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Per-row local edits keyed by event_runner.id
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        personal_story: string;
        personal_goal_km: string;
        personal_goal_amount: string;
        team_name: string;
        profile_photo_url: string;
        cover_photo_url: string;
        gallery_urls: string[];
      }
    >
  >({});

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await api.get<RunnerProfilePublic[]>("/me/runner-events");
      setItems(list);
      const initial: typeof edits = {};
      list.forEach((er) => {
        initial[er.id] = {
          personal_story: er.personal_story ?? "",
          personal_goal_km: er.personal_goal_km ?? "",
          personal_goal_amount: er.personal_goal_amount ?? "",
          team_name: er.team_name ?? "",
          profile_photo_url: er.profile_photo_url ?? "",
          cover_photo_url: er.cover_photo_url ?? "",
          gallery_urls: er.gallery_urls ?? [],
        };
      });
      setEdits(initial);
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
  }, []);

  const save = async (id: string): Promise<void> => {
    const edit = edits[id];
    if (!edit) return;
    setSavingId(id);
    try {
      await api.put(`/runners/${id}`, {
        personal_story: edit.personal_story || undefined,
        personal_goal_km: edit.personal_goal_km
          ? Number(edit.personal_goal_km)
          : undefined,
        personal_goal_amount: edit.personal_goal_amount
          ? Number(edit.personal_goal_amount)
          : undefined,
        team_name: edit.team_name || undefined,
        profile_photo_url: edit.profile_photo_url || undefined,
        cover_photo_url: edit.cover_photo_url || undefined,
        gallery_urls: edit.gallery_urls,
      });
      toast.success("Profile updated");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Save failed",
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading profiles…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      <header>
        <span className="eyebrow">My runner profiles</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Your fundraising pages
        </h1>
        <p className="mt-2 text-ink-500">
          One per event you&apos;ve joined. Story, photos and goals are public.
        </p>
      </header>

      <StravaConnect />

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-600">You haven&apos;t joined any events.</p>
          <Link href="/events" className="btn-primary mt-4 inline-flex">
            Browse events
          </Link>
        </div>
      ) : (
        items.map((er) => {
          const edit = edits[er.id];
          if (!edit) return null;
          return (
            <div key={er.id} className="card p-6 md:p-8 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/runners/${er.public_slug}`}
                    target="_blank"
                    className="text-primary-600 font-mono text-sm hover:underline inline-flex items-center gap-1"
                  >
                    /runners/{er.public_slug}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Badge className="ml-2">{er.status}</Badge>
                </div>
                <StreakChip
                  current={er.consecutive_days}
                  best={er.longest_streak}
                />
              </div>

              {/* Per-event team picker (D2) + check-in QR (D8) */}
              <RunnerEventControls
                eventRunnerId={er.id}
                eventId={er.event_id}
                currentTeamId={er.team_id}
              />

              <Field label="Profile photo">
                <FileUploadDropzone
                  endpoint="image"
                  value={edit.profile_photo_url}
                  onUploaded={(url) =>
                    setEdits({
                      ...edits,
                      [er.id]: { ...edit, profile_photo_url: url },
                    })
                  }
                />
              </Field>

              <Field label="Cover photo (top of profile page)">
                <FileUploadDropzone
                  endpoint="image"
                  value={edit.cover_photo_url}
                  onUploaded={(url) =>
                    setEdits({
                      ...edits,
                      [er.id]: { ...edit, cover_photo_url: url },
                    })
                  }
                />
              </Field>

              <Field label="Photo gallery (training shots, race-day moments — up to 6)">
                <GalleryUploader
                  value={edit.gallery_urls}
                  onChange={(urls) =>
                    setEdits({
                      ...edits,
                      [er.id]: { ...edit, gallery_urls: urls },
                    })
                  }
                  max={6}
                />
              </Field>

              <Field label="Your story">
                <textarea
                  value={edit.personal_story}
                  onChange={(e) =>
                    setEdits({
                      ...edits,
                      [er.id]: { ...edit, personal_story: e.target.value },
                    })
                  }
                  rows={5}
                  className="input"
                  placeholder="Why are you running for this cause?"
                  maxLength={5000}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Distance goal (km)">
                  <input
                    type="number"
                    step="0.1"
                    value={edit.personal_goal_km}
                    onChange={(e) =>
                      setEdits({
                        ...edits,
                        [er.id]: {
                          ...edit,
                          personal_goal_km: e.target.value,
                        },
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Fundraising goal (₹)">
                  <input
                    type="number"
                    value={edit.personal_goal_amount}
                    onChange={(e) =>
                      setEdits({
                        ...edits,
                        [er.id]: {
                          ...edit,
                          personal_goal_amount: e.target.value,
                        },
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Team name (optional)">
                  <input
                    value={edit.team_name}
                    onChange={(e) =>
                      setEdits({
                        ...edits,
                        [er.id]: { ...edit, team_name: e.target.value },
                      })
                    }
                    className="input"
                  />
                </Field>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => save(er.id)}
                  disabled={savingId === er.id}
                  className="btn-primary"
                >
                  {savingId === er.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save changes
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })
      )}
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
