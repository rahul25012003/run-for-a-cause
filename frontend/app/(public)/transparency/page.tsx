import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, FileSpreadsheet, Eye } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { fetchPublicSettings } from "@/lib/hooks/useSiteSettings";

export const metadata: Metadata = {
  title: "Transparency",
  description: "How RunForACause keeps every rupee accountable.",
};

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Verified NGOs only",
    body: "Every organisation completes PAN, GST, and 80G verification before they can collect a single rupee. KYC details are reviewed by our team and bank accounts are confirmed via penny-drop verification.",
  },
  {
    icon: Lock,
    title: "Escrow-protected funds",
    body: "Donations don't go directly to the NGO. They sit in our platform-controlled escrow account, governed by a settlement engine that releases funds only after distance is verified and the event closes.",
  },
  {
    icon: Eye,
    title: "Public audit page per event",
    body: "Every event has a public /audit page showing gross raised, platform fee, payment-gateway fee, net payout (with bank UTR), and utilisation report. No login required — anyone can audit any event.",
  },
  {
    icon: FileSpreadsheet,
    title: "Append-only audit log",
    body: "Every state change — donation captured, distance approved, payout released — is written to an immutable audit log. We never edit or delete these entries.",
  },
];

export default async function TransparencyPage(): Promise<React.ReactNode> {
  const s = await fetchPublicSettings();
  const heading = s["transparency.heading"] || "Transparency, by design";
  const subtitle =
    s["transparency.subtitle"] ||
    "We built RunForACause around a simple promise: every donor should be able to follow their money from card → cause → impact. Here's how.";

  return (
    <>
      <PageHero
        eyebrow="How we keep our promise"
        heading={heading}
        subtitle={subtitle}
        variant="secondary"
      />

      <section className="container-page py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <Tilt3D max={3} scale={1.01} className="h-full">
                <div
                  className="card p-6 md:p-8 h-full"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary-100 flex items-center justify-center">
                    <p.icon className="w-5 h-5 text-secondary-700" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl text-ink-900">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-ink-600 leading-relaxed">{p.body}</p>
                </div>
              </Tilt3D>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-16 card p-8 md:p-10 bg-gradient-to-br from-secondary-50 to-white text-center max-w-3xl mx-auto">
            <p className="font-condensed text-xs font-bold tracking-[0.22em] uppercase text-secondary-700">
              See it for yourself
            </p>
            <p className="mt-3 font-display text-2xl md:text-3xl text-ink-900 leading-snug">
              Pick any event. Pull up its audit page.
              <br />
              The numbers are public.
            </p>
            <Link href="/events" className="btn-primary mt-7 inline-flex">
              Browse events
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
