import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/shared/Badge";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { formatCompactInr } from "@/lib/utils";
import { fetchPublicSettings, timedFetch } from "@/lib/hooks/useSiteSettings";

interface CausePublic {
  id: string;
  organisation_id: string;
  title: string;
  slug: string;
  summary: string;
  cover_image_url: string | null;
  total_raised_lifetime: string;
  total_events_hosted: number;
}

export const metadata: Metadata = {
  title: "Causes",
  description: "Long-running causes powered by verified Indian NGOs.",
};

async function fetchCauses(): Promise<CausePublic[]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const res = await timedFetch(`${apiUrl}/causes/`, { next: { revalidate: 60 } });
  if (!res || !res.ok) return [];
  try {
    return (await res.json()) as CausePublic[];
  } catch {
    return [];
  }
}

export default async function CausesPage(): Promise<React.ReactNode> {
  const [causes, s] = await Promise.all([
    fetchCauses(),
    fetchPublicSettings(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Causes"
        heading={s["causes.heading"] || "Causes"}
        subtitle={
          s["causes.subtitle"] ||
          "Each cause is a long-term commitment. Multiple events. One mission."
        }
        variant="secondary"
      />

      <section className="container-page py-12 md:py-16">
        {causes.length === 0 ? (
          <div className="card">
            <EmptyState title="No causes yet" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {causes.map((cause, i) => (
              <Reveal key={cause.id} delay={i * 0.07}>
                <Tilt3D max={4} scale={1.015} className="h-full">
                  <Link
                    href={`/causes/${cause.slug}`}
                    className="card-hover p-6 md:p-7 block h-full transition"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <Badge variant="success">
                      {cause.total_events_hosted} events
                    </Badge>
                    <h3 className="mt-3 font-display text-2xl text-ink-900 leading-snug">
                      {cause.title}
                    </h3>
                    <p className="mt-2 text-ink-600 leading-relaxed">
                      {cause.summary}
                    </p>
                    <div className="mt-5 pt-5 border-t border-ink-100 flex items-center justify-between">
                      <p className="text-xs text-ink-500 font-condensed uppercase tracking-wider">
                        Lifetime raised
                      </p>
                      <p className="font-mono font-bold text-ink-900 tabular text-lg">
                        {formatCompactInr(cause.total_raised_lifetime)}
                      </p>
                    </div>
                  </Link>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
