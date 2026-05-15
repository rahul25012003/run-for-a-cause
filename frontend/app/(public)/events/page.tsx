import type { Metadata } from "next";
import { EventsBrowser } from "./EventsBrowser";
import { PageHero } from "@/components/shared/PageHero";
import { fetchPublicSettings, timedFetch } from "@/lib/hooks/useSiteSettings";
import type { EventPublic } from "@/types";

export const metadata: Metadata = {
  title: "Browse all events",
  description: "Find a run event aligned with a cause you care about.",
};

async function fetchEvents(): Promise<EventPublic[]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const res = await timedFetch(`${apiUrl}/events/?limit=50`, {
    next: { revalidate: 60 },
  });
  if (!res || !res.ok) return [];
  try {
    return (await res.json()) as EventPublic[];
  } catch {
    return [];
  }
}

export default async function EventsPage(): Promise<React.ReactNode> {
  const [events, s] = await Promise.all([
    fetchEvents(),
    fetchPublicSettings(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="All events"
        heading={s["events.heading"] || "Browse events"}
        subtitle={
          s["events.subtitle"] ||
          "Verified NGOs hosting cause-driven runs. Pick one that resonates."
        }
      />

      <section className="container-page py-12 md:py-16">
        <EventsBrowser initialEvents={events} />
      </section>
    </>
  );
}
