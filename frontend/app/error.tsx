"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Branded runtime error page (Next.js convention — sits next to not-found.tsx).
 * Renders for unhandled errors thrown in client/server components below the
 * root layout. The root layout itself uses global-error.tsx for crashes.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactNode {
  useEffect(() => {
    // Forward the digest to the console so support can correlate against logs.
    if (error.digest) {
      // eslint-disable-next-line no-console
      console.error(`[error.digest=${error.digest}]`, error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas-subtle">
      <div className="text-center max-w-md relative">
        {/* Decorative orb */}
        <div
          aria-hidden
          className="absolute -inset-12 bg-primary-200/40 blur-3xl rounded-full -z-10"
        />
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500/15 mb-5">
          <AlertTriangle className="w-7 h-7 text-primary-600" />
        </div>
        <p className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-primary-600">
          Something tripped up
        </p>
        <h1 className="mt-3 font-display font-medium text-display-md text-ink-900 leading-tight">
          We&apos;ve hit a snag.
        </h1>
        <p className="mt-3 text-ink-600 leading-relaxed">
          The page couldn&apos;t finish loading. Try again — if it keeps failing,
          our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] font-mono tabular tracking-wider text-ink-400">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-7 flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition active:scale-[0.97]"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-ink-200 hover:border-ink-400 text-ink-900 font-semibold text-sm transition"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
