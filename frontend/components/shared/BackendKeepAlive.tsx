"use client";

/**
 * Proactively warms the Render free-tier backend on every page load.
 * Pings /api/keepalive repeatedly until it gets a confirmed-warm response
 * (or gives up after 8 attempts × 15s = ~2 min).  Fire-and-forget — no
 * loading state, no error UI, zero user impact.
 */
import { useEffect } from "react";

export function BackendKeepAlive(): null {
  useEffect(() => {
    let attempts = 0;
    const MAX = 8;

    const ping = async (): Promise<void> => {
      try {
        const res = await fetch("/api/keepalive", { cache: "no-store" });
        const data = (await res.json()) as { warm?: boolean };
        if (data.warm) return; // backend confirmed awake — stop
      } catch {
        // network error — keep retrying
      }
      attempts++;
      if (attempts < MAX) setTimeout(() => void ping(), 15_000);
    };

    void ping();
  }, []);

  return null;
}
