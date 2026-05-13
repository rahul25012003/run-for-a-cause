import type { Metadata } from "next";
import { PageHero } from "@/components/shared/PageHero";
import { LegalDocBody } from "@/components/shared/LegalDocBody";
import { fetchPublicSettings } from "@/lib/hooks/useSiteSettings";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using RunForACause.",
};

export default async function TermsPage(): Promise<React.ReactNode> {
  const s = await fetchPublicSettings();
  const body = s["legal.terms_body"] ?? "";
  const updated = s["legal.terms_updated_at"] ?? "";
  return (
    <>
      <PageHero
        eyebrow="Legal"
        heading="Terms of use"
        subtitle="The agreement between you and RunForACause."
        variant="secondary"
      />
      <section className="container-page py-16 md:py-24">
        {updated && (
          <p className="text-xs font-mono tracking-wider text-ink-400 mb-10">
            Last updated: {updated}
          </p>
        )}
        <LegalDocBody text={body} />
      </section>
    </>
  );
}
