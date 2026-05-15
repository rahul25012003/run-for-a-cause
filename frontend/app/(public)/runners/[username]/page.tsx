import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RunnerProfile } from "@/components/runner/RunnerProfile";
import { AwarenessBlocks } from "@/components/runner/AwarenessBlocks";
import type {
  DonationPublic,
  EventDetail,
  RunnerProfilePublic,
  UserPublic,
} from "@/types";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchRunner(slug: string): Promise<RunnerProfilePublic | null | "unavailable"> {
  try {
    const res = await fetch(`${apiUrl}/runners/${slug}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return "unavailable";
    return (await res.json()) as RunnerProfilePublic;
  } catch {
    return "unavailable";
  }
}

async function fetchEvent(eventId: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${apiUrl}/events/by-id/${eventId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      const list = await fetch(`${apiUrl}/events/?limit=100`);
      if (list.ok) {
        const events = (await list.json()) as EventDetail[];
        const found = events.find((e) => e.id === eventId);
        if (found) {
          const detail = await fetch(`${apiUrl}/events/${found.slug}`);
          if (detail.ok) return (await detail.json()) as EventDetail;
        }
      }
      return null;
    }
    return (await res.json()) as EventDetail;
  } catch {
    return null;
  }
}

async function fetchDonations(runnerId: string): Promise<DonationPublic[]> {
  try {
    const res = await fetch(`${apiUrl}/donations/by-runner/${runnerId}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    return (await res.json()) as DonationPublic[];
  } catch {
    return [];
  }
}

async function fetchUser(userId: string): Promise<UserPublic | null> {
  // The public runner endpoint doesn't expose the runner's name, so we fetch
  // it from a side endpoint when needed. In a fuller build this would be
  // bundled into a single response.
  void userId;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const runner = await fetchRunner(username);
  if (!runner) return { title: "Runner not found" };
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";
  const name = runner.public_slug
    .replace(/-[a-z0-9]+$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const ogImage = `${siteUrl}/og/runner/${username}`;
  const description = runner.personal_story?.slice(0, 160) ?? undefined;
  return {
    title: `Sponsor ${name}`,
    description,
    openGraph: {
      title: `Sponsor ${name}`,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `Sponsor ${name}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function RunnerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<React.ReactNode> {
  const { username } = await params;
  const runnerResult = await fetchRunner(username);
  if (!runnerResult) notFound();
  if (runnerResult === "unavailable") {
    // Backend is cold-starting on Render free tier — show retry page
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
            Hold on…
          </p>
          <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
            Server is warming up
          </h1>
          <p className="mt-3 text-ink-500">
            Our server is waking from sleep. Come back in 15–30 seconds and
            the runner profile will be ready.
          </p>
          <Link href={`/runners/${username}`} className="btn-primary inline-flex mt-5">
            Refresh now
          </Link>
        </div>
      </div>
    );
  }
  const runner = runnerResult;

  const event = await fetchEvent(runner.event_id);
  if (!event) notFound();

  const donations = await fetchDonations(runner.id);

  const ownerName = await fetchUser(runner.user_id).then(
    (u) =>
      u?.full_name ??
      runner.public_slug
        .replace(/-[a-z0-9]+$/, "")
        .split("-")
        .slice(0, 2)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" "),
  );

  const shareUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000"}/runners/${runner.public_slug}`;

  // Server-rendered awareness section (server fetch of cause). RunnerProfile
  // is a client component, so pass the rendered tree as a slot.
  const awareness = <AwarenessBlocks causeId={event.cause_id} />;

  return (
    <RunnerProfile
      runner={runner}
      event={event}
      donations={donations}
      ownerName={ownerName}
      shareUrl={shareUrl}
      awarenessSlot={awareness}
    />
  );
}
