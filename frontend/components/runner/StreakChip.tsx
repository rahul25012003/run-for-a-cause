import { Flame } from "lucide-react";

/**
 * Streak chip — shows current run-day streak with all-time best as a
 * subtle suffix. The flame icon brightens once the streak is on:
 *
 *   0 days   → muted, "Start a streak"
 *   1-6 days → primary orange flame, "N day streak"
 *   7+ days  → primary orange + tabular best ("N · best M")
 */
export function StreakChip({
  current,
  best,
  size = "md",
}: {
  current: number;
  best: number;
  size?: "sm" | "md";
}): React.ReactNode {
  const onFire = current > 0;
  const cls =
    size === "sm"
      ? "text-xs gap-1 px-2 py-1"
      : "text-sm gap-1.5 px-3 py-1.5";
  const iconCls = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <span
      className={`inline-flex items-center rounded-full border ${cls} ${
        onFire
          ? "border-primary-200 bg-primary-50 text-primary-700"
          : "border-ink-100 bg-cream-50 text-ink-500"
      }`}
      title={
        onFire
          ? `Logged distance ${current} day${current === 1 ? "" : "s"} in a row` +
            (best > current ? ` · all-time best: ${best}` : "")
          : "Log distance today to start a streak"
      }
    >
      <Flame
        className={`${iconCls} ${onFire ? "text-primary-500" : "text-ink-300"}`}
        aria-hidden
      />
      <span className="tabular font-semibold">
        {onFire ? `${current}-day streak` : "Start a streak"}
      </span>
      {onFire && best > current && (
        <span className="text-ink-400 tabular text-[10px]">best {best}</span>
      )}
    </span>
  );
}
