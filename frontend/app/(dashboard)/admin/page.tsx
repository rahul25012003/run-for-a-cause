import { cookies } from "next/headers";
import Link from "next/link";
import {
  Calendar,
  Heart,
  Users,
  Wallet,
  ArrowRight,
  Activity,
  Building2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DonationLineChart } from "@/components/dashboard/DonationLineChart";
import { CategoryPie } from "@/components/dashboard/CategoryPie";
import { formatCompactInr, formatDistance } from "@/lib/utils";
import type { PlatformStats } from "@/types";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchStats(): Promise<PlatformStats | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  const res = await fetch(`${apiUrl}/admin/stats`, {
    headers: { Cookie: `access_token=${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as PlatformStats;
}

export default async function AdminOverview(): Promise<React.ReactNode> {
  const stats = await fetchStats();
  if (!stats) {
    return (
      <div className="p-10">
        <p className="text-ink-500">Could not load stats.</p>
      </div>
    );
  }

  // Real 30-day series from the backend (zero-filled days included).
  const series = stats.daily_donations.map((d) => ({
    day: d.day,
    raised: parseFloat(d.raised),
  }));

  // Real month-over-month trend.
  const changePct = stats.raised_change_pct;
  const direction: "up" | "down" | "flat" =
    changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
  const sign = changePct > 0 ? "+" : "";
  const trendLabel = `${sign}${changePct.toFixed(1)}%`;

  const categories = stats.category_breakdown;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header>
        <span className="eyebrow">Admin overview</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">
          What&apos;s happening on the platform.
        </h1>
        <p className="mt-2 text-ink-500">
          A real-time picture of every event, donor, and rupee.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total raised"
          value={formatCompactInr(stats.total_raised)}
          icon={<Heart className="w-4 h-4" />}
          variant="primary"
          trend={{ direction, label: trendLabel }}
          hint={
            parseFloat(stats.raised_last_month) > 0
              ? `${formatCompactInr(stats.raised_this_month)} this month`
              : "No donations last month"
          }
        />
        <StatCard
          label="Active events"
          value={String(stats.active_events)}
          icon={<Calendar className="w-4 h-4" />}
          hint={`${stats.total_events} all-time`}
          variant="secondary"
        />
        <StatCard
          label="Runners"
          value={String(stats.total_runners)}
          icon={<Users className="w-4 h-4" />}
          hint={`${stats.total_donors} donors`}
        />
        <StatCard
          label="Distance run"
          value={formatDistance(stats.total_distance_km)}
          icon={<Activity className="w-4 h-4" />}
          variant="secondary"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="eyebrow">Last 30 days</span>
              <h2 className="mt-1 font-display text-2xl text-ink-900">
                Donations over time
              </h2>
            </div>
            <Link href="/admin/donations" className="btn-link text-sm">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <DonationLineChart data={series} />
        </div>

        <div className="card p-6 md:p-8">
          <span className="eyebrow">Distribution</span>
          <h2 className="mt-1 font-display text-2xl text-ink-900 mb-2">
            By cause category
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-ink-400 mt-6 text-center py-16">
              No events yet — categories will appear here once events are created.
            </p>
          ) : (
            <>
              <CategoryPie data={categories} />
              <ul className="mt-4 space-y-2 text-sm">
                {categories.map((c, i) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between text-ink-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background: [
                            "#ED6C0F",
                            "#2D6A4F",
                            "#BF9000",
                            "#A93D2C",
                            "#857F77",
                            "#52966E",
                          ][i % 6],
                        }}
                      />
                      {c.name}
                    </span>
                    <span className="font-mono tabular text-ink-500">
                      {c.value} event{c.value !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href="/admin/organisations"
          className="card-hover p-6 md:p-8 group"
        >
          <Building2 className="w-6 h-6 text-secondary-600 mb-4" />
          <h3 className="font-display text-xl text-ink-900">Organisations</h3>
          <p className="mt-2 text-sm text-ink-600">
            <span className="font-mono font-bold text-ink-900 tabular text-base">
              {stats.total_organisations}
            </span>{" "}
            total ·{" "}
            <span className="text-primary-600 font-semibold">
              {stats.pending_kyc} awaiting KYC
            </span>
          </p>
          <span className="mt-4 inline-flex items-center text-sm text-primary-600 font-semibold opacity-0 group-hover:opacity-100 transition">
            Review queue <ArrowRight className="w-4 h-4 ml-1" />
          </span>
        </Link>

        <Link href="/admin/events" className="card-hover p-6 md:p-8 group">
          <Wallet className="w-6 h-6 text-primary-600 mb-4" />
          <h3 className="font-display text-xl text-ink-900">
            Pending approvals
          </h3>
          <p className="mt-2 text-sm text-ink-600">
            <span className="font-mono font-bold text-ink-900 tabular text-base">
              {stats.pending_event_approvals}
            </span>{" "}
            events submitted for review
          </p>
          <span className="mt-4 inline-flex items-center text-sm text-primary-600 font-semibold opacity-0 group-hover:opacity-100 transition">
            Review events <ArrowRight className="w-4 h-4 ml-1" />
          </span>
        </Link>
      </div>
    </div>
  );
}
