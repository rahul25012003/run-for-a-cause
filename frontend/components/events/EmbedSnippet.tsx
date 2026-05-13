"use client";

import { useState } from "react";
import { Check, Copy, Share2, Code2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export function EmbedSnippet({
  slug,
  eventUrl,
  title,
  height = 320,
}: {
  slug: string;
  eventUrl: string;
  title?: string;
  height?: number;
}): React.ReactNode {
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
  const snippet = `<iframe src="${siteUrl}/widget/event/${slug}" width="100%" height="${height}" frameborder="0" loading="lazy" title="${title ?? "RunForACause fundraiser"}"></iframe>`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setLinkCopied(true);
      toast.success("Event link copied");
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCodeCopied(true);
      toast.success("Embed code copied");
      setTimeout(() => setCodeCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* ── Public link ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="h-4 w-4 text-primary-500" aria-hidden />
          <p className="font-semibold text-ink-900 text-sm">Share this event</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 bg-canvas-subtle px-3 py-2">
          <p className="flex-1 text-xs text-ink-600 truncate font-mono">
            {eventUrl.replace(/^https?:\/\//, "")}
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
          >
            {linkCopied ? (
              <><Check className="h-3 w-3" /> Copied</>
            ) : (
              <><Copy className="h-3 w-3" /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* ── Embed toggle ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowEmbed((v) => !v)}
          className="flex items-center gap-2 text-xs font-medium text-ink-500 hover:text-ink-900 transition w-full"
        >
          <Code2 className="h-3.5 w-3.5" />
          Embed on your site
          {showEmbed ? (
            <ChevronUp className="h-3 w-3 ml-auto" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-auto" />
          )}
        </button>

        {showEmbed && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-ink-400 leading-snug">
              Paste this on your blog, NGO site, or email — it mirrors live progress automatically.
            </p>
            <div className="relative rounded-lg bg-ink-900 p-3 overflow-x-auto">
              <code className="text-[11px] text-cream-100 whitespace-pre leading-relaxed">
                {snippet}
              </code>
            </div>
            <button
              type="button"
              onClick={copySnippet}
              className="btn-secondary btn-sm inline-flex items-center gap-1.5"
            >
              {codeCopied ? (
                <><Check className="h-3 w-3" /> Copied</>
              ) : (
                <><Copy className="h-3 w-3" /> Copy embed code</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
