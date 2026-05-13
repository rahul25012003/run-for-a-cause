"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Trophy,
  Users,
  Receipt,
  Loader2,
  ExternalLink,
  Download,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/shared/Badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCompactInr, formatCurrency, formatDate } from "@/lib/utils";

interface Row {
  id: string;
  created_at: string;
  status: string;
  amount: string;
  final_amount: string | null;
  donation_type: string;
  is_80g_eligible: boolean;
  tax_receipt_number: string | null;
  razorpay_payment_id: string | null;
  runner: { name: string | null; public_slug: string | null };
  event: {
    title: string | null;
    slug: string | null;
    organisation_name: string | null;
  };
}

interface DonationsResp {
  summary: {
    total_given: string;
    donation_count: number;
    captured_count: number;
    runners_supported: number;
  };
  donations: Row[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function MyDonationsPage(): React.ReactNode {
  const [data, setData] = useState<DonationsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setData(await api.get<DonationsResp>("/auth/me/donations"));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.detail ?? err.message : "Load failed",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your impact…
      </div>
    );
  }

  const s = data.summary;
  const totalGiven = parseFloat(s.total_given);

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl">
      <header>
        <span className="eyebrow">Your impact</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          Every rupee you&apos;ve sent.
        </h1>
        <p className="mt-2 text-ink-500">
          The runners you sponsor. The causes you back. The receipts you can
          download anytime.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total given"
          value={formatCompactInr(totalGiven)}
          icon={<Heart className="w-4 h-4" />}
          variant="primary"
          hint={`${s.captured_count} captured`}
        />
        <StatCard
          label="Donations"
          value={String(s.donation_count)}
          icon={<Receipt className="w-4 h-4" />}
        />
        <StatCard
          label="Runners supported"
          value={String(s.runners_supported)}
          icon={<Users className="w-4 h-4" />}
          variant="secondary"
        />
        <StatCard
          label="80G receipts"
          value={String(
            data.donations.filter((d) => d.tax_receipt_number).length,
          )}
          icon={<Trophy className="w-4 h-4" />}
        />
      </div>

      {data.donations.length === 0 ? (
        <div className="card p-12 text-center">
          <Heart className="w-8 h-8 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-700 font-medium">
            You haven&apos;t sponsored a runner yet.
          </p>
          <p className="mt-2 text-sm text-ink-500">
            Browse live events and back someone running for a cause you care
            about.
          </p>
          <Link href="/events" className="btn-primary mt-5 inline-flex">
            Browse events
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {data.donations.map((d) => {
            const amount = parseFloat(d.final_amount ?? d.amount);
            const captured =
              d.status === "captured" || d.status === "settled";
            return (
              <div
                key={d.id}
                className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={captured ? "success" : "default"}>
                      {d.status}
                    </Badge>
                    {d.is_80g_eligible && (
                      <Badge variant="primary">
                        <ShieldCheck className="w-3 h-3" /> 80G eligible
                      </Badge>
                    )}
                  </div>
                  <p className="font-display text-lg text-ink-900 leading-snug">
                    Sponsored{" "}
                    {d.runner.public_slug && d.runner.name ? (
                      <Link
                        href={`/runners/${d.runner.public_slug}`}
                        className="text-primary-600 hover:text-primary-700 hover:underline underline-offset-2"
                      >
                        {d.runner.name}
                      </Link>
                    ) : (
                      <span>a runner</span>
                    )}
                    {d.event.title && (
                      <>
                        {" "}
                        for{" "}
                        {d.event.slug ? (
                          <Link
                            href={`/events/${d.event.slug}`}
                            className="text-ink-700 hover:text-primary-600"
                          >
                            {d.event.title}
                          </Link>
                        ) : (
                          d.event.title
                        )}
                      </>
                    )}
                  </p>
                  {d.event.organisation_name && (
                    <p className="text-xs text-ink-500 mt-1">
                      via {d.event.organisation_name}
                    </p>
                  )}
                  <p className="text-[11px] text-ink-400 mt-2 font-mono tabular">
                    {formatDate(d.created_at)}
                    {d.razorpay_payment_id && (
                      <>
                        {" · "}
                        Payment ID {d.razorpay_payment_id}
                      </>
                    )}
                  </p>
                </div>

                <div className="md:text-right md:min-w-[180px] flex md:flex-col items-baseline md:items-end justify-between md:justify-start gap-3 md:gap-2">
                  <p className="font-display text-2xl text-ink-900 tabular leading-none">
                    {formatCurrency(amount)}
                  </p>
                  {captured && d.tax_receipt_number && (
                    <a
                      href={`${API_URL}/donations/${d.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      80G receipt
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
