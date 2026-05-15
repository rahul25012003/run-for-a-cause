/**
 * Keep-alive proxy — the layout fetches this on every page load.
 * It pings the backend health endpoint server-side (so the backend
 * wakes from Render free-tier sleep before the user's first real
 * API call). Returns immediately; the backend wake-up continues
 * in the background if needed.
 */
import { NextResponse } from "next/server";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    // Fire-and-forget wake-up ping (5s timeout — enough for cold start to begin)
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);
    await fetch(`${BACKEND.replace("/api/v1", "")}/health`, {
      signal: ac.signal,
      cache: "no-store",
    }).finally(() => clearTimeout(timer));
  } catch {
    // Ignore — if backend is sleeping the ping starts the wake-up process
  }
  return NextResponse.json({ ok: true });
}
