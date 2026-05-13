import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

/** Available hand-drawn brand illustrations under /public/illustrations/. */
export type EmptyIllustration =
  | "events"
  | "donations"
  | "runners"
  | "inbox"
  | "search"
  | "teams";

export function EmptyState({
  title,
  description,
  icon,
  illustration,
  action,
}: {
  title: string;
  description?: string;
  /** Inline icon (legacy). Ignored when `illustration` is set. */
  icon?: ReactNode;
  /** Render a brand SVG from /public/illustrations/empty-{name}.svg. */
  illustration?: EmptyIllustration;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {illustration ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/illustrations/empty-${illustration}.svg`}
          alt=""
          className="w-48 h-36 mb-5"
          loading="lazy"
        />
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-canvas-subtle border border-ink-100 flex items-center justify-center mb-5">
          {icon ?? <Inbox className="w-6 h-6 text-ink-400" />}
        </div>
      )}
      <h3 className="font-display text-xl text-ink-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-ink-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
