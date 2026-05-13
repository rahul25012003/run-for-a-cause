import { Heart } from "lucide-react";
import { formatCompactInr, formatDateTime } from "@/lib/utils";

interface DonationPublic {
  id: string;
  donor_name: string;
  is_anonymous: boolean;
  estimated_amount: string;
  final_amount: string | null;
  message: string | null;
  created_at: string;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchDonations(eventId: string): Promise<DonationPublic[]> {
  try {
    const res = await fetch(
      `${apiUrl}/donations/by-event/${eventId}?limit=20`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return [];
    return (await res.json()) as DonationPublic[];
  } catch {
    return [];
  }
}

export async function DonorWall({ eventId }: { eventId: string }) {
  const donations = await fetchDonations(eventId);
  if (donations.length === 0) return null;

  // Show first 6; remaining count shown as a summary line
  const visible = donations.slice(0, 6);
  const hidden = donations.length - visible.length;

  return (
    <section className="card p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary-500" aria-hidden />
          <h2 className="font-display text-xl text-ink-900">Recent supporters</h2>
        </div>
        <span className="chip tabular text-xs">{donations.length}</span>
      </div>

      {/* Compact list */}
      <ul className="divide-y divide-ink-50">
        {visible.map((d) => {
          const amt = parseFloat(d.final_amount ?? d.estimated_amount);
          const initials = d.donor_name.charAt(0).toUpperCase();
          return (
            <li key={d.id} className="py-3 flex items-center gap-3">
              {/* Avatar */}
              <div
                className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs flex-shrink-0"
                aria-hidden
              >
                {initials}
              </div>

              {/* Name + optional message */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate leading-tight">
                  {d.donor_name}
                </p>
                {d.message && (
                  <p className="text-xs text-ink-500 truncate italic leading-tight mt-0.5">
                    &ldquo;{d.message}&rdquo;
                  </p>
                )}
              </div>

              {/* Amount + time stacked right */}
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-semibold text-ink-900 text-sm tabular">
                  {formatCompactInr(amt)}
                </p>
                <p className="text-[11px] text-ink-400 tabular leading-tight">
                  {formatDateTime(d.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Overflow summary */}
      {hidden > 0 && (
        <p className="mt-3 text-xs text-ink-400 text-center">
          +{hidden} more supporter{hidden !== 1 ? "s" : ""} not shown
        </p>
      )}
    </section>
  );
}
