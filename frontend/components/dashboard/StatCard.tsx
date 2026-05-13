"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
  sparkline?: number[];
  variant?: "default" | "primary" | "secondary";
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  sparkline,
  variant = "default",
  className,
}: StatCardProps): ReactNode {
  const iconBg = {
    default: "bg-ink-50 text-ink-700",
    primary: "bg-primary-50 text-primary-600",
    secondary: "bg-secondary-50 text-secondary-600",
  }[variant];

  const trendColor = {
    up: "text-secondary-600",
    down: "text-danger-500",
    flat: "text-ink-400",
  }[trend?.direction ?? "flat"];

  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <div className={cn("card p-6 relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold tracking-wider uppercase text-ink-500">
          {label}
        </p>
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            iconBg,
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-4 font-display font-semibold text-3xl text-ink-900 tabular leading-none">
        {value}
      </p>
      {(hint || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trendColor,
              )}
            >
              <TrendIcon className="w-3 h-3" />
              {trend.label}
            </span>
          )}
          {hint && <span className="text-ink-400">{hint}</span>}
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-60 pointer-events-none">
          <ResponsiveContainer>
            <LineChart data={sparkline.map((v, i) => ({ i, v }))}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="#ED6C0F"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
