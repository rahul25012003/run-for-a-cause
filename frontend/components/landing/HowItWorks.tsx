import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { resolveIcon } from "@/lib/iconMap";
import { Calendar } from "lucide-react";

export interface HowItWorksStep {
  icon: string;
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
}

export interface HowItWorksContent {
  eyebrow: string;
  heading: string;
  subtitle: string;
}

const DEFAULTS: HowItWorksContent = {
  eyebrow: "How it works",
  heading: "Four steps. Zero opacity. Every rupee accounted for.",
  subtitle:
    "Most giving platforms ask for trust. We make it earnable — with verification at the start, escrow in the middle, and a public audit page at the end.",
};

const DEFAULT_STEPS: HowItWorksStep[] = [
  {
    icon: "Calendar",
    title: "NGO opens an event",
    body: "PAN, GST, and 80G are verified before the event ever goes live. Bank accounts are validated by penny-drop. Donors only see what's earned trust.",
    metric: "100%",
    metricLabel: "of NGOs are KYC-verified",
  },
  {
    icon: "Footprints",
    title: "Runner builds their page",
    body: "Personal story, distance pledge, shareable URL. Every kilometre is logged with proof — Strava, Apple Health, or screenshot. Approval before it counts.",
    metric: "1 km",
    metricLabel: "= one promise kept",
  },
  {
    icon: "HandHeart",
    title: "Donors sponsor every km",
    body: "Pay per km up to a cap, or give a fixed amount. Money sits in escrow — not in the NGO's account — until distance is verified and the event closes.",
    metric: "₹0",
    metricLabel: "released without verification",
  },
  {
    icon: "Eye",
    title: "The audit page tells all",
    body: "Gross raised, platform fee, gateway fee, net payout, bank UTR, utilisation report. Public. Permanent. No login required.",
    metric: "100%",
    metricLabel: "publicly traceable",
  },
];

export function HowItWorks({
  content,
  steps,
}: {
  content?: Partial<HowItWorksContent>;
  steps?: HowItWorksStep[];
}): React.ReactNode {
  const c = { ...DEFAULTS, ...(content ?? {}) };
  const items = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  return (
    <section
      id="how-it-works"
      className="relative section bg-canvas-subtle border-y border-ink-100 overflow-hidden scroll-mt-20"
    >
      <div className="container-page relative">
        <header className="mb-16 md:mb-20 animate-fade-in">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2 className="mt-4 font-display font-medium text-display-lg text-ink-900 max-w-3xl">
            {c.heading}
          </h2>
          <p className="mt-5 max-w-2xl body-lg">{c.subtitle}</p>
        </header>

        <div className="space-y-6">
          {items.map((step, i) => {
            const Icon = resolveIcon(step.icon, Calendar);
            return (
              <Reveal key={`${step.title}-${i}`} delay={i * 0.05}>
                <Tilt3D max={3} scale={1.008} className="group">
                  <article
                    className="card relative grid md:grid-cols-12 gap-6 p-8 md:p-10 hover:shadow-lift transition-all duration-300 overflow-hidden"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <p
                      className="absolute -bottom-12 -right-6 font-condensed italic font-black leading-none text-outline-thick pointer-events-none select-none transition-transform duration-500 group-hover:-translate-y-2"
                      style={{
                        fontSize: "clamp(140px, 16vw, 240px)",
                        color: "#FFE4CB",
                        opacity: 0.7,
                        transform: "translateZ(20px)",
                      }}
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <div
                      className="md:col-span-1 flex md:block items-center gap-4 md:gap-0 relative z-10"
                      style={{ transform: "translateZ(40px)" }}
                    >
                      <span className="font-condensed font-semibold text-[11px] uppercase tracking-[0.22em] text-ink-500">
                        Step {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="md:mt-3 w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-soft clip-parallelogram-sm group-hover:shadow-glow transition-shadow duration-300">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div
                      className="md:col-span-7 relative z-10"
                      style={{ transform: "translateZ(30px)" }}
                    >
                      <h3 className="font-display text-2xl text-ink-900 leading-tight">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-ink-600 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                    <div
                      className="md:col-span-4 md:border-l md:border-ink-100 md:pl-8 flex flex-col justify-center relative z-10"
                      style={{ transform: "translateZ(35px)" }}
                    >
                      <p className="font-display text-display-md text-secondary-600 tabular leading-none">
                        {step.metric}
                      </p>
                      <p className="mt-2 font-condensed font-semibold text-[11px] uppercase tracking-[0.22em] text-ink-500">
                        {step.metricLabel}
                      </p>
                    </div>
                  </article>
                </Tilt3D>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
