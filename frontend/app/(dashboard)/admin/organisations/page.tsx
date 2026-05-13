"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  X,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";

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
  created_at: string;
}

export default function OrganisationsPage(): React.ReactNode {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await api.get<Org[]>(
        "/admin/organisations/pending-kyc",
      );
      setOrgs(data);
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

  const verify = async (id: string): Promise<void> => {
    setActionId(id);
    try {
      await api.post(`/organisations/${id}/verify-kyc`, {});
      toast.success("KYC verified.");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Verify failed",
      );
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: string): Promise<void> => {
    if (!rejectReason.trim()) {
      toast.error("Tell the manager why — they'll see this verbatim.");
      return;
    }
    setActionId(id);
    try {
      await api.post(`/organisations/${id}/reject-kyc`, {
        reason: rejectReason.trim(),
      });
      toast.success("KYC rejected. Manager will see your note.");
      setRejectingId(null);
      setRejectReason("");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Reject failed",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <header>
        <span className="eyebrow">KYC queue</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Organisations awaiting review
        </h1>
        <p className="mt-2 text-ink-500">
          Verify legal IDs and bank details before donations can route to this
          NGO. Rejection notes go straight to the manager so they can fix and
          resubmit.
        </p>
      </header>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-ink-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading queue…
        </div>
      ) : orgs.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <ShieldCheck className="w-7 h-7 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-700 font-medium">No organisations pending.</p>
          <p className="mt-2 text-sm text-ink-500">
            Every NGO on the platform has cleared KYC. New submissions land
            here automatically.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orgs.map((org) => {
            const busy = actionId === org.id;
            const rejecting = rejectingId === org.id;
            return (
              <li key={org.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-display text-xl text-ink-900">
                        {org.name}
                      </p>
                      <Badge
                        variant={
                          org.kyc_status === "rejected"
                            ? "danger"
                            : org.kyc_status === "submitted" ||
                                org.kyc_status === "under_review"
                              ? "warning"
                              : "default"
                        }
                      >
                        {org.kyc_status}
                      </Badge>
                    </div>
                    <a
                      href={`/organisations/${org.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-ink-400 inline-flex items-center gap-1 hover:text-primary-600"
                    >
                      /organisations/{org.slug}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <DefRow label="PAN" value={org.pan_number} />
                      <DefRow label="GSTIN" value={org.gstin} />
                      <DefRow label="80G" value={org.reg_80g_number} />
                      <DefRow
                        label="Bank account"
                        value={org.bank_account_no}
                      />
                      <DefRow label="IFSC" value={org.bank_ifsc} />
                      <DefRow label="Bank" value={org.bank_name} />
                      <DefRow
                        label="Holder name"
                        value={org.bank_account_holder}
                      />
                    </dl>
                    {org.kyc_rejection_reason && (
                      <p className="mt-3 text-xs text-red-700 inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Last rejection: {org.kyc_rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => verify(org.id)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary-600 hover:bg-secondary-700 text-white font-semibold text-sm transition disabled:opacity-50"
                    >
                      {busy && actionId === org.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" /> Verify
                        </>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setRejectingId(rejecting ? null : org.id)
                      }
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-ink-200 hover:border-red-400 hover:text-red-700 text-ink-700 font-semibold text-sm transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>

                {rejecting && (
                  <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                        Rejection reason (visible to the manager)
                      </span>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        className="input mt-2 bg-white"
                        placeholder="e.g. PAN doesn't match the trust deed; please re-upload signed copy"
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
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Send rejection"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
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

function DefRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}): React.ReactNode {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-400 font-bold">
        {label}
      </dt>
      <dd className="text-ink-900 font-mono tabular truncate text-sm mt-0.5">
        {value ?? "—"}
      </dd>
    </div>
  );
}
