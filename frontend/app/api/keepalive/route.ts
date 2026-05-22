/**
 * Keep-alive proxy — the layout calls this on every page load.
 * Waits up to 70s for the backend /health to respond so the caller
 * knows the backend is genuinely warm (not just that the ping fired).
 * Returns { ok: true, warm: true } on success, { ok: true, warm: false }
 * on timeout/error.
 */
import { NextResponse } from "next/server";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const ac = new AbortController();
    // 70s — covers the full Render free-tier cold-start window
    const timer = setTimeout(() => ac.abort(), 70_000);
    await fetch(`${BACKEND.replace("/api/v1", "")}/health`, {
      signal: ac.signal,
      cache: "no-store",
    }).finally(() => clearTimeout(timer));
    return NextResponse.json({ ok: true, warm: true });
  } catch {
    return NextResponse.json({ ok: true, warm: false });
  }
}
