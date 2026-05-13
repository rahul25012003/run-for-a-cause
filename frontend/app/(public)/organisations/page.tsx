import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  Building2,
  ArrowRight,
  Globe,
} from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { Badge } from "@/components/shared/Badge";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { EmptyState } from "@/components/shared/EmptyState";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  kyc_status: string;
  is_80g_eligible: boolean;
  is_active: boolean;
  created_at: string;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchOrganisations(): Promise<OrgRow[]> {
  try {
    const res = await fetch(`${apiUrl}/organisations/?verified_only=true`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as OrgRow[];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "Verified NGOs",
  description:
    "Every organisation on RunForACause is KYC-verified before they can collect a single rupee. Browse the NGOs running fundraising events.",
};

export default async function OrganisationsIndexPage(): Promise<React.ReactNode> {
  const orgs = await fetchOrganisations();

  return (
    <>
      <PageHero
        eyebrow="Verified NGOs"
        heading="Every cause, vetted before it goes live."
        subtitle="PAN, GSTIN and 80G are checked before any organisation can host an event or accept a donation. These are the NGOs you can give to with eyes open."
        variant="secondary"
      />

      <section className="container-page py-16 md:py-20">
        {orgs.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No organisations yet"
              description="No verified NGOs are listed. Once KYC clears, they'll appear here."
              icon={<Building2 className="w-7 h-7 text-ink-300" />}
              action={
                <Link href="/register?role=event_manager" className="btn-primary">
                  List your NGO
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
              <p className="text-sm text-ink-500">
                <span className="font-mono font-bold text-ink-900 tabular text-base">
                  {orgs.length}
                </span>{" "}
                verified {orgs.length === 1 ? "organisation" : "organisations"}{" "}
                hosting events
              </p>
              <Link href="/events" className="btn-link text-sm">
                Browse live events
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orgs.map((o, i) => (
                <Reveal key={o.id} delay={i * 0.04}>
                  <Tilt3D max={5} scale={1.015} className="h-full">
                    <Link
                      href={`/organisations/${o.slug}`}
                      className="card h-full p-6 md:p-7 flex flex-col group hover:shadow-lift transition"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        {o.logo_url ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-canvas-deep ring-1 ring-ink-100 flex-shrink-0">
                            <Image
                              src={o.logo_url}
                              alt={o.name}
                              width={56}
                              height={56}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-secondary-50 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-secondary-700" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-lg text-ink-900 leading-snug truncate">
                            {o.name}
                          </h3>
                          <p className="text-xs text-ink-400 font-mono mt-0.5 truncate">
                            /{o.slug}
                          </p>
                        </div>
                      </div>

                      {o.description && (
                        <p className="text-sm text-ink-600 leading-relaxed line-clamp-3 mb-4">
                          {o.description}
                        </p>
                      )}

                      <div className="mt-auto pt-4 border-t border-ink-100 flex flex-wrap items-center gap-2">
                        {o.kyc_status === "verified" && (
                          <Badge variant="success">
                            <ShieldCheck className="w-3 h-3" /> KYC verified
                          </Badge>
                        )}
                        {o.is_80g_eligible && (
                          <Badge variant="primary">
                            <Award className="w-3 h-3" /> 80G
                          </Badge>
                        )}
                        {o.website && (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-400">
                            <Globe className="w-3 h-3" />
                            Website
                          </span>
                        )}
                        <span className="text-xs font-semibold text-primary-600 group-hover:text-primary-700 inline-flex items-center gap-1 ml-auto">
                          View
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  </Tilt3D>
                </Reveal>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Trust strip — explains what "verified" actually means */}
      <section className="container-page pb-20">
        <div className="card p-6 md:p-8 bg-canvas-subtle">
          <span className="eyebrow">What verification means</span>
          <h3 className="mt-3 font-display text-2xl text-ink-900">
            Trust earned, not asked.
          </h3>
          <p className="mt-3 text-sm text-ink-600 max-w-2xl leading-relaxed">
            Before any organisation appears on this page, we verify their PAN,
            GSTIN, and 80G registration with official records, validate their
            bank account by penny-drop, and confirm authorised signatories.
            None of that happens after donations are received — it&apos;s the
            entry ticket to the platform.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/transparency" className="btn-link text-sm">
              How verification works →
            </Link>
            <span className="text-ink-300">·</span>
            <Link
              href="/register?role=event_manager"
              className="btn-link text-sm"
            >
              List your NGO →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
