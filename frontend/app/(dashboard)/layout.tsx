import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NotificationsBell } from "@/components/shared/NotificationsBell";
import type { UserPublic } from "@/types";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchMe(): Promise<UserPublic | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { Cookie: `access_token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as UserPublic;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const user = await fetchMe();
  if (!user) redirect("/login");

  return (
    <div className="flex bg-canvas-subtle min-h-screen">
      <DashboardSidebar role={user.role} userName={user.full_name} />
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar with notifications */}
        <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-xl border-b border-ink-100 px-6 md:px-10 py-3 flex items-center justify-end gap-3">
          <span className="hidden md:inline text-xs font-condensed font-semibold tracking-[0.18em] uppercase text-ink-500">
            {user.role.replace("_", " ")}
          </span>
          <NotificationsBell />
        </header>
        <div className="flex-1 min-w-0 pb-20 md:pb-0">{children}</div>
      </main>
      <MobileBottomNav role={user.role} />
    </div>
  );
}
