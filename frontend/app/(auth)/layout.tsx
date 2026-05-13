import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";
import { ShieldCheck, Quote } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      {/* LEFT — editorial story panel with photo */}
      <div className="hidden lg:flex relative overflow-hidden bg-ink-900 text-white">
        <Image
          src="https://images.unsplash.com/photo-1517649763962-0c623066013b?w=2400&q=85"
          alt=""
          fill
          className="object-cover opacity-55"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900/85 via-ink-900/50 to-primary-900/40" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <Logo variant="light" />

          <blockquote className="max-w-md">
            <Quote className="w-10 h-10 text-primary-400 mb-5" />
            <p className="font-display text-3xl xl:text-4xl leading-tight">
              I ran 100 km in March. Forty-seven friends sponsored me.
              Together, we sent twelve girls to school for a year.
            </p>
            <footer className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-display font-bold">
                R
              </div>
              <div>
                <p className="font-medium text-sm">Ravi Kumar</p>
                <p className="text-xs text-white/60">
                  Run for Education 2026 · ₹47,300 raised
                </p>
              </div>
            </footer>
          </blockquote>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-medium w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary-300" />
            18,000+ runners · ₹2.4 Cr raised · 240+ events
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex flex-col px-6 sm:px-12 lg:px-16 py-8">
        <div className="flex items-center justify-between">
          {/* Logo is already a <Link> internally — don't double-wrap it. */}
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            href="/"
            className="ml-auto text-sm text-ink-500 hover:text-ink-900 transition"
          >
            ← Back to home
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-xs text-ink-400 text-center">
          Protected by industry-standard encryption · DPDP-aware
        </p>
      </div>
    </div>
  );
}
