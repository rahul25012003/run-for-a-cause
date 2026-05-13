import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime mandatory on Windows (next/og font path bug on Node)
export const runtime = "edge";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface OrgProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_80g_eligible: boolean;
  total_raised_lifetime?: string;
  total_events_hosted?: number;
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
  let org: OrgProfile | null = null;
  try {
    // 127.0.0.1 (not localhost) — edge fetch sometimes can't resolve localhost
    const url = `${API_URL}/organisations/${slug}/profile`.replace(
      "://localhost:",
      "://127.0.0.1:",
    );
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) org = (await res.json()) as OrgProfile;
  } catch {
    /* fall through */
  }

  const name = org?.name ?? "Verified NGO";
  const desc =
    org?.description ?? "A verified Indian NGO using runs to fund their cause.";
  const lifetime = org ? parseFloat(org.total_raised_lifetime ?? "0") : 0;
  const events = org?.total_events_hosted ?? 0;
  const is80G = !!org?.is_80g_eligible;

  const safeName = name.length > 50 ? name.slice(0, 48) + "…" : name;
  const safeDesc = desc.length > 130 ? desc.slice(0, 128) + "…" : desc;

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

        {/* Eyebrow + verified badge */}
        <div
          style={{
            display: "flex",
            marginTop: 48,
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#2D6A4F",
            }}
          >
            <span>Verified NGO</span>
          </div>
          {is80G && (
            <div
              style={{
                display: "flex",
                padding: "4px 12px",
                borderRadius: 999,
                background: "#C9A04D",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.18em",
              }}
            >
              <span>80G ELIGIBLE</span>
            </div>
          )}
        </div>

        {/* NGO name */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#1A1612",
            maxWidth: "85%",
          }}
        >
          <span>{safeName}</span>
        </div>

        {/* Description */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 26,
            color: "#3D352D",
            lineHeight: 1.3,
            maxWidth: "80%",
          }}
        >
          <span>{safeDesc}</span>
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* Lifetime stats */}
        <div style={{ display: "flex", marginTop: 30 }}>
          <Stat value={fmtInr(lifetime)} label="Raised lifetime" highlight />
          <div style={{ width: 60 }} />
          <Stat value={String(events)} label="Events hosted" green />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
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
