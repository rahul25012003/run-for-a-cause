import { CanvasParticles } from "@/components/shared/CanvasParticles";
import { LiveAuditFeed } from "@/components/landing/LiveAuditFeed";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import type { FeedItem } from "@/lib/hooks/useSiteSettings";

export interface DarkStoryStats {
  raisedThisMonth: number;
  raisedTotal: number;
  activeEvents: number;
  totalEvents: number;
  totalOrganisations: number;
}

function fmtInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(0)}K`;
  return `₹${amount}`;
}

export function DarkStorySection({
  stats,
  feed,
}: {
  stats?: DarkStoryStats;
  feed?: FeedItem[];
}): React.ReactNode {
  return (
    <section
      className="relative section bg-ink-900 text-white overflow-hidden"
      style={{
        clipPath: "polygon(0 3%, 100% 0, 100% 97%, 0 100%)",
        WebkitClipPath: "polygon(0 3%, 100% 0, 100% 97%, 0 100%)",
        marginTop: "-30px",
        marginBottom: "-30px",
        paddingTop: "calc(8rem + 30px)",
        paddingBottom: "calc(8rem + 30px)",
      }}
    >
      <div className="absolute inset-0 opacity-90 pointer-events-none">
        <CanvasParticles density={120} color="#ED6C0F" />
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 30% 50%, rgba(237,108,15,0.18), transparent 70%), radial-gradient(ellipse 60% 60% at 80% 30%, rgba(45,106,79,0.15), transparent 70%)",
        }}
      />

      <div className="container-page relative grid lg:grid-cols-12 gap-12 items-center">
        <Reveal className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] uppercase text-primary-300">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            What we&apos;re changing
          </span>
          <h2 className="mt-6 font-display font-medium text-display-xl text-white leading-[1.05]">
            Most giving platforms ask donors to{" "}
            <em className="not-italic text-primary-300">trust</em>.
            <br />
            We make trust{" "}
            <em className="not-italic text-primary-300">earnable</em>.
          </h2>
          <p className="mt-7 max-w-xl text-lg text-white/70 leading-relaxed">
            From the moment your card is charged to the moment a girl walks
            into school, every step is logged, verified, and visible. The
            platform doesn&apos;t hide the receipts — it publishes them.
          </p>
          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            <Tilt3D max={5} scale={1.02} className="h-full">
              <Stat
                label="Raised so far"
                value={stats ? fmtInr(stats.raisedTotal) : "—"}
                sub={`across ${stats?.totalEvents ?? 0} events`}
              />
            </Tilt3D>
            <Tilt3D max={5} scale={1.02} className="h-full">
              <Stat
                label="This month"
                value={stats ? fmtInr(stats.raisedThisMonth) : "—"}
                sub={`for ${stats?.activeEvents ?? 0} live events`}
              />
            </Tilt3D>
            <Tilt3D max={5} scale={1.02} className="h-full">
              <Stat
                label="Verified NGOs"
                value={stats ? String(stats.totalOrganisations) : "—"}
                sub="every cause is KYC-checked"
              />
            </Tilt3D>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="lg:col-span-5">
          <Tilt3D max={4} scale={1.015} className="h-full">
            <div style={{ transformStyle: "preserve-3d" }}>
              <LiveAuditFeed feed={feed} />
            </div>
          </Tilt3D>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}): React.ReactNode {
  return (
    <div className="border-l border-white/10 pl-4">
      <p className="text-[11px] font-bold tracking-wider uppercase text-white/50">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-primary-300 tabular">
        {value}
      </p>
      <p className="text-xs text-white/50 mt-1 leading-tight">{sub}</p>
    </div>
  );
}
