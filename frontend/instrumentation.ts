/**
 * Next.js 15 instrumentation hook — runs once on server startup. Used here
 * to init Sentry conditionally; everything is no-op until @sentry/nextjs is
 * installed AND NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * Activate with:
 *   1. `npm install @sentry/nextjs`
 *   2. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 *   3. (Optional) Run `npx @sentry/wizard@latest -i nextjs` for full setup
 *      (it'll generate sentry.{client,server,edge}.config.ts files).
 */
export async function register(): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    // The webpackIgnore comment tells the bundler "don't try to resolve
    // @sentry/nextjs at build time" — at runtime, Node's import will work
    // if the user has installed it, or the catch below handles the missing
    // module gracefully.
    // @ts-expect-error - optional peer dep, types only present when installed
    const Sentry = await import(/* webpackIgnore: true */ "@sentry/nextjs");
    (Sentry as { init: (cfg: object) => void }).init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV ?? "development",
    });
    // eslint-disable-next-line no-console
    console.info("[sentry] initialised (server)");
  } catch {
    // @sentry/nextjs not installed — that's fine, this is opt-in.
    // eslint-disable-next-line no-console
    console.warn(
      "[sentry] DSN set but @sentry/nextjs not installed — run `npm install @sentry/nextjs` to activate.",
    );
  }
}
