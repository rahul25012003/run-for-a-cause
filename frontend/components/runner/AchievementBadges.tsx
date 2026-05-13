"use client";

import { useEffect, useState } from "react";
import {
  Footprints,
  TrendingUp,
  Award,
  Trophy,
  Heart,
  Coins,
  Crown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string | null;
  icon: string | null;
  unlocked_at: string;
}

const ICONS: Record<string, LucideIcon> = {
  Footprints,
  TrendingUp,
  Award,
  Trophy,
  Heart,
  Coins,
  Crown,
};

interface AchievementBadgesProps {
  /** EventRunner ID — fetches /achievements/runner/{id} */
  eventRunnerId: string;
  /** Optionally provide pre-fetched data to skip the API call */
  initialItems?: Achievement[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function AchievementBadges({
  eventRunnerId,
  initialItems,
}: AchievementBadgesProps): React.ReactNode {
  const [items, setItems] = useState<Achievement[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!initialItems);

  useEffect(() => {
    if (initialItems) return;
    let cancelled = false;
    void fetch(`${API_URL}/achievements/runner/${eventRunnerId}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Achievement[]) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [eventRunnerId, initialItems]);

  if (loading) return null;
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-ink-500">
        <Sparkles className="w-5 h-5 text-primary-400 mx-auto mb-2" />
        Achievements will unlock as the run progresses.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {items.map((a, i) => {
        const Icon = ICONS[a.icon ?? ""] ?? Trophy;
        return (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: i * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="card p-3 text-center hover:shadow-lift transition group"
            title={a.description ?? a.title}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-gold-100 to-primary-100 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Icon className="w-4 h-4 text-primary-600" />
            </div>
            <p className="mt-2 text-xs font-semibold text-ink-900 leading-snug line-clamp-2">
              {a.title}
            </p>
          </motion.li>
        );
      })}
    </ul>
  );
}
