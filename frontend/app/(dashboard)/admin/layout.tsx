import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
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

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const user = await fetchMe();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") {
    // Redirect non-admins to their own area
    if (user.role === "event_manager") redirect("/manager");
    if (user.role === "runner") redirect("/runner");
    redirect("/");
  }
  return <>{children}</>;
}
