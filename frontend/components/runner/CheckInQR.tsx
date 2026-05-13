import { QrCode } from "lucide-react";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * Renders the runner's QR for in-person check-in. Points directly at the
 * backend SVG endpoint so the image is cacheable and unaffected by client
 * JS state. The runner shows this on their phone at the start line; the
 * event manager scans it.
 */
export function CheckInQR({
  eventRunnerId,
  size = 200,
}: {
  eventRunnerId: string;
  size?: number;
}): React.ReactNode {
  const src = `${apiUrl}/event-runners/${eventRunnerId}/qr.svg`;
  return (
    <div className="card flex flex-col items-center text-center">
      <p className="eyebrow text-primary-600 flex items-center gap-1.5">
        <QrCode className="h-3 w-3" aria-hidden />
        Event check-in
      </p>
      <p className="font-display text-lg text-ink-900 mt-1">Show at start line</p>
      {/* Direct img tag — Next/Image won't optimise an SVG endpoint and we
          want a stable size so QR scanners reliably find the corner pattern. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="QR code for event check-in"
        width={size}
        height={size}
        className="mt-3 rounded-lg bg-white p-2 border border-ink-100"
        loading="lazy"
      />
      <p className="mt-3 text-xs text-ink-500">
        The event manager will scan this. Only they can complete check-in.
      </p>
    </div>
  );
}
