"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Receipt,
  Download,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";
import { formatCurrency } from "@/lib/utils";

interface Donation {
  id: string;
  donor_name: string;
  donor_email: string;
  is_anonymous: boolean;
  donation_type: string;
  estimated_amount: string;
  final_amount: string | null;
  status: string;
  is_80g_eligible: boolean;
  tax_receipt_number: string | null;
  tax_receipt_url: string | null;
  payment_method: string | null;
  razorpay_payment_id: string | null;
  payment_captured_at: string | null;
  created_at: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function AdminDonationsPage(): React.ReactNode {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "captured" | "needs_receipt">(
    "all",
  );

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await api.get<Donation[]>("/admin/donations?limit=200");
      setDonations(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const issueReceipt = async (id: string): Promise<void> => {
    setActingOn(id);
    try {
      await api.post(`/receipts/issue/${id}`);
      toast.success("80G receipt issued + emailed");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Failed",
      );
    } finally {
      setActingOn(null);
    }
  };

  const filtered = donations.filter((d) => {
    if (filter === "all") return true;
    if (filter === "captured")
      return d.status === "captured" || d.status === "settled";
    if (filter === "needs_receipt")
      return (
        d.is_80g_eligible &&
        (d.status === "captured" || d.status === "settled") &&
        !d.tax_receipt_number
      );
    return true;
  });

  const counts = {
    all: donations.length,
    captured: donations.filter(
      (d) => d.status === "captured" || d.status === "settled",
    ).length,
    needs_receipt: donations.filter(
      (d) =>
        d.is_80g_eligible &&
        (d.status === "captured" || d.status === "settled") &&
        !d.tax_receipt_number,
    ).length,
  };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <span className="eyebrow">Donations</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Every captured donation, in one place.
        </h1>
        <p className="mt-2 text-ink-500">
          Issue 80G receipts, download PDFs, audit any payment.
        </p>
      </header>

      <div className="flex gap-2 border-b border-ink-100 mb-6 overflow-x-auto">
        {(
          [
            { id: "all", label: "All" },
            { id: "captured", label: "Captured" },
            { id: "needs_receipt", label: "Needs 80G receipt" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              filter === t.id
                ? "border-primary-500 text-primary-700"
                : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {t.label}{" "}
            <span className="ml-1 text-xs text-ink-400 tabular">
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center gap-2 text-ink-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-ink-500 text-sm">
            No donations match this filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-canvas-subtle border-b border-ink-100">
              <tr>
                <Th>Donor</Th>
                <Th>Type</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th>Receipt</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const amount = d.final_amount ?? d.estimated_amount;
                const captured =
                  d.status === "captured" || d.status === "settled";
                const needsReceipt =
                  captured && d.is_80g_eligible && !d.tax_receipt_number;
                return (
                  <tr
                    key={d.id}
                    className="border-b border-ink-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink-900">
                        {d.is_anonymous ? "Anonymous" : d.donor_name}
                      </p>
                      <p className="text-xs text-ink-500">{d.donor_email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-condensed text-xs uppercase tracking-wider text-ink-600">
                        {d.donation_type === "per_km" ? "Per km" : "Fixed"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono tabular font-bold text-ink-900">
                      {formatCurrency(amount)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          d.status === "captured" || d.status === "settled"
                            ? "success"
                            : d.status === "refunded" ||
                                d.status === "failed"
                              ? "danger"
                              : "default"
                        }
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {d.tax_receipt_number ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-secondary-700 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {d.tax_receipt_number}
                        </span>
                      ) : d.is_80g_eligible && captured ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-primary-600 font-medium">
                          80G eligible
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {needsReceipt && (
                          <button
                            onClick={() => issueReceipt(d.id)}
                            disabled={actingOn === d.id}
                            className="btn-primary btn-sm"
                            title="Generate PDF + email donor"
                          >
                            {actingOn === d.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Mail className="w-3.5 h-3.5" /> Issue
                              </>
                            )}
                          </button>
                        )}
                        {d.tax_receipt_number && (
                          <a
                            href={`${API_URL}/receipts/download/${d.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary btn-sm"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}): React.ReactNode {
  return (
    <th
      className={`px-5 py-3 text-${align} text-xs font-medium text-ink-500 uppercase tracking-wide`}
    >
      {children}
    </th>
  );
}
