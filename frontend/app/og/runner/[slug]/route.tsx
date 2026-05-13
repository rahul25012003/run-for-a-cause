import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime — Node + Windows has a Next.js bug where the bundled default
// font URL gets mangled (".\\file:\\C:\\..." → Invalid URL → connection drop
// mid-stream). Edge uses a different font resolver that works correctly.
export const runtime = "edge";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface RunnerRecord {
  id: string;
  event_id: string;
  public_slug: string;
  personal_goal_km: string | null;
  distance_completed_km: string;
  amount_raised: string;
  donor_count: number;
  profile_photo_url: string | null;
}

interface EventRecord {
  id: string;
  title: string;
  cause_summary: string;
}

function fmtInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(0)}K`;
  return `₹${Math.round(amount)}`;
}

function nameFromSlug(slug: string): string {
  const tokens = slug.split("-");
  return tokens
    .slice(0, 2)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(" ");
}

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(
      url.replace("://localhost:", "://127.0.0.1:"),
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const runner = await safeJson<RunnerRecord>(`${API_URL}/runners/${slug}`);
  const event = runner
    ? await safeJson<EventRecord>(`${API_URL}/events/by-id/${runner.event_id}`)
    : null;

  const name = nameFromSlug(slug);
  const eventTitle = event?.title ?? "RunForACause";
  const causeRaw = event?.cause_summary ?? "Run for a cause";
  const cause =
    causeRaw.length > 80 ? causeRaw.slice(0, 78) + "…" : causeRaw;
  const km = runner ? parseFloat(runner.distance_completed_km) : 0;
  const goalKm = runner ? parseFloat(runner.personal_goal_km ?? "0") : 0;
  const raised = runner ? parseFloat(runner.amount_raised) : 0;
  const donors = runner?.donor_count ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#1A1612",
          fontFamily: "sans-serif",
        }}
      >
        {/* Photo side — gradient, single column with stats overlay */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "42%",
            height: "100%",
            background: "#ED6C0F",
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Centered initial as a colorful disc */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 280,
              height: 280,
              borderRadius: 140,
              background: "rgba(255,255,255,0.18)",
              color: "white",
              fontSize: 140,
              fontWeight: 900,
            }}
          >
            <span>{name.charAt(0)}</span>
          </div>

          {/* Distance pill */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 40,
              left: 40,
              right: 40,
              padding: "14px 22px",
              background: "rgba(26, 22, 18, 0.85)",
              borderRadius: 16,
              alignItems: "baseline",
              justifyContent: "center",
              color: "white",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            <span>{km.toFixed(0)}</span>
            <span
              style={{
                marginLeft: 8,
                fontSize: 22,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              / {goalKm.toFixed(0)} km
            </span>
          </div>
        </div>

        {/* Right side — text */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "60px",
            color: "white",
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 18,
                background: "#ED6C0F",
                marginRight: 12,
                color: "white",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              R
            </div>
            <div style={{ display: "flex" }}>
              <span>runfora</span>
              <span style={{ color: "#F08534" }}>cause</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 48,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#F08534",
            }}
          >
            <span>Sponsor a runner · {eventTitle}</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            <span>{name}</span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 22,
              color: "rgba(255,255,255,0.7)",
              maxWidth: "95%",
            }}
          >
            <span>running for {cause}</span>
          </div>

          <div style={{ display: "flex", flex: 1 }} />

          <div style={{ display: "flex" }}>
            <RStat value={fmtInr(raised)} label="Raised" highlight />
            <div style={{ width: 50 }} />
            <RStat value={String(donors)} label="Sponsors" />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

function RStat({
  value,
  label,
  highlight,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          fontSize: 48,
          fontWeight: 700,
          color: highlight ? "#F08534" : "white",
          letterSpacing: "-0.02em",
        }}
      >
        <span>{value}</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 4,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        <span>{label}</span>
      </div>
    </div>
  );
}
