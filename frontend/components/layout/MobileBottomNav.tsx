"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Heart,
  Building2,
  Users,
  PlusCircle,
  Bell,
  UserCircle2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Top 5 destinations per role. Anything beyond goes via /account → settings drawer.
const TABS: Record<UserRole, NavItem[]> = {
  super_admin: [
    { href: "/admin", label: "Home", icon: LayoutDashboard },
    { href: "/admin/events", label: "Events", icon: Calendar },
    { href: "/manager/events/new", label: "Create", icon: PlusCircle },
    { href: "/admin/organisations", label: "Orgs", icon: Building2 },
    { href: "/account", label: "Me", icon: UserCircle2 },
  ],
  event_manager: [
    { href: "/manager", label: "Home", icon: LayoutDashboard },
    { href: "/manager/events", label: "Events", icon: Calendar },
    { href: "/manager/events/new", label: "Create", icon: PlusCircle },
    { href: "/manager/organisation", label: "NGO", icon: Building2 },
    { href: "/account", label: "Me", icon: UserCircle2 },
  ],
  runner: [
    { href: "/runner", label: "Home", icon: LayoutDashboard },
    { href: "/runner/distance", label: "Log km", icon: Activity },
    { href: "/runner/donors", label: "Sponsors", icon: Heart },
    { href: "/runner/activity", label: "Activity", icon: Bell },
    { href: "/account", label: "Me", icon: UserCircle2 },
  ],
  donor: [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/me/donations", label: "Donations", icon: Heart },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/runners", label: "Runners", icon: Users },
    { href: "/account", label: "Me", icon: UserCircle2 },
  ],
};

export function MobileBottomNav({ role }: { role: UserRole }): React.ReactNode {
  const pathname = usePathname();
  const items = TABS[role] ?? TABS.runner;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-ink-100 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/manager" &&
              item.href !== "/runner" &&
              item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-condensed font-semibold tracking-wider uppercase transition-colors",
                  active ? "text-primary-600" : "text-ink-500",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="w-5 h-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
