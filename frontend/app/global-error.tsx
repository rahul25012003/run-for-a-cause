"use client";

/**
 * Root-layout crash fallback. Next.js renders this when an error is thrown
 * during the root <RootLayout> itself (font load fails, providers crash, etc.)
 * — at that point error.tsx is unavailable because it sits *inside* the root
 * layout. This file MUST render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactNode {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#FBF6EE",
          color: "#1A1612",
        }}
      >
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#ED6C0F",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Critical error
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, margin: "0 0 12px" }}>
            The site failed to start.
          </h1>
          <p style={{ color: "#5B5650", lineHeight: 1.55 }}>
            We&apos;ve been notified. Refresh, or try again in a moment.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                color: "#9C928B",
                marginTop: 16,
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: 12,
              background: "#ED6C0F",
              color: "white",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
