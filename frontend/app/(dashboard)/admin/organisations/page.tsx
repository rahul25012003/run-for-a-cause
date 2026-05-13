"use client";

import { useEffect, useState } from "react";
import {
  Loader2, ShieldCheck, X, ExternalLink, AlertTriangle,
  RotateCcw, Trash2, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";
import { formatDate } from "@/lib/utils";

interface Org {
  id: string;
  name: string;
  slug: string;
  pan_number: string | null;
  gstin: string | null;
  reg_80g_number: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  kyc_status: string;
  kyc_rejection_reason: string | null;
  kyc_verified_at: string | null;
  is_80g_eligible: boolean;
  created_at: string;
}

type Filter = "all" | "pending" | "submitted" | "under_review" | "verified" | "rejected";

export default function OrganisationsPage(): React.ReactNode {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await api.get<Org[]>("/organisations/admin/all");
      setOrgs(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const verify = async (id: string): Promise<void> => {
    setActionId(id);
    try {
      await api.post(`/organisations/${id}/verify-kyc`, {});
      toast.success("KYC verified — manager can now create live events.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Verify failed");
    } finally { setActionId(null); }
  };

  const reject = async (id: string): Promise<void> => {
    if (!rejectReason.trim()) { toast.error("Rejection reason required."); return; }
    setActionId(id);
    try {
      await api.post(`/organisations/${id}/reject-kyc`, { reason: rejectReason.trim() });
      toast.success("Rejected. Manager will see your reason and can resubmit.");
      setRejectingId(null); setRejectReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Reject failed");
    } finally { setActionId(null); }
  };

  const resetKyc = async (id: string): Promise<void> => {
    setActionId(id);
    try {
      await api.post(`/organisations/${id}/reset-kyc`, {});
      toast.success("KYC reset to pending — manager can now edit locked fields.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Reset failed");
    } finally { setActionId(null); }
  };

  const deleteOrg = async (id: string, name: string): Promise<void> => {
    if (!window.confirm(`Permanently delete "${name}"? This removes all associated events and data. This cannot be undone.`)) return;
    setActionId(id);
    try {
      await api.delete(`/organisations/${id}`);
      toast.success(`"${name}" deleted.`);
      setDeletingId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Delete failed");
    } finally { setActionId(null); }
  };

  const displayed = filter === "all" ? orgs : orgs.filter(o => o.kyc_status === filter);
  const counts = {
    all: orgs.length,
    pending: orgs.filter(o => o.kyc_status === "pending").length,
    submitted: orgs.filter(o => o.kyc_status === "submitted" || o.kyc_status === "under_review").length,
    verified: orgs.filter(o => o.kyc_status === "verified").length,
    rejected: orgs.filter(o => o.kyc_status === "rejected").length,
  };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <span className="eyebrow">NGO Management</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Organisations
        </h1>
        <p className="mt-2 text-ink-500">
          Verify KYC, reset locked fields, or remove organisations. All {orgs.length} NGOs shown.
        </p>
      </header>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          ["all",      "All",            counts.all],
          ["submitted","Needs Review",   counts.submitted],
          ["pending",  "Pending",        counts.pending],
          ["verified", "Verified",       counts.verified],
          ["rejected", "Rejected",       counts.rejected],
        ] as [Filter, string, number][]).map(([val, label, n]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition border ${
              filter === val
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white border-ink-200 text-ink-700 hover:border-ink-400"
            }`}
          >
            {label} {n > 0 && <span className="ml-1 opacity-70">({n})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-10 text-center">
          <Filter className="w-7 h-7 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-700 font-medium">No organisations in this filter.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {displayed.map((org) => {
            const busy = actionId === org.id;
            const rejecting = rejectingId === org.id;
            const statusVariant =
              org.kyc_status === "verified" ? "success"
              : org.kyc_status === "rejected" ? "danger"
              : org.kyc_status === "submitted" || org.kyc_status === "under_review" ? "warning"
              : "default";

            return (
              <li key={org.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-display text-xl text-ink-900">{org.name}</p>
                      <Badge variant={statusVariant}>
                        {org.kyc_status.replace("_", " ")}
                      </Badge>
                      {org.is_80g_eligible && <Badge variant="primary">80G</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-400">
                      <a
                        href={`/organisations/${org.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono inline-flex items-center gap-1 hover:text-primary-600"
                      >
                        /{org.slug} <ExternalLink className="w-3 h-3" />
                      </a>
                      <span>Created {formatDate(org.created_at)}</span>
                      {org.kyc_verified_at && (
                        <span className="text-secondary-600 font-semibold">
                          Verified {formatDate(org.kyc_verified_at)}
                        </span>
                      )}
                    </div>

                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <DefRow label="PAN" value={org.pan_number} />
                      <DefRow label="GSTIN" value={org.gstin} />
                      <DefRow label="80G Reg." value={org.reg_80g_number} />
                      <DefRow label="Bank account" value={org.bank_account_no} />
                      <DefRow label="IFSC" value={org.bank_ifsc} />
                      <DefRow label="Bank" value={org.bank_name} />
                      <DefRow label="Account holder" value={org.bank_account_holder} />
                    </dl>

                    {org.kyc_rejection_reason && (
                      <p className="mt-3 text-xs text-red-700 inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Rejection reason: {org.kyc_rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0 min-w-[140px]">
                    {/* Verify — show for pending/submitted/under_review/rejected */}
                    {org.kyc_status !== "verified" && (
                      <button
                        onClick={() => verify(org.id)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary-600 hover:bg-secondary-700 text-white font-semibold text-sm transition disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify KYC</>}
                      </button>
                    )}

                    {/* Reject — show for submitted/under_review */}
                    {(org.kyc_status === "submitted" || org.kyc_status === "under_review") && (
                      <button
                        onClick={() => setRejectingId(rejecting ? null : org.id)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-ink-200 hover:border-red-400 hover:text-red-700 text-ink-700 font-semibold text-sm transition disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    )}

                    {/* Reset KYC — show for verified orgs so fields can be edited */}
                    {org.kyc_status === "verified" && (
                      <button
                        onClick={() => resetKyc(org.id)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 font-semibold text-sm transition disabled:opacity-50"
                        title="Unlock KYC fields for editing by the manager"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4" /> Reset KYC</>}
                      </button>
                    )}

                    {/* Delete — always available */}
                    <button
                      onClick={() => deleteOrg(org.id, org.name)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-ink-200 hover:border-red-500 hover:bg-red-50 hover:text-red-700 text-ink-500 font-semibold text-sm transition disabled:opacity-50"
                      title="Permanently delete this organisation"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Delete</>}
                    </button>
                  </div>
                </div>

                {/* Rejection reason input */}
                {rejecting && (
                  <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                        Rejection reason (manager will see this)
                      </span>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        className="input mt-2 bg-white"
                        placeholder="e.g. PAN doesn't match the trust deed; please resubmit with a signed copy"
                        maxLength={1000}
                        autoFocus
                      />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => reject(org.id)}
                        disabled={busy || !rejectReason.trim()}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-40"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send rejection"}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(""); }}
                        className="px-4 py-2 rounded-lg bg-white border border-ink-200 hover:border-ink-400 text-ink-700 text-sm transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DefRow({ label, value }: { label: string; value: string | null }): React.ReactNode {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-400 font-bold">{label}</dt>
      <dd className="text-ink-900 font-mono tabular truncate text-sm mt-0.5">{value ?? "—"}</dd>
    </div>
  );
}
