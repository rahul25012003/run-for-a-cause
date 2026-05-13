import type { Metadata } from "next";
import { PageHero } from "@/components/shared/PageHero";
import { LegalDocBody } from "@/components/shared/LegalDocBody";
import { fetchPublicSettings } from "@/lib/hooks/useSiteSettings";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How RunForACause collects, uses and protects your data. DPDP Act 2023 compliant.",
};

export default async function PrivacyPage(): Promise<React.ReactNode> {
  const s = await fetchPublicSettings();
  const body = s["legal.privacy_body"] ?? "";
  const updated = s["legal.privacy_updated_at"] ?? "";
  return (
    <>
      <PageHero
        eyebrow="Legal"
        heading="Privacy policy"
        subtitle="What we collect, why, and what you can do about it."
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
