import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime — Node + Windows has a Next.js bug where the bundled default
// font URL gets mangled (".\\file:\\C:\\..." → Invalid URL → connection drop
// mid-stream). Edge uses a different font resolver that works correctly.
export const runtime = "edge";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface EventDetail {
  title: string;
  cause_summary: string;
  total_raised: string;
  fundraising_goal: string;
  total_runners: number;
  organisation: { name: string } | null;
}

function fmtInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(0)}K`;
  return `₹${amount}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  let event: EventDetail | null = null;
  try {
    const url = `${API_URL}/events/${slug}`.replace(
      "://localhost:",
      "://127.0.0.1:",
    );
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) event = (await res.json()) as EventDetail;
  } catch {
    /* fall through to default card */
  }

  const title = event?.title ?? "Run for a cause";
  const cause = event?.cause_summary ?? "Every kilometre tells a story";
  const orgName = event?.organisation?.name ?? "RunForACause";
  const totalRaised = event ? parseFloat(event.total_raised) : 0;
  const goal = event ? parseFloat(event.fundraising_goal) : 0;
  const pct =
    goal > 0 ? Math.min(100, Math.round((totalRaised / goal) * 100)) : 0;
  const runners = event?.total_runners ?? 0;

  const safeTitle = title.length > 60 ? title.slice(0, 58) + "…" : title;
  const safeCause = cause.length > 110 ? cause.slice(0, 108) + "…" : cause;

  // Satori is strict: every container that has multiple children needs an
  // explicit `display: flex`, and bare text must NOT be a sibling of an
  // element inside a flex container — wrap text in spans.
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FBF6EE",
          padding: "60px 70px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand strip */}
        <div style={{ display: "flex", alignItems: "center", color: "#1A1612" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "#ED6C0F",
              color: "white",
              fontSize: 22,
              fontWeight: 900,
              marginRight: 14,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
            <span>runfora</span>
            <span style={{ color: "#ED6C0F" }}>cause</span>
          </div>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            marginTop: 50,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#ED6C0F",
          }}
        >
          <span>Live event · {orgName}</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#1A1612",
            maxWidth: "85%",
          }}
        >
          <span>{safeTitle}</span>
        </div>

        {/* Cause */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 28,
            color: "#3D352D",
            lineHeight: 1.3,
            maxWidth: "75%",
          }}
        >
          <span>{safeCause}</span>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Stats row */}
        <div style={{ display: "flex", marginTop: 30 }}>
          <Stat value={fmtInr(totalRaised)} label="Raised so far" highlight />
          <div style={{ width: 60 }} />
          <Stat value={`${pct}%`} label="of goal" />
          <div style={{ width: 60 }} />
          <Stat value={String(runners)} label="Runners" green />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

function Stat({
  value,
  label,
  highlight,
  green,
}: {
  value: string;
  label: string;
  highlight?: boolean;
  green?: boolean;
}): React.ReactElement {
  const color = highlight ? "#ED6C0F" : green ? "#2D6A4F" : "#1A1612";
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          fontSize: 56,
          fontWeight: 700,
          color,
          letterSpacing: "-0.02em",
        }}
      >
        <span>{value}</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 4,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#857F77",
        }}
      >
        <span>{label}</span>
      </div>
    </div>
  );
}
