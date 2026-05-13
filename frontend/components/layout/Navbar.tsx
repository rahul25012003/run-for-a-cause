"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Events", href: "/events" },
  { label: "Causes", href: "/causes" },
  { label: "Organisers", href: "/organisations" },
  { label: "Transparency", href: "/transparency" },
  { label: "About", href: "/about" },
];

export function Navbar(): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-200",
        scrolled
          ? "bg-canvas/85 backdrop-blur-xl border-b border-ink-100"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="container-page flex items-center justify-between h-16 md:h-20">
        <Logo />
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition",
                  active
                    ? "text-ink-900"
                    : "text-ink-600 hover:text-ink-900 hover:bg-ink-50 rounded-lg",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="btn-ghost btn-sm">Sign in</Link>
          <Link href="/register" className="btn-primary btn-sm">Start running</Link>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 rounded-lg hover:bg-ink-50"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-ink-100 bg-canvas animate-slide-down">
          <nav className="container-page py-5 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base text-ink-800 py-3 px-3 rounded-lg hover:bg-ink-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3 mt-3 border-t border-ink-100">
              <Link href="/login" className="btn-secondary btn-sm flex-1">Sign in</Link>
              <Link href="/register" className="btn-primary btn-sm flex-1">Start running</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
