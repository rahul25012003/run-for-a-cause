"use client";

/**
 * Pings /api/keepalive once when the app first mounts. This wakes the
 * Render free-tier backend from sleep so subsequent API calls succeed
 * without a 30-60s cold-start delay.
 *
 * Fire-and-forget — no loading state, no error UI, zero user impact.
 */
import { useEffect } from "react";

export function BackendKeepAlive(): null {
  useEffect(() => {
    fetch("/api/keepalive", { cache: "no-store" }).catch(() => undefined);
  }, []);
  return null;
}
