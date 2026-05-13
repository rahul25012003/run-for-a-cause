"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Universal share button.
 *
 * - Mobile (or any browser exposing `navigator.share`): opens the native
 *   OS share sheet — WhatsApp, Telegram, mail, etc., all in one tap.
 * - Desktop / Safari without share support: falls back to copying the
 *   URL to clipboard.
 *
 * The button visually flips to a checkmark for ~1.5s after success so
 * the user gets a clear confirmation without a toast spam.
 */
export function ShareButton({
  url,
  title,
  text,
  variant = "secondary",
  size = "md",
  label = "Share",
}: {
  url: string;
  title?: string;
  text?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  label?: string;
}): React.ReactNode {
  const [copied, setCopied] = useState(false);

  const onClick = async (): Promise<void> => {
    // navigator.share requires HTTPS + a user gesture (the click is one)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title, text });
        return;
      } catch (err) {
        // User cancelled — silent. Anything else falls through to copy.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied — share it anywhere.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press the URL bar to share.");
    }
  };

  const baseCls =
    variant === "primary"
      ? "btn-primary"
      : variant === "ghost"
      ? "btn-ghost"
      : "btn-secondary";
  const sizeCls = size === "sm" ? "btn-sm" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseCls} ${sizeCls} inline-flex items-center gap-1.5`}
      aria-label={`${label}: ${url}`}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden />
      )}
      {label}
    </button>
  );
}
