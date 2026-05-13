"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { UserPublic } from "@/types";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

interface FieldErrors {
  title?: string;
  description?: string;
  cause_summary?: string;
  goal?: string;
  start?: string;
  end?: string;
}

export default function NewEventPage(): React.ReactNode {
  const router = useRouter();

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [causeSummary, setCauseSummary] = useState("");
  const [category, setCategory] = useState("education");
  const [format, setFormat] = useState("virtual");
  const [participation, setParticipation] = useState("both");
  const [runType, setRunType] = useState("cumulative");
  const [goal, setGoal] = useState("100000");
  const [distance, setDistance] = useState("100");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [city, setCity] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Role-specific org state
  const [isAdmin, setIsAdmin] = useState(false);
  // Super-admin: dropdown of all verified orgs
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [orgsLoading, setOrgsLoading] = useState(false);
  // Event-manager: their own org (read-only display)
  const [myOrg, setMyOrg] = useState<OrgOption | null>(null);
  const [orgChecked, setOrgChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get<UserPublic>("/auth/me");
        const admin = me.role === "super_admin";
        setIsAdmin(admin);
        if (admin) {
          setOrgsLoading(true);
          const list = await api.get<OrgOption[]>(
            "/organisations/?verified_only=true",
          );
          setOrgs(list);
          if (list.length > 0) setOrgId(list[0].id);
          setOrgsLoading(false);
        } else {
          // Fetch manager's own org to show read-only in the form
          try {
            const org = await api.get<OrgOption>("/organisations/me");
            setMyOrg(org);
          } catch {
            /* org may not exist yet */
          } finally {
            setOrgChecked(true);
          }
        }
      } catch {
        /* /auth/me failure → middleware redirects */
      }
    })();
  }, []);

  // Front-end validation — mirrors backend constraints so we fail fast
  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (title.trim().length < 3) e.title = "Title must be at least 3 characters.";
    if (causeSummary.trim().length < 10)
      e.cause_summary = "Cause summary must be at least 10 characters.";
    if (description.trim().length < 20)
      e.description = "Description must be at least 20 characters.";
    if (!goal || Number(goal) <= 0) e.goal = "Set a fundraising goal above ₹0.";
    if (!start) e.start = "Pick a start date.";
    if (!end) e.end = "Pick an end date.";
    if (start && end && end < start) e.end = "End date must be after start date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isAdmin && orgs.length === 0) {
      toast.error("No verified organisations found. Verify an NGO first.");
      return;
    }
    if (isAdmin && !orgId) {
      toast.error("Select an organiser.");
      return;
    }
    if (!validate()) {
      toast.error("Fix the highlighted fields before saving.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/events/", {
        ...(isAdmin && orgId ? { organisation_id: orgId } : {}),
        title: title.trim(),
        description: description.trim(),
        cause_summary: causeSummary.trim(),
        cause_category: category,
        format,
        participation,
        run_type: runType,
        fundraising_goal: Number(goal),
        distance_goal_km: Number(distance) || undefined,
        start_date: start,
        end_date: end,
        city: city.trim() || undefined,
      });
      toast.success("Event created as draft. Submit for approval when ready.");
      router.push("/manager/events");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed to create event",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const noVerifiedOrgs = isAdmin && !orgsLoading && orgs.length === 0;
  const managerHasNoOrg = !isAdmin && orgChecked && !myOrg;

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <header className="mb-8">
        <span className="eyebrow">Events</span>
        <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
          Create a new event
        </h1>
        <p className="mt-2 text-ink-500">
          Define the cause, goals, and timeline. Save as draft — submit for
          approval when ready.
        </p>
      </header>

      {/* Manager: no organisation created yet */}
      {!isAdmin && orgChecked && !myOrg && (
        <div className="mb-6 card p-5 border border-primary-200 bg-primary-50 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-primary-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink-900">
              Set up your organisation first
            </p>
            <p className="text-sm text-ink-600 mt-1">
              Events must belong to an NGO profile. Create yours before
              creating an event.
            </p>
            <a
              href="/manager/organisation"
              className="btn-primary btn-sm inline-flex mt-3"
            >
              Set up organisation →
            </a>
          </div>
        </div>
      )}

      {/* Super-admin: no verified orgs warning */}
      {noVerifiedOrgs && (
        <div className="mb-6 card p-4 border-yellow-300 bg-yellow-50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink-900">No verified organisations</p>
            <p className="text-sm text-ink-600 mt-0.5">
              Events must belong to a KYC-verified NGO. Go to{" "}
              <a href="/admin/organisations" className="text-primary-600 underline underline-offset-4">
                Organisations
              </a>{" "}
              and approve an NGO first.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="card p-6 md:p-8 space-y-6">
        {/* Super-admin: choose any verified org */}
        {isAdmin && (
          <Field label="Organiser" required hint="Event will be created under this NGO.">
            {orgsLoading ? (
              <div className="input flex items-center gap-2 text-ink-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading organisations…
              </div>
            ) : (
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                required
                className="input"
                disabled={orgs.length === 0}
              >
                {orgs.length === 0 ? (
                  <option value="">No verified organisations available</option>
                ) : (
                  orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))
                )}
              </select>
            )}
          </Field>
        )}

        {/* Event manager: show their own org as read-only */}
        {!isAdmin && (
          <div className="rounded-xl border border-ink-100 bg-canvas-subtle px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-secondary-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Creating under
              </p>
              <p className="text-sm font-semibold text-ink-900 truncate">
                {myOrg ? myOrg.name : "Your organisation"}
              </p>
            </div>
          </div>
        )}

        {/* Title */}
        <Field label="Event title" required error={errors.title}>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
            }}
            required
            minLength={3}
            maxLength={255}
            placeholder="e.g. Run for Education 2026"
            className={`input ${errors.title ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/10" : ""}`}
          />
        </Field>

        {/* Cause summary */}
        <Field
          label="Cause summary"
          required
          error={errors.cause_summary}
          hint={`One–two sentences shown on the event card. Min 10 characters (${causeSummary.length}/500).`}
        >
          <input
            value={causeSummary}
            onChange={(e) => {
              setCauseSummary(e.target.value);
              if (errors.cause_summary)
                setErrors((p) => ({ ...p, cause_summary: undefined }));
            }}
            required
            minLength={10}
            maxLength={500}
            placeholder="e.g. Educate 100 girls in rural Karnataka through a 30-day virtual run."
            className={`input ${errors.cause_summary ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/10" : ""}`}
          />
          <CharCount value={causeSummary} min={10} max={500} />
        </Field>

        {/* Description */}
        <Field
          label="Full description"
          required
          error={errors.description}
          hint={`Detailed story shown on the event page. Min 20 characters (${description.length} so far).`}
        >
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description)
                setErrors((p) => ({ ...p, description: undefined }));
            }}
            required
            minLength={20}
            rows={6}
            placeholder="Tell donors why this run matters, what the funds will achieve, and how distance translates to impact…"
            className={`input ${errors.description ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/10" : ""}`}
          />
          <CharCount value={description} min={20} />
        </Field>

        {/* Cause category + format */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Cause category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="education">Education</option>
              <option value="health">Health</option>
              <option value="environment">Environment</option>
              <option value="animal_welfare">Animal welfare</option>
              <option value="disaster_relief">Disaster relief</option>
              <option value="poverty">Poverty</option>
              <option value="women_empowerment">Women empowerment</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Event format">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="input"
            >
              <option value="virtual">Virtual</option>
              <option value="in_person">In-person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>

          <Field label="Participation type">
            <select
              value={participation}
              onChange={(e) => setParticipation(e.target.value)}
              className="input"
            >
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="both">Individual + Team</option>
            </select>
          </Field>

          <Field label="Distance tracking" hint="How runner distance is counted.">
            <select
              value={runType}
              onChange={(e) => setRunType(e.target.value)}
              className="input"
            >
              <option value="cumulative">Cumulative (total over event)</option>
              <option value="daily">Daily (each day logged separately)</option>
              <option value="single_day">Single day</option>
            </select>
          </Field>
        </div>

        {/* Goals */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Fundraising goal (₹)" required error={errors.goal}>
            <input
              type="number"
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                if (errors.goal) setErrors((p) => ({ ...p, goal: undefined }));
              }}
              required
              min={1}
              className={`input ${errors.goal ? "border-danger-500" : ""}`}
            />
          </Field>

          <Field label="Per-runner distance goal (km)" hint="Leave 0 for no per-runner target.">
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              min={0}
              className="input"
            />
          </Field>
        </div>

        {/* Dates */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Start date" required error={errors.start}>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (errors.start) setErrors((p) => ({ ...p, start: undefined }));
              }}
              required
              className={`input ${errors.start ? "border-danger-500" : ""}`}
            />
          </Field>

          <Field label="End date" required error={errors.end}>
            <input
              type="date"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                if (errors.end) setErrors((p) => ({ ...p, end: undefined }));
              }}
              required
              className={`input ${errors.end ? "border-danger-500" : ""}`}
            />
          </Field>
        </div>

        {/* City */}
        <Field label="City" hint="Optional — enables discovery on the India map.">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            placeholder="e.g. Mumbai"
            className="input"
          />
        </Field>

        <div className="pt-2 flex items-center gap-4 border-t border-ink-100">
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-2"
            disabled={submitting || noVerifiedOrgs || managerHasNoOrg}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save as draft
          </button>
          <p className="text-xs text-ink-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            You can submit for approval from the event page after saving.
          </p>
        </div>
      </form>
    </div>
  );
}

/* ── helpers ── */

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </span>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger-600 font-medium">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </label>
  );
}

function CharCount({
  value,
  min,
  max,
}: {
  value: string;
  min: number;
  max?: number;
}): React.ReactNode {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <p
      className={`mt-1 text-[11px] tabular text-right ${
        ok ? "text-ink-400" : "text-danger-500 font-medium"
      }`}
    >
      {len} char{len !== 1 ? "s" : ""}
      {!ok && ` — need ${min - len} more`}
      {max ? ` / ${max} max` : ""}
    </p>
  );
}
