"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  pct: number;
  className?: string;
  variant?: "primary" | "secondary" | "gold";
  height?: "sm" | "md" | "lg";
}

const colors = {
  primary: "from-primary-500 to-primary-700",
  secondary: "from-secondary-400 to-secondary-600",
  gold: "from-gold-400 to-gold-600",
};

const heights = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  pct,
  className,
  variant = "primary",
  height = "md",
}: ProgressBarProps): React.ReactNode {
  const safe = Math.min(100, Math.max(0, pct));
  return (
    <div
      className={cn(
        "w-full rounded-full bg-ink-100 overflow-hidden",
        heights[height],
        className,
      )}
    >
      <motion.div
        className={cn(
          "h-full rounded-full bg-gradient-to-r",
          colors[variant],
        )}
        initial={{ width: 0 }}
        animate={{ width: `${safe}%` }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
