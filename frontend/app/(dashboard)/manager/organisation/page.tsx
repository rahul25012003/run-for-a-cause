"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  ShieldCheck,
  AlertCircle,
  Lock,
  Send,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { FileUploadDropzone } from "@/components/shared/FileUploadDropzone";
import { Badge } from "@/components/shared/Badge";

type KycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected";

interface EditState {
  name: string;
  description: string;
  logo_url: string;
  website: string;
  dpo_name: string;
  dpo_email: string;
  dpo_phone: string;
  pan_number: string;
  gstin: string;
  reg_80g_number: string;
  bank_account_no: string;
  bank_ifsc: string;
  bank_name: string;
  bank_account_holder: string;
}

interface OrganisationDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  pan_number: string | null;
  gstin: string | null;
  reg_80g_number: string | null;
  is_80g_eligible: boolean;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  kyc_status: KycStatus;
  kyc_verified_at: string | null;
  kyc_rejection_reason: string | null;
  dpo_name: string | null;
  dpo_email: string | null;
  dpo_phone: string | null;
}

export default function ManagerOrganisationPage(): React.ReactNode {
  const [org, setOrg] = useState<OrganisationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noOrg, setNoOrg] = useState(false);   // true when 404 — needs creation
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState>({
    name: "",
    description: "",
    logo_url: "",
    website: "",
    dpo_name: "",
    dpo_email: "",
    dpo_phone: "",
    pan_number: "",
    gstin: "",
    reg_80g_number: "",
    bank_account_no: "",
    bank_ifsc: "",
    bank_name: "",
    bank_account_holder: "",
  });

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const o = await api.get<OrganisationDetail>("/organisations/me");
      setOrg(o);
      setEdit({
        name: o.name ?? "",
        description: o.description ?? "",
        logo_url: o.logo_url ?? "",
        website: o.website ?? "",
        dpo_name: o.dpo_name ?? "",
        dpo_email: o.dpo_email ?? "",
        dpo_phone: o.dpo_phone ?? "",
        pan_number: o.pan_number ?? "",
        gstin: o.gstin ?? "",
        reg_80g_number: o.reg_80g_number ?? "",
        bank_account_no: o.bank_account_no ?? "",
        bank_ifsc: o.bank_ifsc ?? "",
        bank_name: o.bank_name ?? "",
        bank_account_holder: o.bank_account_holder ?? "",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNoOrg(true);  // show create form instead of edit
      } else {
        toast.error(
          err instanceof ApiError ? err.detail ?? err.message : "Load failed",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const createOrg = async (): Promise<void> => {
    if (!edit.name.trim()) {
      toast.error("Organisation name is required.");
      return;
    }
    setCreating(true);
    try {
      const o = await api.post<OrganisationDetail>("/organisations/", {
        name: edit.name.trim(),
        description: edit.description || undefined,
        website: edit.website || undefined,
        pan_number: edit.pan_number || undefined,
        gstin: edit.gstin || undefined,
        reg_80g_number: edit.reg_80g_number || undefined,
        bank_account_no: edit.bank_account_no || undefined,
        bank_ifsc: edit.bank_ifsc || undefined,
        bank_name: edit.bank_name || undefined,
        bank_account_holder: edit.bank_account_holder || undefined,
      });
      setOrg(o);
      setNoOrg(false);
      toast.success("Organisation created! Fill in KYC details and submit for verification.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      // Send KYC fields ONLY when org is not yet verified — backend rejects
      // them if verified, so we shouldn't even put them in the payload.
      const verified = org?.kyc_status === "verified";
      const payload: Record<string, string | undefined> = {
        name: edit.name || undefined,
        description: edit.description || undefined,
        logo_url: edit.logo_url || undefined,
        website: edit.website || undefined,
        dpo_name: edit.dpo_name || undefined,
        dpo_email: edit.dpo_email || undefined,
        dpo_phone: edit.dpo_phone || undefined,
      };
      if (!verified) {
        payload.pan_number = edit.pan_number || undefined;
        payload.gstin = edit.gstin || undefined;
        payload.reg_80g_number = edit.reg_80g_number || undefined;
        payload.bank_account_no = edit.bank_account_no || undefined;
        payload.bank_ifsc = edit.bank_ifsc || undefined;
        payload.bank_name = edit.bank_name || undefined;
        payload.bank_account_holder = edit.bank_account_holder || undefined;
      }
      const updated = await api.put<OrganisationDetail>(
        "/organisations/me",
        payload,
      );
      setOrg(updated);
      const wasResubmitted =
        !verified &&
        updated.kyc_status === "submitted" &&
        org?.kyc_status !== "submitted";
      toast.success(
        wasResubmitted
          ? "Saved. KYC details submitted for super-admin review."
          : "Organisation profile updated",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Save failed",
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading organisation…
      </div>
    );
  }

  if (noOrg) {
    return (
      <div className="p-6 md:p-10 max-w-2xl">
        <header className="mb-8">
          <span className="eyebrow">Organisation profile</span>
          <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
            Set up your organisation
          </h1>
          <p className="mt-2 text-ink-500">
            Create your NGO profile before you can host events. You only need a
            name to get started — fill in KYC details after.
          </p>
        </header>
        <div className="card p-6 md:p-8 space-y-5">
          <Field label="Organisation name">
            <input
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              className="input"
              maxLength={255}
              placeholder="e.g. Asha Foundation"
              autoFocus
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              value={edit.description}
              onChange={(e) =>
                setEdit({ ...edit, description: e.target.value })
              }
              rows={3}
              className="input"
              placeholder="What does your NGO do? Who do you serve?"
            />
          </Field>
          <Field label="Website (optional)">
            <input
              type="url"
              value={edit.website}
              onChange={(e) => setEdit({ ...edit, website: e.target.value })}
              className="input"
              placeholder="https://"
            />
          </Field>
          <div className="pt-2 border-t border-ink-100">
            <button
              onClick={createOrg}
              disabled={creating || !edit.name.trim()}
              className="btn-primary"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" /> Create organisation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-10 max-w-2xl">
        <div className="card p-8 text-center">
          <AlertCircle className="w-7 h-7 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-700 font-medium">Failed to load organisation.</p>
          <p className="mt-2 text-sm text-ink-500">Refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      <header>
        <span className="eyebrow">Organisation profile</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          {org.name}
        </h1>
        <p className="mt-2 text-ink-500">
          What donors see on every event page hosted by your NGO.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {org.kyc_verified_at ? (
            <Badge variant="success">
              <ShieldCheck className="w-3 h-3" /> KYC verified
            </Badge>
          ) : (
            <Badge variant="warning">KYC pending</Badge>
          )}
          {org.is_80g_eligible && <Badge variant="primary">80G eligible</Badge>}
          <span className="text-xs text-ink-400 font-mono">/{org.slug}</span>
        </div>
      </header>

      <div className="card p-6 md:p-8 space-y-5">
        <Field label="Organisation name">
          <input
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            className="input"
            maxLength={255}
          />
        </Field>

        <Field label="Logo">
          <FileUploadDropzone
            endpoint="image"
            value={edit.logo_url}
            onUploaded={(url) => setEdit({ ...edit, logo_url: url })}
            label="Drop your logo (PNG with transparent background works best)"
          />
        </Field>

        <Field label="Description (shown on every event page)">
          <textarea
            value={edit.description}
            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
            rows={5}
            className="input"
            placeholder="What does your NGO do? Who do you serve? What proves you're effective?"
          />
        </Field>

        <Field label="Website">
          <input
            type="url"
            value={edit.website}
            onChange={(e) => setEdit({ ...edit, website: e.target.value })}
            className="input"
            placeholder="https://"
          />
        </Field>

        {/* DPDP — Data Protection Officer */}
        <div className="pt-5 mt-2 border-t border-ink-100">
          <h3 className="font-display text-base text-ink-900">
            Data Protection Officer
          </h3>
          <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
            Your designated contact for any data-protection requests from
            donors and runners. Required under the Digital Personal Data
            Protection Act 2023 (DPDP Act). Shown publicly on your privacy
            page so people know who to write to.
          </p>
        </div>

        <Field label="DPO name">
          <input
            value={edit.dpo_name}
            onChange={(e) => setEdit({ ...edit, dpo_name: e.target.value })}
            className="input"
            maxLength={255}
            placeholder="e.g. Anita Sharma"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="DPO email">
            <input
              type="email"
              value={edit.dpo_email}
              onChange={(e) => setEdit({ ...edit, dpo_email: e.target.value })}
              className="input"
              placeholder="dpo@example.org"
            />
          </Field>
          <Field label="DPO phone (optional)">
            <input
              value={edit.dpo_phone}
              onChange={(e) => setEdit({ ...edit, dpo_phone: e.target.value })}
              className="input"
              placeholder="+91 …"
            />
          </Field>
        </div>

        <div className="pt-2 border-t border-ink-100">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" /> Save changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* KYC, banking & legal IDs — editable until verified */}
      <KycSection
        org={org}
        edit={edit}
        setEdit={setEdit}
        saving={saving}
        save={save}
      />
    </div>
  );
}

function KycSection({
  org,
  edit,
  setEdit,
  saving,
  save,
}: {
  org: OrganisationDetail;
  edit: EditState;
  setEdit: React.Dispatch<React.SetStateAction<EditState>>;
  saving: boolean;
  save: () => Promise<void>;
}): React.ReactNode {
  const verified = org.kyc_status === "verified";
  const statusBadge = verified ? (
    <Badge variant="success">
      <ShieldCheck className="w-3 h-3" /> KYC verified
    </Badge>
  ) : org.kyc_status === "submitted" || org.kyc_status === "under_review" ? (
    <Badge variant="warning">Awaiting super-admin review</Badge>
  ) : org.kyc_status === "rejected" ? (
    <Badge variant="danger">Rejected — please update and resubmit</Badge>
  ) : (
    <Badge variant="default">KYC pending</Badge>
  );

  return (
    <div className={`card p-6 md:p-7 ${verified ? "bg-canvas-subtle" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-lg text-ink-900 inline-flex items-center gap-2">
            {verified && <Lock className="w-4 h-4 text-ink-500" />}
            KYC, banking &amp; legal IDs
          </h3>
          <div className="mt-2">{statusBadge}</div>
        </div>
        {org.kyc_verified_at && (
          <p className="text-xs text-ink-400 font-mono">
            Verified on {formatDate(org.kyc_verified_at)}
          </p>
        )}
      </div>

      {verified ? (
        <p className="mt-3 text-sm text-ink-500 leading-relaxed">
          Your KYC is verified — these fields are now locked. Editing them
          would invalidate your verification (it&apos;s a fraud-prevention
          control). To change any of them, contact a super-admin.
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-600 leading-relaxed">
          Fill these in accurately — a super-admin verifies them against PAN,
          GST, and 80G records before donations can be released to your
          account. Saving with KYC fields filled submits them for review.
        </p>
      )}

      {org.kyc_status === "rejected" && org.kyc_rejection_reason && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
            Reason for rejection
          </p>
          <p className="text-sm text-red-900">{org.kyc_rejection_reason}</p>
        </div>
      )}

      <div className="mt-5 grid sm:grid-cols-2 gap-4">
        <Field label="PAN number">
          <input
            value={edit.pan_number}
            onChange={(e) =>
              setEdit({ ...edit, pan_number: e.target.value.toUpperCase() })
            }
            className="input font-mono tabular"
            maxLength={20}
            placeholder="AAATA1234B"
            disabled={verified}
          />
        </Field>
        <Field label="GSTIN">
          <input
            value={edit.gstin}
            onChange={(e) =>
              setEdit({ ...edit, gstin: e.target.value.toUpperCase() })
            }
            className="input font-mono tabular"
            maxLength={20}
            placeholder="29AAATA1234B1Z5"
            disabled={verified}
          />
        </Field>
        <Field label="80G registration number">
          <input
            value={edit.reg_80g_number}
            onChange={(e) =>
              setEdit({ ...edit, reg_80g_number: e.target.value })
            }
            className="input font-mono tabular"
            maxLength={100}
            placeholder="AAATA1234B/80G/2024"
            disabled={verified}
          />
        </Field>
        <Field
          label={
            org.is_80g_eligible
              ? "80G eligible (decided by super-admin)"
              : "80G eligible — not yet"
          }
        >
          <div className="input bg-canvas-subtle text-ink-700 cursor-not-allowed inline-flex items-center">
            {org.is_80g_eligible ? "Yes" : "No"}
          </div>
        </Field>
      </div>

      <div className="mt-7 pt-5 border-t border-ink-100">
        <h4 className="font-display text-base text-ink-900 mb-1">
          Bank account (where payouts land)
        </h4>
        <p className="text-xs text-ink-500 mb-4">
          Penny-drop validation runs on first verification. Once verified, the
          account locks — you cannot swap it later without re-verification.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Bank account number">
            <input
              value={edit.bank_account_no}
              onChange={(e) =>
                setEdit({ ...edit, bank_account_no: e.target.value })
              }
              className="input font-mono tabular"
              maxLength={50}
              placeholder="e.g. 50100123456789"
              disabled={verified}
            />
          </Field>
          <Field label="IFSC code">
            <input
              value={edit.bank_ifsc}
              onChange={(e) =>
                setEdit({ ...edit, bank_ifsc: e.target.value.toUpperCase() })
              }
              className="input font-mono tabular"
              maxLength={20}
              placeholder="HDFC0001234"
              disabled={verified}
            />
          </Field>
          <Field label="Bank name">
            <input
              value={edit.bank_name}
              onChange={(e) => setEdit({ ...edit, bank_name: e.target.value })}
              className="input"
              maxLength={100}
              placeholder="HDFC Bank, SB Branch"
              disabled={verified}
            />
          </Field>
          <Field label="Account holder name (must match PAN)">
            <input
              value={edit.bank_account_holder}
              onChange={(e) =>
                setEdit({ ...edit, bank_account_holder: e.target.value })
              }
              className="input"
              maxLength={255}
              disabled={verified}
            />
          </Field>
        </div>
      </div>

      {!verified && (
        <div className="mt-6 pt-5 border-t border-ink-100 flex items-center gap-3 flex-wrap">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : org.kyc_status === "rejected" ? (
              <>
                <Send className="w-4 h-4" /> Resubmit for review
              </>
            ) : org.kyc_status === "submitted" ||
              org.kyc_status === "under_review" ? (
              <>
                <Save className="w-4 h-4" /> Update submission
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit for review
              </>
            )}
          </button>
          <p className="text-xs text-ink-500">
            Saving here also saves all profile + DPO fields above.
          </p>
        </div>
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
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

