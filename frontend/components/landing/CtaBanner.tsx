import Link from "next/link";
import { ArrowRight, Heart, Footprints, Building2, Check } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";

export interface CtaContent {
  eyebrow: string;
  heading: string;
  subtitle: string;
}

export interface CtaStats {
  raisedThisMonth: number;
  newRunnersThisMonth: number;
  donorsThisMonth: number;
  activeEvents: number;
}

const DEFAULTS: CtaContent = {
  eyebrow: "Ready when you are",
  heading: "Three ways to start.\nThe next event you fund\ncould change a life.",
  subtitle:
    "Sign up as a runner, host an event for your NGO, or sponsor a cause that matters. Ninety seconds either way.",
};

const DEFAULT_VALUE_PROPS = [
  "Free to start — no platform fees on your first event",
  "80G receipts auto-issued for eligible donations",
  "Public audit page for every rupee, every event",
];

function fmtInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(0)}K`;
  return `₹${amount}`;
}

export function CtaBanner({
  content,
  stats,
  valueProps,
}: {
  content?: Partial<CtaContent>;
  stats?: CtaStats;
  valueProps?: string[];
}): React.ReactNode {
  const c = { ...DEFAULTS, ...(content ?? {}) };
  const props =
    valueProps && valueProps.length > 0 ? valueProps : DEFAULT_VALUE_PROPS;
  const liveAmount = stats ? fmtInr(stats.raisedThisMonth) : "—";
  const newRunners = stats ? stats.newRunnersThisMonth : 0;
  const donors = stats ? stats.donorsThisMonth : 0;
  const activeEvents = stats ? stats.activeEvents : 0;
  return (
    <section className="section">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-canvas-subtle via-white to-primary-50 px-6 py-14 md:px-16 md:py-20">
            {/* Decorative blurred orbs */}
            <div
              className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-primary-300/30 blur-3xl"
              aria-hidden
            />
            <div
              className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-secondary-300/20 blur-3xl"
              aria-hidden
            />
            {/* Subtle grid texture */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              aria-hidden
              style={{
                backgroundImage:
                  "radial-gradient(rgba(26,22,18,1) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                maskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              }}
            />

            <div className="relative grid lg:grid-cols-12 gap-10 items-center">
              {/* LEFT — heading + value props + CTAs */}
              <div className="lg:col-span-7">
                <span className="eyebrow">{c.eyebrow}</span>
                <h2 className="mt-4 font-display font-medium text-display-xl text-ink-900 leading-[1.05] whitespace-pre-line">
                  {c.heading}
                </h2>
                <p className="mt-5 text-base md:text-lg text-ink-600 max-w-xl leading-relaxed">
                  {c.subtitle}
                </p>

                {/* Value props */}
                <ul className="mt-6 space-y-2.5">
                  {props.map((prop) => (
                    <li
                      key={prop}
                      className="flex items-start gap-3 text-sm text-ink-700"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary-500 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                      {prop}
                    </li>
                  ))}
                </ul>

                {/* Three CTAs — each gets 3D mouse tilt */}
                <div className="mt-9 grid sm:grid-cols-3 gap-3">
                  <Tilt3D max={8} scale={1.04} className="h-full">
                    <Link
                      href="/register?role=runner"
                      className="group flex flex-col items-start gap-2 px-5 py-4 bg-primary-500 hover:bg-primary-600 hover:shadow-glow text-white transition-all active:scale-[0.97] clip-parallelogram h-full"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Footprints
                        className="w-5 h-5"
                        style={{ transform: "translateZ(20px)" }}
                      />
                      <div style={{ transform: "translateZ(15px)" }}>
                        <p className="font-semibold text-sm">As a runner</p>
                        <p className="text-xs text-white/80 mt-0.5">
                          Raise per km
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 mt-1 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </Link>
                  </Tilt3D>

                  <Tilt3D max={8} scale={1.04} className="h-full">
                    <Link
                      href="/register?role=event_manager"
                      className="group flex flex-col items-start gap-2 px-5 py-4 bg-ink-900 hover:bg-ink-800 text-white transition-all active:scale-[0.97] clip-parallelogram h-full"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Building2
                        className="w-5 h-5"
                        style={{ transform: "translateZ(20px)" }}
                      />
                      <div style={{ transform: "translateZ(15px)" }}>
                        <p className="font-semibold text-sm">As an NGO</p>
                        <p className="text-xs text-white/70 mt-0.5">
                          Host an event
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 mt-1 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </Link>
                  </Tilt3D>

                  <Tilt3D max={8} scale={1.04} className="h-full">
                    <Link
                      href="/events"
                      className="group flex flex-col items-start gap-2 px-5 py-4 bg-white border border-ink-200 hover:border-ink-400 text-ink-900 transition-all active:scale-[0.97] clip-parallelogram h-full"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Heart
                        className="w-5 h-5 text-primary-500"
                        style={{ transform: "translateZ(20px)" }}
                      />
                      <div style={{ transform: "translateZ(15px)" }}>
                        <p className="font-semibold text-sm">As a donor</p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          Sponsor a runner
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 mt-1 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </Link>
                  </Tilt3D>
                </div>
              </div>

              {/* RIGHT — live stat collage with 3D depth */}
              <div className="lg:col-span-5">
                <Tilt3D max={6} scale={1.02} className="relative">
                  {/* Main card */}
                  <div
                    className="card p-6 md:p-7 relative overflow-hidden"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div
                      className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary-100/60 blur-2xl"
                      aria-hidden
                    />
                    <div
                      className="relative"
                      style={{ transform: "translateZ(30px)" }}
                    >
                      <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] uppercase text-primary-600 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                        Live this month
                      </div>
                      <p className="font-display text-display-lg text-ink-900 tabular leading-none">
                        {liveAmount}
                      </p>
                      <p className="mt-1 text-sm text-ink-500">
                        raised across {activeEvents} active{" "}
                        {activeEvents === 1 ? "event" : "events"}
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-4 pt-5 border-t border-ink-100">
                        <div>
                          <p className="font-mono font-bold text-2xl text-ink-900 tabular leading-none">
                            {newRunners.toLocaleString("en-IN")}
                          </p>
                          <p className="font-condensed text-[10px] uppercase tracking-[0.18em] text-ink-500 mt-1.5 font-semibold">
                            New runners
                          </p>
                        </div>
                        <div>
                          <p className="font-mono font-bold text-2xl text-ink-900 tabular leading-none">
                            {donors.toLocaleString("en-IN")}
                          </p>
                          <p className="font-condensed text-[10px] uppercase tracking-[0.18em] text-ink-500 mt-1.5 font-semibold">
                            Donors
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating chips — pulled forward in 3D for parallax */}
                  <div
                    className="hidden md:block absolute -top-4 -right-3 px-3 py-2 rounded-xl bg-secondary-500 text-white shadow-lift rotate-3"
                    style={{ transform: "translateZ(50px) rotate(3deg)" }}
                  >
                    <p className="font-condensed text-[10px] font-bold uppercase tracking-[0.18em]">
                      ✓ Verified NGOs
                    </p>
                  </div>

                  <div
                    className="hidden md:block absolute -bottom-4 -left-3 px-3 py-2 rounded-xl bg-ink-900 text-white shadow-lift -rotate-2"
                    style={{ transform: "translateZ(60px) rotate(-2deg)" }}
                  >
                    <p className="font-condensed text-[10px] font-bold uppercase tracking-[0.18em]">
                      80G receipts auto
                    </p>
                  </div>
                </Tilt3D>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
