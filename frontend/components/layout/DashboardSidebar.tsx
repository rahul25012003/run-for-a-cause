"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Users,
  Heart,
  Activity,
  PlusCircle,
  Wallet,
  LogOut,
  Settings,
  FileEdit,
  UserCircle2,
  Lightbulb,
  PencilLine,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: Record<UserRole, NavItem[]> = {
  super_admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/events", label: "Events", icon: Calendar },
    { href: "/manager/events/new", label: "Create event", icon: PlusCircle },
    { href: "/manager/causes", label: "Causes", icon: Lightbulb },
    { href: "/admin/organisations", label: "Organisers", icon: Building2 },
    { href: "/admin/runners", label: "Runners", icon: Users },
    { href: "/admin/donations", label: "Donations", icon: Heart },
    { href: "/admin/payouts", label: "Payouts", icon: Wallet },
    { href: "/admin/content", label: "Site content", icon: FileEdit },
    { href: "/account", label: "My account", icon: UserCircle2 },
  ],
  event_manager: [
    { href: "/manager", label: "Overview", icon: LayoutDashboard },
    { href: "/manager/events", label: "My events", icon: Calendar },
    { href: "/manager/events/new", label: "Create event", icon: PlusCircle },
    { href: "/manager/causes", label: "Causes", icon: Lightbulb },
    { href: "/manager/organisation", label: "Organiser", icon: Building2 },
    { href: "/account", label: "My account", icon: UserCircle2 },
  ],
  runner: [
    { href: "/runner", label: "Dashboard", icon: LayoutDashboard },
    { href: "/runner/events", label: "My events", icon: Calendar },
    { href: "/runner/distance", label: "Log distance", icon: Activity },
    { href: "/runner/donors", label: "My sponsors", icon: Heart },
    { href: "/runner/profile", label: "Runner profile", icon: Settings },
    { href: "/account", label: "My account", icon: UserCircle2 },
  ],
  donor: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/me/donations", label: "My donations", icon: Heart },
    { href: "/account", label: "My account", icon: UserCircle2 },
  ],
};

export function DashboardSidebar({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const items = NAV[role] ?? NAV.runner;

  const handleLogout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
    }
  };

  return (
    <aside className="hidden md:flex w-64 bg-canvas-subtle border-r border-ink-100 flex-col h-screen sticky top-0">
      <div className="p-5">
        <Logo />
      </div>
      <div className="px-3">
        <p className="px-3 mt-4 mb-2 text-[10px] font-bold tracking-[0.18em] uppercase text-ink-400">
          {role.replace("_", " ")}
        </p>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/manager" &&
              item.href !== "/runner" &&
              pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white text-ink-900 shadow-soft"
                  : "text-ink-600 hover:bg-white/60 hover:text-ink-900",
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4",
                  active ? "text-primary-600" : "text-ink-400",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-ink-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900 truncate">
              {userName}
            </p>
            <p className="text-[11px] text-ink-400 capitalize leading-none mt-0.5">
              {role.replace("_", " ")}
            </p>
          </div>
          <Link
            href="/account"
            title="Edit profile"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-400 hover:text-primary-600 hover:bg-white/80 transition flex-shrink-0"
          >
            <PencilLine className="w-3.5 h-3.5" />
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full mt-1 px-3 py-2 text-sm text-ink-500 hover:text-ink-900 hover:bg-white/60 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
