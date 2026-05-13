import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHero } from "@/components/shared/PageHero";
import { MapClientWrapper } from "@/components/map/MapClientWrapper";
import { fetchPublicSettings } from "@/lib/hooks/useSiteSettings";
import type { EventMapPin } from "@/types";

export const metadata: Metadata = {
  title: "Find events near you",
  description:
    "Discover charity run events across India. Tap a city to see who's running for which cause.",
};

async function fetchPins(): Promise<EventMapPin[]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  try {
    const res = await fetch(`${apiUrl}/events/map`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    return (await res.json()) as EventMapPin[];
  } catch {
    return [];
  }
}

export default async function MapPage(): Promise<React.ReactNode> {
  const [pins, s] = await Promise.all([fetchPins(), fetchPublicSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Discover"
        heading={s["map.heading"] || "Find events near you"}
        subtitle={
          s["map.subtitle"] ||
          "Every dot is a verified NGO running a fundraiser. Pan, zoom, and tap to learn more."
        }
      />
      <section className="container-page py-12 md:py-16">
        {pins.length === 0 ? (
          <div className="card">
            <EmptyState
              illustration="events"
              title="No mapped events yet"
              description="As organisations publish events with a city, they'll appear here. (Managers: add a city in event setup.)"
            />
          </div>
        ) : (
          <>
            <p className="eyebrow mb-4 text-ink-500">
              {pins.length} event{pins.length === 1 ? "" : "s"} mapped
            </p>
            <MapClientWrapper pins={pins} />
          </>
        )}
      </section>
    </>
  );
}
