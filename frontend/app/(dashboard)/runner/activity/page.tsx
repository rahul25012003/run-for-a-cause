import { cookies } from "next/headers";
import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchNotifications(): Promise<Notification[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];
  try {
    const res = await fetch(`${apiUrl}/notifications/?limit=50`, {
      headers: { Cookie: `access_token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Notification[];
  } catch {
    return [];
  }
}

function fmt(iso: string): string {
  return formatDateTime(iso);
}

export default async function RunnerActivityPage(): Promise<React.ReactNode> {
  const items = await fetchNotifications();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary-500" aria-hidden />
        <div>
          <h1 className="font-display text-3xl text-ink-900">Activity</h1>
          <p className="text-ink-600">
            Approvals, donations, badges and announcements relevant to you.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="inbox"
            title="Nothing yet"
            description="When someone donates, your distance is approved, or you unlock a badge — it'll show up here."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const isUnread = !n.read_at;
            const Wrapper = ({ children }: { children: React.ReactNode }) =>
              n.action_url ? (
                <Link
                  href={n.action_url}
                  className="block card card-hover transition"
                >
                  {children}
                </Link>
              ) : (
                <div className="card">{children}</div>
              );
            return (
              <li key={n.id}>
                <Wrapper>
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                        isUnread ? "bg-primary-500" : "bg-ink-100"
                      }`}
                      aria-label={isUnread ? "unread" : "read"}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`${
                          isUnread ? "font-semibold text-ink-900" : "text-ink-700"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="text-sm text-ink-600 mt-0.5">{n.body}</p>
                      <p className="eyebrow text-ink-400 mt-2">
                        {fmt(n.created_at)}
                      </p>
                    </div>
                  </div>
                </Wrapper>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
