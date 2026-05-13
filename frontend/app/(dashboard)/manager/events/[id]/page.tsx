"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Loader2,
  AlertTriangle,
  Pencil,
  FileText,
  Heart,
  Users,
  Wallet,
  TrendingUp,
  Download,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ShareButton } from "@/components/shared/ShareButton";
import { EmbedSnippet } from "@/components/events/EmbedSnippet";
import { SubmitEventButton } from "@/components/events/SubmitEventButton";
import { formatCompactInr, formatDistance, formatCurrency } from "@/lib/utils";

interface DonationByDay {
  day: string;
  raised: string;
  count: number;
}

interface TopRunner {
  runner_id: string;
  name: string;
  public_slug: string;
  amount_raised: string;
  distance_km: string;
  donor_count: number;
}

interface EventAnalytics {
  event_id: string;
  slug: string;
  title: string;
  event_status: string;
  total_raised: string;
  total_distance_km: string;
  total_runners: number;
  total_donors: number;
  pending_distance_logs: number;
  pending_runners: number;
  fundraising_progress_pct: number;
  daily_donations: DonationByDay[];
  top_runners_by_amount: TopRunner[];
  top_runners_by_distance: TopRunner[];
}

export default function ManagerEventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id: eventId } = use(params);
  const [data, setData] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api
      .get<EventAnalytics>(`/analytics/events/${eventId}`)
      .then(setData)
      .catch((err: unknown) => {
        toast.error(
          err instanceof ApiError ? err.detail ?? err.message : "Load failed",
        );
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!data) return null;

  const chartData = data.daily_donations.map((d) => ({
    day: d.day,
    raised: parseFloat(d.raised),
  }));

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/manager/events"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="w-4 h-4" /> All events
        </Link>
        <div className="flex flex-wrap gap-2">
          {/* Draft: show submit-for-review prominently before other actions */}
          {data.event_status === "draft" && (
            <SubmitEventButton eventId={eventId} />
          )}
          <Link
            href={`/manager/events/${eventId}/distance-approvals`}
            className="btn-secondary btn-sm"
          >
            <Activity className="w-3.5 h-3.5" /> Distance approvals
          </Link>
          <Link
            href={`/manager/events/${eventId}/edit`}
            className="btn-secondary btn-sm"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit event
          </Link>
          <ShareButton
            url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in"}/events/${data.slug}`}
            title={data.title}
            text={`Run for a cause — ${data.title}`}
            variant="secondary"
            size="sm"
            label="Share public link"
          />
          <Link
            href={`/manager/events/${eventId}/impact-report`}
            className="btn-secondary btn-sm"
          >
            <FileText className="w-3.5 h-3.5" /> Impact report
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/events/${eventId}/exports/donations.csv`}
            className="btn-secondary btn-sm"
            title="Download all donations as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Donations CSV
          </a>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/events/${eventId}/exports/runners.csv`}
            className="btn-secondary btn-sm"
            title="Download all runners as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Runners CSV
          </a>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/events/${eventId}/exports/analytics.pdf`}
            className="btn-primary btn-sm"
            title="One-page board report — totals, top runners, top donors"
          >
            <Download className="w-3.5 h-3.5" /> Analytics PDF
          </a>
        </div>
      </div>

      <header>
        <span className="eyebrow">Event analytics</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          {data.title}
        </h1>
      </header>

      {(data.pending_distance_logs > 0 || data.pending_runners > 0) && (
        <div className="card p-5 border-yellow-200 bg-yellow-50/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-ink-900">Action needed</p>
            <p className="text-sm text-ink-600 mt-0.5">
              {data.pending_distance_logs > 0 && (
                <>
                  <Link
                    href={`/manager/events/${eventId}/distance-approvals`}
                    className="text-primary-600 underline underline-offset-4"
                  >
                    {data.pending_distance_logs} distance{" "}
                    {data.pending_distance_logs === 1 ? "entry" : "entries"}
                  </Link>{" "}
                  awaiting review.
                </>
              )}
              {data.pending_runners > 0 && (
                <>
                  {" "}
                  {data.pending_runners} pending runner approval
                  {data.pending_runners === 1 ? "" : "s"}.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total raised"
          value={formatCompactInr(data.total_raised)}
          icon={<Heart className="w-4 h-4" />}
          variant="primary"
          hint={`${data.fundraising_progress_pct}% of goal`}
        />
        <StatCard
          label="Distance run"
          value={formatDistance(data.total_distance_km)}
          icon={<Activity className="w-4 h-4" />}
          variant="secondary"
        />
        <StatCard
          label="Runners"
          value={String(data.total_runners)}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Donors"
          value={String(data.total_donors)}
          icon={<Wallet className="w-4 h-4" />}
          variant="secondary"
        />
      </div>

      <div className="card p-6 md:p-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="eyebrow">Last 30 days</span>
            <h2 className="mt-1 font-display text-2xl text-ink-900">
              Donations over time
            </h2>
          </div>
          <TrendingUp className="w-5 h-5 text-primary-500" />
        </div>
        <div className="mt-4 mb-3">
          <ProgressBar pct={data.fundraising_progress_pct} />
          <p className="text-xs text-ink-500 mt-2 tabular">
            {formatCurrency(data.total_raised)} raised · target progress{" "}
            {data.fundraising_progress_pct}%
          </p>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="mgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ED6C0F" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ED6C0F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#E8E2DA"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="#857F77"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#857F77"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 100000
                    ? `₹${(v / 100000).toFixed(1)}L`
                    : `₹${(v / 1000).toFixed(0)}K`
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E2DA",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => [
                  `₹${v.toLocaleString("en-IN")}`,
                  "Raised",
                ]}
              />
              <Area
                type="monotone"
                dataKey="raised"
                stroke="#ED6C0F"
                strokeWidth={2.5}
                fill="url(#mgrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-ink-500 text-sm">
            No donations in the last 30 days yet.
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RunnerLeaderboard
          title="Top runners — by ₹ raised"
          runners={data.top_runners_by_amount}
          metricKey="amount_raised"
        />
        <RunnerLeaderboard
          title="Top runners — by distance"
          runners={data.top_runners_by_distance}
          metricKey="distance_km"
        />
      </div>

      {/* Embed widget — managers can paste this on partner sites */}
      <EmbedSnippet
        slug={data.slug}
        eventUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in"}/events/${data.slug}`}
        title={data.title}
      />
    </div>
  );
}

function RunnerLeaderboard({
  title,
  runners,
  metricKey,
}: {
  title: string;
  runners: TopRunner[];
  metricKey: "amount_raised" | "distance_km";
}): React.ReactNode {
  return (
    <div className="card p-6 md:p-8">
      <h3 className="font-display text-xl text-ink-900 mb-4">{title}</h3>
      {runners.length === 0 ? (
        <p className="text-sm text-ink-500">No runners yet.</p>
      ) : (
        <ol className="divide-y divide-ink-100">
          {runners.map((r, i) => (
            <li
              key={r.runner_id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-200 to-primary-500 flex items-center justify-center text-white font-bold text-sm tabular flex-shrink-0">
                {i + 1}
              </span>
              <Link
                href={`/runners/${r.public_slug}`}
                className="flex-1 min-w-0 hover:text-primary-700"
              >
                <p className="font-semibold text-ink-900 truncate">
                  {r.name}
                </p>
                <p className="text-xs text-ink-500">
                  {r.donor_count} donor{r.donor_count === 1 ? "" : "s"}
                </p>
              </Link>
              <span className="font-mono font-bold text-ink-900 tabular flex-shrink-0">
                {metricKey === "amount_raised"
                  ? formatCompactInr(r.amount_raised)
                  : formatDistance(r.distance_km)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
