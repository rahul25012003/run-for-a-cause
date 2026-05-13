import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import type { EventPublic } from "@/types";

async function fetchFeatured(): Promise<EventPublic[]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  try {
    const res = await fetch(`${apiUrl}/events/?limit=6`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as EventPublic[];
  } catch {
    return [];
  }
}

export async function FeaturedEvents(): Promise<React.ReactNode> {
  const events = await fetchFeatured();
  return (
    <section className="section relative overflow-hidden">
      {/* Decorative outlined word — adds depth and editorial feel */}
      <div
        className="absolute right-0 top-12 select-none pointer-events-none hidden lg:block"
        aria-hidden
      >
        <p
          className="font-condensed italic font-black leading-none tracking-[-0.02em] text-outline-thick"
          style={{
            fontSize: "clamp(160px, 18vw, 300px)",
            color: "#FFE4CB",
            opacity: 0.45,
          }}
        >
          LIVE
        </p>
      </div>
      <div className="container-page relative">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-14 flex-wrap">
            <div className="max-w-xl">
              <span className="eyebrow">Live now</span>
              <h2 className="mt-4 font-display font-medium text-display-lg text-ink-900">
                Causes you can join — or sponsor — today.
              </h2>
            </div>
            <Link href="/events" className="btn-link">
              All events
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        {events.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No events yet"
              description="Run the seed script to populate sample events for development."
            />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.slice(0, 6).map((event, i) => (
              <Reveal key={event.id} delay={i * 0.05}>
                <Tilt3D max={5} scale={1.015} className="h-full">
                  <EventCard event={event} />
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
