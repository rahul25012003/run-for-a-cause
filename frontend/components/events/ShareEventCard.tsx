"use client";

import { useState } from "react";
import { Check, Copy, Share2, Link2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Public-facing "Share this event" card. Shows the clean event URL with a
 * copy button and (on mobile) a native share sheet trigger. No embed code —
 * that lives only in the manager dashboard.
 */
export function ShareEventCard({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text?: string;
}): React.ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied — share it anywhere.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title, text });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await handleCopy();
  };

  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="h-4 w-4 text-primary-500" aria-hidden />
        <p className="font-semibold text-ink-900 text-sm">Share this event</p>
      </div>

      {/* URL pill */}
      <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-canvas-subtle px-3 py-2.5 mb-3">
        <Link2 className="h-3.5 w-3.5 text-ink-400 flex-shrink-0" aria-hidden />
        <p className="flex-1 text-xs text-ink-600 truncate font-mono select-all">
          {displayUrl}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition whitespace-nowrap"
          aria-label="Copy event link"
        >
          {copied ? (
            <><Check className="h-3 w-3" /> Copied</>
          ) : (
            <><Copy className="h-3 w-3" /> Copy</>
          )}
        </button>
      </div>

      {/* Share button (native on mobile, copies on desktop) */}
      <button
        type="button"
        onClick={handleShare}
        className="btn-secondary btn-sm w-full inline-flex items-center justify-center gap-2"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      <p className="mt-2 text-center text-[11px] text-ink-400">
        One share averages 3 new donations.
      </p>
    </div>
  );
}
