"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Image as ImageIcon,
  Type,
  FileText,
  Link2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FileUploadDropzone } from "@/components/shared/FileUploadDropzone";
import { VideoUploadDropzone } from "@/components/shared/VideoUploadDropzone";
import { revalidateContentCache } from "@/app/actions/revalidate";

interface Setting {
  id: string;
  key: string;
  value: string;
  value_type: "text" | "longtext" | "url" | "image" | "json";
  label: string;
  group: string;
  description: string | null;
  is_public: boolean;
  sort_order: number;
  updated_at: string;
}

const GROUP_LABELS: Record<string, string> = {
  hero: "Hero section",
  howitworks: "How it works",
  cta: "Call-to-action banner",
  testimonial: "Testimonial",
  truststrip: "Trust strip",
  events: "Events page",
  causes: "Causes page",
  map: "Map page",
  transparency: "Transparency page",
  about: "About page",
  footer: "Footer",
  legal: "Privacy & Terms (legal)",
  brand: "Brand & logos",
  social: "Social URLs",
  achievements: "Achievement rules",
  general: "General",
};

const TYPE_ICONS = {
  text: Type,
  longtext: FileText,
  url: Link2,
  image: ImageIcon,
  json: FileText,
};

export default function AdminContentPage(): React.ReactNode {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ kind: string; message: string } | null>(
    null,
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = useState<string>("hero");

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const items = await api.get<Setting[]>("/site-settings/admin");
      setSettings(items);
      const initial: Record<string, string> = {};
      items.forEach((s) => {
        initial[s.key] = s.value;
      });
      setEdits(initial);
      if (items.length === 0) {
        setError({
          kind: "empty",
          message:
            "Connected to the backend, but the site_settings table is empty. Run the seeder.",
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setError({
            kind: "auth",
            message: "Not authenticated as super_admin. Sign in again.",
          });
        } else if (err.status === 500) {
          setError({
            kind: "schema",
            message:
              "Backend error 500 — most likely the site_settings table doesn't exist yet. Run alembic.",
          });
        } else {
          setError({ kind: "api", message: err.message });
        }
      } else {
        setError({
          kind: "network",
          message:
            "Could not reach the backend. Is uvicorn running on port 8000?",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const groups = Array.from(new Set(settings.map((s) => s.group)));

  const handleSave = async (key: string): Promise<void> => {
    setSavingKey(key);
    try {
      const updated = await api.put<Setting>(`/site-settings/admin/${key}`, {
        value: edits[key] ?? "",
      });
      setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
      // Tell Next.js to drop its ISR cache so the public site shows the new
      // value on the very next request — no 30s wait.
      await revalidateContentCache();
      toast.success(`Saved: ${updated.label} · live now`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Save failed",
      );
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading site content…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-10 max-w-2xl">
        <header className="mb-8">
          <span className="eyebrow">Site content</span>
          <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
            Setup needed
          </h1>
        </header>
        <div className="card p-6 border-2 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink-900">{error.message}</p>
              <p className="mt-2 text-sm text-ink-600">
                Run these commands in <strong>cmd</strong> from the project root,
                then click Retry:
              </p>
              <pre className="mt-3 p-3 bg-ink-900 text-white text-xs rounded-md overflow-x-auto font-mono">
{`cd backend
.venv\\Scripts\\python.exe -m alembic upgrade head
.venv\\Scripts\\python.exe -m app.seed_settings
cd ..`}
              </pre>
              {error.kind === "auth" && (
                <p className="mt-3 text-sm text-ink-700">
                  → Or sign in again with{" "}
                  <code className="font-mono bg-white px-1.5 py-0.5 rounded text-xs">
                    admin@runforacause.in
                  </code>{" "}
                  /{" "}
                  <code className="font-mono bg-white px-1.5 py-0.5 rounded text-xs">
                    Admin@1234
                  </code>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={load}
            className="btn-primary btn-sm mt-5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const groupSettings = settings.filter((s) => s.group === activeGroup);

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header>
        <span className="eyebrow">Site content</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Edit every heading and image, live.
        </h1>
        <p className="mt-2 text-ink-500 max-w-2xl">
          {settings.length} editable fields across {groups.length} sections.
          Changes go live within ~30 seconds.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap border-b border-ink-100 pb-3">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition",
              activeGroup === g
                ? "bg-primary-50 text-primary-700 border border-primary-200"
                : "text-ink-600 hover:bg-ink-50",
            )}
          >
            {GROUP_LABELS[g] ?? g}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {groupSettings.map((s) => {
          const Icon = TYPE_ICONS[s.value_type] ?? Type;
          const isDirty = (edits[s.key] ?? "") !== s.value;
          return (
            <div key={s.id} className="card p-5 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-ink-400" />
                    <h3 className="font-semibold text-ink-900">{s.label}</h3>
                  </div>
                  <p className="text-xs font-mono text-ink-400 mt-0.5">
                    {s.key}
                  </p>
                  {s.description && (
                    <p className="text-xs text-ink-500 mt-1">{s.description}</p>
                  )}
                </div>
                {isDirty && (
                  <button
                    onClick={() => handleSave(s.key)}
                    disabled={savingKey === s.key}
                    className="btn-primary btn-sm"
                  >
                    {savingKey === s.key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" /> Save
                      </>
                    )}
                  </button>
                )}
              </div>

              {s.value_type === "image" ? (
                <div className="space-y-3">
                  <FileUploadDropzone
                    endpoint="image"
                    value={edits[s.key]}
                    onUploaded={(url) =>
                      setEdits({ ...edits, [s.key]: url })
                    }
                  />
                  <details className="text-xs text-ink-500">
                    <summary className="cursor-pointer hover:text-ink-700">
                      Or paste a URL manually
                    </summary>
                    <input
                      type="url"
                      value={edits[s.key] ?? ""}
                      onChange={(e) =>
                        setEdits({ ...edits, [s.key]: e.target.value })
                      }
                      className="input mt-2"
                      placeholder="https://..."
                    />
                  </details>
                </div>
              ) : s.key.endsWith("video_url") ? (
                // URL-typed but specifically a video: give a video dropzone +
                // manual URL paste, plus a live preview if a value exists.
                <div className="space-y-3">
                  <VideoUploadDropzone
                    value={edits[s.key]}
                    onUploaded={(url) =>
                      setEdits({ ...edits, [s.key]: url })
                    }
                  />
                  <details className="text-xs text-ink-500">
                    <summary className="cursor-pointer hover:text-ink-700">
                      Or paste a URL (S3, CDN, YouTube/Vimeo direct mp4)
                    </summary>
                    <input
                      type="url"
                      value={edits[s.key] ?? ""}
                      onChange={(e) =>
                        setEdits({ ...edits, [s.key]: e.target.value })
                      }
                      className="input mt-2"
                      placeholder="https://… .mp4 or .webm"
                    />
                  </details>
                  {edits[s.key] && (
                    <video
                      src={edits[s.key]}
                      muted
                      playsInline
                      autoPlay
                      loop
                      className="rounded-lg w-full max-w-md aspect-video object-cover bg-canvas-subtle"
                    />
                  )}
                </div>
              ) : s.value_type === "json" ? (
                <JsonEditor
                  value={edits[s.key] ?? ""}
                  onChange={(v) => setEdits({ ...edits, [s.key]: v })}
                />
              ) : s.value_type === "longtext" ? (
                <textarea
                  value={edits[s.key] ?? ""}
                  onChange={(e) =>
                    setEdits({ ...edits, [s.key]: e.target.value })
                  }
                  rows={4}
                  className="input"
                  placeholder={s.label}
                />
              ) : (
                <input
                  type={s.value_type === "url" ? "url" : "text"}
                  value={edits[s.key] ?? ""}
                  onChange={(e) =>
                    setEdits({ ...edits, [s.key]: e.target.value })
                  }
                  className="input"
                  placeholder={s.label}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Inline JSON editor with validation + pretty-print. Saves the raw string —
 * the consuming components parse it via parseJsonSetting.
 */
function JsonEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.ReactNode {
  const [err, setErr] = useState<string | null>(null);
  const validate = (raw: string): boolean => {
    if (!raw.trim()) {
      setErr(null);
      return true;
    }
    try {
      JSON.parse(raw);
      setErr(null);
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid JSON");
      return false;
    }
  };
  const prettyPrint = (): void => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
      setErr(null);
    } catch {
      setErr("Cannot pretty-print invalid JSON");
    }
  };
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          validate(e.target.value);
        }}
        onBlur={(e) => validate(e.target.value)}
        rows={12}
        className="input font-mono text-xs leading-relaxed"
        spellCheck={false}
        placeholder='[{"icon":"Calendar","title":"…","body":"…"}]'
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prettyPrint}
          className="text-xs text-ink-500 hover:text-primary-600 underline-offset-2 hover:underline"
        >
          Pretty-print
        </button>
        {err ? (
          <p className="text-xs text-red-600 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {err}
          </p>
        ) : value.trim() ? (
          <p className="text-xs text-secondary-700">✓ Valid JSON</p>
        ) : (
          <p className="text-xs text-ink-400">Empty (uses code defaults)</p>
        )}
      </div>
    </div>
  );
}
