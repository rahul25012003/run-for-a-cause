"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Bell,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { FileUploadDropzone } from "@/components/shared/FileUploadDropzone";
import { Badge } from "@/components/shared/Badge";
import type { UserRole, DigestFrequency } from "@/types";

interface MeResponse {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  is_verified: boolean;
  digest_frequency: DigestFrequency;
  whatsapp_opted_in: boolean;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function AccountPage(): React.ReactNode {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [digestSaving, setDigestSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    bio: "",
  });
  const [pw, setPw] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const u = await api.get<MeResponse>("/auth/me");
      setMe(u);
      setProfile({
        full_name: u.full_name ?? "",
        phone: u.phone ?? "",
        avatar_url: u.avatar_url ?? "",
        bio: u.bio ?? "",
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Load failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (): Promise<void> => {
    setSaving(true);
    try {
      const updated = await api.put<MeResponse>("/auth/me", {
        full_name: profile.full_name || undefined,
        phone: profile.phone || undefined,
        avatar_url: profile.avatar_url || undefined,
        bio: profile.bio || undefined,
      });
      setMe(updated);
      toast.success("Account updated");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Save failed",
      );
    } finally {
      setSaving(false);
    }
  };

  const setDigest = async (freq: DigestFrequency): Promise<void> => {
    setDigestSaving(true);
    try {
      const updated = await api.put<MeResponse>("/auth/me/digest", {
        digest_frequency: freq,
      });
      setMe(updated);
      toast.success(
        freq === "none"
          ? "Email digests turned off."
          : `Now sending ${freq} digests.`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    } finally {
      setDigestSaving(false);
    }
  };

  const toggleWhatsapp = async (next: boolean): Promise<void> => {
    try {
      const updated = await api.put<MeResponse>("/auth/me", {
        whatsapp_opted_in: next,
      });
      setMe(updated);
      toast.success(
        next
          ? "WhatsApp updates turned on."
          : "WhatsApp updates turned off.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    }
  };

  const downloadData = async (): Promise<void> => {
    if (!me) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}/auth/me/data-export`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `runforacause-myaccount-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!me) return;
    if (deleteConfirm.trim().toLowerCase() !== me.email.toLowerCase()) {
      toast.error("Type your email to confirm.");
      return;
    }
    setDeleting(true);
    try {
      await api.delete("/auth/me", {
        confirm_email: deleteConfirm.trim(),
      });
      toast.success("Account scheduled for deletion. You're now signed out.");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    } finally {
      setDeleting(false);
    }
  };

  const changePassword = async (): Promise<void> => {
    if (pw.new_password !== pw.confirm_password) {
      toast.error("New password and confirmation don't match.");
      return;
    }
    if (pw.new_password.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await api.put("/auth/me/password", {
        current_password: pw.current_password,
        new_password: pw.new_password,
      });
      toast.success("Password changed. Use it next time you sign in.");
      setPw({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    } finally {
      setPwSaving(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading || !me) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading account…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      <header>
        <span className="eyebrow">Account</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Your profile & login
        </h1>
        <p className="mt-2 text-ink-500">
          Update what other people on RunForACause see, and manage your sign-in.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="primary">{me.role.replace("_", " ")}</Badge>
          {me.is_verified ? (
            <Badge variant="success">
              <ShieldCheck className="w-3 h-3" /> Verified
            </Badge>
          ) : (
            <Badge variant="warning">Email unverified</Badge>
          )}
          <span className="text-xs text-ink-400 font-mono">{me.email}</span>
        </div>
      </header>

      {/* PROFILE */}
      <div className="card p-6 md:p-8 space-y-5">
        <h2 className="font-display text-xl text-ink-900">Profile</h2>

        <Field label="Avatar">
          <FileUploadDropzone
            endpoint="image"
            value={profile.avatar_url}
            onUploaded={(url) => setProfile({ ...profile, avatar_url: url })}
          />
        </Field>

        <Field label="Full name">
          <input
            value={profile.full_name}
            onChange={(e) =>
              setProfile({ ...profile, full_name: e.target.value })
            }
            className="input"
            maxLength={255}
          />
        </Field>

        <Field label="Phone (optional)">
          <input
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="input"
            maxLength={20}
            placeholder="+91 …"
          />
        </Field>

        <Field label="Short bio (optional)">
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={3}
            className="input"
            placeholder="One sentence about you"
            maxLength={500}
          />
        </Field>

        <div className="pt-2 border-t border-ink-100">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" /> Save profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* PASSWORD */}
      <div className="card p-6 md:p-8 space-y-5">
        <h2 className="font-display text-xl text-ink-900 inline-flex items-center gap-2">
          <KeyRound className="w-5 h-5" /> Change password
        </h2>
        <p className="text-sm text-ink-500">
          Pick something at least 8 characters and different from your current.
          You won&apos;t be signed out — but use the new one next time.
        </p>

        <Field label="Current password">
          <input
            type="password"
            value={pw.current_password}
            onChange={(e) =>
              setPw({ ...pw, current_password: e.target.value })
            }
            className="input"
            autoComplete="current-password"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="New password">
            <input
              type="password"
              value={pw.new_password}
              onChange={(e) =>
                setPw({ ...pw, new_password: e.target.value })
              }
              className="input"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              value={pw.confirm_password}
              onChange={(e) =>
                setPw({ ...pw, confirm_password: e.target.value })
              }
              className="input"
              autoComplete="new-password"
            />
          </Field>
        </div>

        {pw.new_password &&
          pw.confirm_password &&
          pw.new_password !== pw.confirm_password && (
            <p className="text-sm text-red-600 inline-flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Passwords don&apos;t match
            </p>
          )}

        <div className="pt-2 border-t border-ink-100">
          <button
            onClick={changePassword}
            disabled={
              pwSaving ||
              !pw.current_password ||
              !pw.new_password ||
              pw.new_password !== pw.confirm_password
            }
            className="btn-primary"
          >
            {pwSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" /> Change password
              </>
            )}
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="card p-6 md:p-8 space-y-4">
        <h2 className="font-display text-xl text-ink-900 inline-flex items-center gap-2">
          <Bell className="w-5 h-5" /> Notification cadence
        </h2>
        <p className="text-sm text-ink-500">
          How often we email you about milestones, donations and impact reports.
          You&apos;ll always get critical notifications (security, receipts).
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(
            [
              {
                value: "instant",
                label: "Instant",
                hint: "Every event as it happens",
              },
              { value: "daily", label: "Daily digest", hint: "Once a day, AM" },
              {
                value: "weekly",
                label: "Weekly digest",
                hint: "Mondays only",
              },
              {
                value: "none",
                label: "Off",
                hint: "Critical emails only",
              },
            ] as { value: DigestFrequency; label: string; hint: string }[]
          ).map((opt) => {
            const active = me.digest_frequency === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setDigest(opt.value)}
                disabled={digestSaving || active}
                className={`text-left rounded-xl p-4 border transition ${
                  active
                    ? "bg-primary-50 border-primary-300 ring-1 ring-primary-300"
                    : "bg-white border-ink-100 hover:border-ink-300"
                } ${digestSaving ? "opacity-60" : ""}`}
              >
                <p className="font-semibold text-ink-900 text-sm">{opt.label}</p>
                <p className="text-xs text-ink-500 mt-0.5">{opt.hint}</p>
                {active && (
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary-700 mt-2">
                    Currently selected
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* WhatsApp opt-in (D1) */}
        <div className="mt-6 pt-6 border-t border-ink-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={me.whatsapp_opted_in}
              onChange={(e) => toggleWhatsapp(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ink-300 text-primary-500 focus:ring-primary-300"
            />
            <span>
              <span className="font-semibold text-ink-900 text-sm">
                Send transactional updates on WhatsApp
              </span>
              <span className="block text-xs text-ink-500 mt-0.5">
                Donation confirmations, distance approvals and event reminders go
                to {me.phone || "your registered phone"}. You can turn this off
                anytime.
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* DATA EXPORT */}
      <div className="card p-6 md:p-8 space-y-3">
        <h2 className="font-display text-xl text-ink-900 inline-flex items-center gap-2">
          <Download className="w-5 h-5" /> Your data
        </h2>
        <p className="text-sm text-ink-500 leading-relaxed">
          Download every record we hold about you — profile, donations, runner
          pages, achievements, notifications — as a single JSON file. This is
          your right under the DPDP Act 2023.
        </p>
        <div className="pt-2">
          <button
            onClick={downloadData}
            disabled={exporting}
            className="btn-secondary"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" /> Download my data
              </>
            )}
          </button>
        </div>
      </div>

      {/* DELETE ACCOUNT — destructive */}
      <div className="card p-6 md:p-8 space-y-4 border-red-200 bg-red-50/30">
        <h2 className="font-display text-xl text-red-900 inline-flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Delete account
        </h2>
        <p className="text-sm text-red-900/80 leading-relaxed">
          We&apos;ll keep a redacted record for 30 days in case you change your
          mind, then hard-purge. Financial records (donations + receipts) stay
          on file for tax/audit reasons but lose their link to your identity.
          <strong className="block mt-2">This cannot be undone after 30 days.</strong>
        </p>
        <Field label={`Type "${me.email}" to confirm`}>
          <input
            type="email"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={me.email}
            className="input border-red-200 focus:border-red-500"
            autoComplete="off"
          />
        </Field>
        <div className="pt-2">
          <button
            onClick={deleteAccount}
            disabled={
              deleting ||
              deleteConfirm.trim().toLowerCase() !== me.email.toLowerCase()
            }
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete my account
              </>
            )}
          </button>
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
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
