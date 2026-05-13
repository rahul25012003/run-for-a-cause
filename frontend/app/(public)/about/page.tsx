import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";
import { fetchPublicSettings } from "@/lib/hooks/useSiteSettings";

export const metadata: Metadata = { title: "About RunForACause" };

export default async function AboutPage(): Promise<React.ReactNode> {
  const s = await fetchPublicSettings();
  const heading = s["about.heading"] || "About RunForACause";
  const subtitle =
    s["about.subtitle"] ||
    "We're a platform that helps NGOs and communities raise funds through cause-based run events — with transparency baked in from the first kilometre to the final bank transfer.";
  const mission =
    s["about.mission"] ||
    "Indian giving is held back by trust gaps. Donors don't know where their money goes. NGOs spend more on platforms than the platforms spend on infrastructure. We're building a different model: low platform fees, high transparency, and audit pages anyone can read.";

  return (
    <>
      <PageHero
        eyebrow="Our story"
        heading={heading}
        subtitle={subtitle}
        variant="gold"
      />

      <section className="container-page py-12 md:py-20 max-w-3xl">
        <Reveal>
          <span className="eyebrow">Our mission</span>
          <h2 className="mt-3 font-display font-medium text-3xl md:text-4xl text-ink-900 leading-tight">
            Make giving traceable.
          </h2>
          <p className="mt-5 text-lg text-ink-700 leading-relaxed">{mission}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-14 card p-8 md:p-10 bg-canvas-subtle">
            <span className="eyebrow">Built by</span>
            <p className="mt-3 font-display text-2xl text-ink-900 leading-snug">
              Summit Solutions — an Indian product engineering studio.
            </p>
            <p className="mt-4 text-ink-600 leading-relaxed">
              Get in touch at{" "}
              <a
                href="mailto:hello@summitsolutions.in"
                className="text-primary-600 underline underline-offset-4"
              >
                hello@summitsolutions.in
              </a>
              .
            </p>
            <div className="mt-7">
              <Link href="/transparency" className="btn-primary">
                See how transparency works
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
