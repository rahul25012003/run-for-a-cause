import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventDetail } from "@/types";

interface PayoutPublic {
  id: string;
  gross_amount: string;
  platform_fee: string;
  gateway_fee: string;
  net_amount: string;
  status: string;
  bank_utr: string | null;
  processed_at: string | null;
  created_at: string;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchEvent(eventId: string): Promise<EventDetail | null> {
  try {
    // Use by-id endpoint — works for any status, not just public-visible ones
    const res = await fetch(`${apiUrl}/events/by-id/${eventId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as EventDetail;
  } catch {
    return null;
  }
}

async function fetchPayouts(eventId: string): Promise<PayoutPublic[]> {
  try {
    const res = await fetch(`${apiUrl}/payouts/by-event/${eventId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return (await res.json()) as PayoutPublic[];
  } catch {
    return [];
  }
}

export const metadata: Metadata = { title: "Public audit" };

export default async function AuditPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactNode> {
  const { eventId } = await params;
  const event = await fetchEvent(eventId);
  if (!event) notFound();
  const payouts = await fetchPayouts(eventId);

  const totalPaid = payouts.reduce((s, p) => s + parseFloat(p.net_amount), 0);
  const platformFee =
    parseFloat(event.total_raised) * (parseFloat(event.platform_fee_pct) / 100);
  const outstanding = parseFloat(event.total_raised) - platformFee - totalPaid;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="bg-white border-b border-ink-100">
        <div className="container-page h-16 flex items-center justify-between">
          <Logo />
          <Link
            href={`/events/${event.slug}`}
            className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 font-medium"
          >
            View event <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="container-page py-12 max-w-3xl">
        {/* Verified badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-50 border border-secondary-100 text-xs font-semibold text-secondary-700 mb-6">
          <ShieldCheck className="w-3.5 h-3.5" /> Public audit — every rupee accounted for
        </div>

        <h1 className="font-display font-medium text-display-lg text-ink-900">
          {event.title}
        </h1>
        <p className="mt-2 text-ink-500">
          Hosted by{" "}
          <span className="font-semibold text-ink-700">
            {event.organisation.name}
          </span>{" "}
          ·{" "}
          {event.organisation.is_80g_eligible
            ? "80G tax-exempt donations"
            : "Not 80G registered"}
        </p>

        {/* Money trail card */}
        <div className="card p-6 md:p-8 mt-8">
          <h2 className="eyebrow mb-4">Money trail</h2>
          <div className="font-mono">
            <Row
              label="Total donations received"
              value={formatCurrency(event.total_raised)}
              note={`${event.total_donors} donors`}
              bold
            />
            <Divider />
            <Row
              label={`Platform fee (${event.platform_fee_pct}%)`}
              value={`− ${formatCurrency(platformFee)}`}
            />
            <Row
              label="Payment-gateway fee (~2%)"
              value={`− ${formatCurrency(parseFloat(event.total_raised) * 0.02)}`}
              note="estimated"
            />
            <Divider />
            <Row
              label="Released to NGO"
              value={formatCurrency(totalPaid)}
              note={
                payouts.length > 0
                  ? `via ${payouts.length} payout${payouts.length > 1 ? "s" : ""}`
                  : "pending"
              }
              bold
              accent="secondary"
            />
            <Row
              label="Outstanding in escrow"
              value={formatCurrency(Math.max(0, outstanding))}
              note="held until event settles"
            />
          </div>
        </div>

        {/* Payouts */}
        <h2 className="font-display text-xl text-ink-900 mt-12 mb-4">
          Payout history
        </h2>
        {payouts.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-ink-500 text-sm">
              No payouts have been processed yet for this event. Funds are held in escrow until the event closes and distance is verified.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="card p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-mono font-bold text-ink-900 tabular">
                    {formatCurrency(p.net_amount)}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {p.processed_at
                      ? `Settled ${formatDate(p.processed_at)}`
                      : "Pending"}{" "}
                    · UTR {p.bank_utr ?? "—"}
                  </p>
                </div>
                <span
                  className={`chip capitalize ${
                    p.status === "completed"
                      ? "bg-secondary-100 text-secondary-700"
                      : "bg-canvas-subtle text-ink-600"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Utilisation report */}
        <div className="mt-12 card p-6 bg-secondary-50 border-secondary-200">
          <h3 className="font-display text-lg text-secondary-900">
            Utilisation report
          </h3>
          {event.impact_report_url ? (
            <a
              href={event.impact_report_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-secondary-700 font-medium hover:underline"
            >
              Download report <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <p className="mt-2 text-sm text-ink-600">
              The utilisation report will be uploaded by the organisation after
              the event ends.
            </p>
          )}
          {event.utilisation_summary && (
            <p className="mt-3 text-sm text-ink-700 leading-relaxed">
              {event.utilisation_summary}
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-ink-400">
          This page is publicly accessible and cannot be edited.
          All figures are sourced directly from the RunForACause database.
        </p>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  note,
  bold = false,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  bold?: boolean;
  accent?: "secondary";
}): React.ReactNode {
  const textColor = accent === "secondary"
    ? "text-secondary-800"
    : bold
      ? "text-ink-900"
      : "text-ink-700";

  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className={`text-sm ${bold ? "font-semibold" : ""} ${textColor}`}>
          {label}
        </p>
        {note && <p className="text-xs text-ink-400 mt-0.5">{note}</p>}
      </div>
      <span
        className={`tabular text-sm ${bold ? "text-base font-bold" : ""} ${textColor}`}
      >
        {value}
      </span>
    </div>
  );
}

function Divider(): React.ReactNode {
  return <hr className="my-2 border-ink-100" />;
}
