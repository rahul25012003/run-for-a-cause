import Link from "next/link";

export default function NotFound(): React.ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
          404
        </p>
        <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-ink-500">
          It might have moved, or never existed. Try the events listing or head
          back home.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/" className="btn-secondary">
            Home
          </Link>
          <Link href="/events" className="btn-primary">
            Browse events
          </Link>
        </div>
      </div>
    </div>
  );
}
