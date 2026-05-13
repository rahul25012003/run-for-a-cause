"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Activity, Wallet, ShieldCheck } from "lucide-react";
import type { FeedItem } from "@/lib/hooks/useSiteSettings";

const ICONS = {
  donation: { icon: Heart, color: "bg-primary-500/20 text-primary-300" },
  distance: { icon: Activity, color: "bg-secondary-500/20 text-secondary-300" },
  payout: { icon: Wallet, color: "bg-gold-500/20 text-gold-400" },
  verified: {
    icon: ShieldCheck,
    color: "bg-secondary-500/20 text-secondary-300",
  },
} as const;

const FALLBACK: FeedItem[] = [
  {
    id: "f1",
    type: "donation",
    text: "Priya sponsored Ravi",
    amount: "₹2,500",
    timestamp: new Date(Date.now() - 90_000).toISOString(),
  },
  {
    id: "f2",
    type: "distance",
    text: "Aman logged 8.2 km via Strava",
    amount: "8.2 km",
    timestamp: new Date(Date.now() - 240_000).toISOString(),
  },
  {
    id: "f3",
    type: "verified",
    text: "Asha Foundation passed KYC verification",
    amount: null,
    timestamp: new Date(Date.now() - 600_000).toISOString(),
  },
];

function relTime(ts: string): string {
  const sec = Math.max(
    1,
    Math.floor((Date.now() - new Date(ts).getTime()) / 1000),
  );
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function LiveAuditFeed({
  feed,
}: {
  feed?: FeedItem[];
}): React.ReactNode {
  const initial = feed && feed.length > 0 ? feed.slice(0, 5) : FALLBACK;
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [, setTick] = useState(0);

  useEffect(() => {
    setItems(feed && feed.length > 0 ? feed.slice(0, 5) : FALLBACK);
  }, [feed]);

  // Re-render every 30s so timestamps stay accurate
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase text-secondary-300">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-400 animate-pulse" />
          Live audit feed
        </span>
        <span className="text-[10px] tabular text-white/40 font-mono">
          recent activity
        </span>
      </div>
      <ul className="space-y-2.5">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const cfg = ICONS[item.type] ?? ICONS.donation;
            const Icon = cfg.icon;
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 text-sm"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 truncate leading-snug">
                    {item.text}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5 tabular font-mono">
                    {relTime(item.timestamp)}
                  </p>
                </div>
                {item.amount && (
                  <span className="font-mono text-sm tabular text-primary-300 flex-shrink-0">
                    {item.amount}
                  </span>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <a
        href="/transparency"
        className="mt-4 inline-flex text-xs text-white/60 hover:text-white"
      >
        View full audit log →
      </a>
    </div>
  );
}
