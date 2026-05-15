import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { resolveIcon } from "@/lib/iconMap";
import { ShieldCheck } from "lucide-react";

export interface TrustItem {
  icon: string;
  title: string;
  body: string;
}

export interface TrustStripContent {
  eyebrow: string;
  heading: string;
  subtitle: string;
  testimonialQuote: string;
  testimonialAuthor: string;
  testimonialRole: string;
}

const DEFAULTS: TrustStripContent = {
  eyebrow: "Built on trust",
  heading: "Donors don't need faith.\nThey need proof.",
  subtitle:
    "Most platforms ask donors to trust them. We make trust earnable — at every stage, with every rupee.",
  testimonialQuote:
    "The only fundraising platform where I can show my donors exactly where their money went, before they ask.",
  testimonialAuthor: "Sneha M.",
  testimonialRole: "Asha Foundation",
};

const DEFAULT_ITEMS: TrustItem[] = [
  {
    icon: "ShieldCheck",
    title: "Verified NGOs only",
    body: "PAN, GST, and 80G are checked before any organisation can collect a rupee.",
  },
  {
    icon: "Lock",
    title: "Escrow-protected funds",
    body: "Donations sit in platform escrow until distance is verified and the event closes.",
  },
  {
    icon: "FileSpreadsheet",
    title: "Public audit page",
    body: "Gross raised, fees, payout UTR, utilisation report — visible to anyone, no login.",
  },
  {
    icon: "BadgeCheck",
    title: "80G receipts",
    body: "Auto-generated and emailed for every eligible donation. Nothing manual.",
  },
];

export function TrustStrip({
  content,
  items,
}: {
  content?: Partial<TrustStripContent>;
  items?: TrustItem[];
}): React.ReactNode {
  const overrides = Object.fromEntries(
    Object.entries(content ?? {}).filter(([, v]) => v !== undefined && v !== ""),
  ) as Partial<TrustStripContent>;
  const c = { ...DEFAULTS, ...overrides };
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;
  // Heading may have multiple lines; render with <br /> on the second part.
  const headingLines = c.heading.split("\n");

  return (
    <section
      className="section bg-ink-900 text-white relative overflow-hidden"
      style={{
        clipPath: "polygon(0 3%, 100% 0, 100% 97%, 0 100%)",
        WebkitClipPath: "polygon(0 3%, 100% 0, 100% 97%, 0 100%)",
        marginTop: "-30px",
        marginBottom: "-30px",
        paddingTop: "calc(8rem + 30px)",
        paddingBottom: "calc(8rem + 30px)",
      }}
    >
      <p
        className="absolute -right-8 top-12 font-condensed italic font-black leading-none text-outline-thick pointer-events-none select-none hidden lg:block"
        style={{
          fontSize: "clamp(220px, 26vw, 420px)",
          color: "rgba(237,108,15,0.15)",
        }}
        aria-hidden
      >
        TRUST
      </p>

      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(rgba(237,108,15,0.4) 0%, transparent 50%)",
          backgroundPosition: "20% 20%",
          backgroundSize: "60% 60%",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="container-page relative">
        <Reveal>
          <div className="grid md:grid-cols-12 gap-12 items-end">
            <div className="md:col-span-7">
              <span className="eyebrow text-primary-300">{c.eyebrow}</span>
              <h2 className="mt-4 font-display font-medium text-display-lg leading-[1.05]">
                {headingLines.map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {i === headingLines.length - 1 && headingLines.length > 1 ? (
                      <em className="not-italic text-primary-400">{line}</em>
                    ) : (
                      line
                    )}
                  </span>
                ))}
              </h2>
              <p className="mt-6 max-w-lg text-lg text-white/70 leading-relaxed">
                {c.subtitle}
              </p>
            </div>
            <div className="md:col-span-5">
              <blockquote className="text-xl font-display italic leading-relaxed text-white/85 border-l-2 border-primary-400 pl-6">
                &ldquo;{c.testimonialQuote}&rdquo;
                <footer className="mt-4 text-sm not-italic text-white/50 font-sans">
                  — {c.testimonialAuthor}, {c.testimonialRole}
                </footer>
              </blockquote>
            </div>
          </div>
        </Reveal>

        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {list.map((item, i) => {
            const Icon = resolveIcon(item.icon, ShieldCheck);
            return (
              <Reveal key={`${item.title}-${i}`} delay={i * 0.05}>
                <Tilt3D max={6} scale={1.03} className="h-full">
                  <div
                    className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-colors h-full"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center mb-5"
                      style={{ transform: "translateZ(20px)" }}
                    >
                      <Icon className="w-5 h-5 text-primary-300" />
                    </div>
                    <h3
                      className="font-display text-xl"
                      style={{ transform: "translateZ(15px)" }}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/60 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </Tilt3D>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
