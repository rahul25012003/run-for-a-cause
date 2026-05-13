import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime mandatory on Windows
export const runtime = "edge";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface LbRunner {
  rank: number;
  name: string;
  amount_raised: string;
  distance_completed_km: string;
}

interface PublicLeaderboard {
  event_title: string;
  event_slug: string;
  organisation_name: string;
  by_amount: LbRunner[];
}

function fmtInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(0)}K`;
  return `₹${amount}`;
}

const PODIUM_COLORS = ["#ED6C0F", "#C9A04D", "#857F77"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  let lb: PublicLeaderboard | null = null;
  try {
    // analytics_router is mounted at /api/v1; leaderboard endpoint is at
    // /events/{slug}/leaderboard under that. 127.0.0.1 for edge-fetch.
    const url = `${API_URL}/events/${slug}/leaderboard?limit=3`.replace(
      "://localhost:",
      "://127.0.0.1:",
    );
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) lb = (await res.json()) as PublicLeaderboard;
  } catch {
    /* fall through to default card */
  }

  const eventTitle = lb?.event_title ?? "Run for a cause";
  const orgName = lb?.organisation_name ?? "RunForACause";
  const top = (lb?.by_amount ?? []).slice(0, 3);
  const safeTitle =
    eventTitle.length > 48 ? eventTitle.slice(0, 46) + "…" : eventTitle;

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
            marginTop: 48,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#ED6C0F",
          }}
        >
          <span>Leaderboard · {orgName}</span>
        </div>

        {/* Event title */}
        <div
          style={{
            display: "flex",
            marginTop: 14,
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#1A1612",
            maxWidth: "90%",
          }}
        >
          <span>{safeTitle}</span>
        </div>

        {/* Podium — up to 3 rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 36,
            gap: 14,
          }}
        >
          {top.length === 0 ? (
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#857F77",
              }}
            >
              <span>Be the first to raise for this cause</span>
            </div>
          ) : (
            top.map((r, i) => {
              const safeName =
                r.name.length > 28 ? r.name.slice(0, 26) + "…" : r.name;
              return (
                <div
                  key={r.rank}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "12px 20px",
                    borderRadius: 16,
                    background: i === 0 ? "#FFE4CB" : "#FFFFFF",
                    border: i === 0 ? "2px solid #ED6C0F" : "1px solid #E8DFD0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: PODIUM_COLORS[i] ?? "#857F77",
                      color: "white",
                      fontSize: 20,
                      fontWeight: 900,
                    }}
                  >
                    {r.rank}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#1A1612",
                    }}
                  >
                    <span>{safeName}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 28,
                      fontWeight: 700,
                      color: PODIUM_COLORS[i] ?? "#1A1612",
                    }}
                  >
                    <span>{fmtInr(parseFloat(r.amount_raised))}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* Footer */}
        <div
          style={{
            display: "flex",
            fontSize: 18,
            color: "#857F77",
          }}
        >
          <span>Top fundraisers · runforacause.in</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
