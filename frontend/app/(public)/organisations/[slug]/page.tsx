import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  Award,
  Globe,
  Mail,
  Phone,
  Trophy,
  Users,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { Badge } from "@/components/shared/Badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Reveal } from "@/components/shared/Reveal";
import { Tilt3D } from "@/components/shared/Tilt3D";
import {
  formatCompactInr,
  formatDistance,
  formatDate,
  progressPct,
} from "@/lib/utils";

interface OrgProfile {
  organisation: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    website: string | null;
    kyc_status: string;
    is_80g_eligible: boolean;
    created_at: string;
  };
  stats: {
    event_count: number;
    total_raised: string;
    total_runners: number;
    total_distance_km: string;
  };
  dpo: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  events: {
    id: string;
    slug: string;
    title: string;
    cause_summary: string;
    cover_image_url: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    total_raised: string;
    fundraising_goal: string;
    total_runners: number;
  }[];
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchProfile(slug: string): Promise<OrgProfile | null> {
  try {
    const res = await fetch(`${apiUrl}/organisations/${slug}/profile`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as OrgProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchProfile(slug);
  if (!data) return { title: "Organisation not found" };
  const o = data.organisation;
  return {
    title: o.name,
    description: o.description?.slice(0, 160) ?? `${o.name} on RunForACause`,
    openGraph: {
      title: o.name,
      description: o.description?.slice(0, 160),
      images: [
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in"}/og/organisation/${slug}`,
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: o.name,
      description: o.description?.slice(0, 160),
      images: [
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in"}/og/organisation/${slug}`,
      ],
    },
  };
}

export default async function OrganisationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactNode> {
  const { slug } = await params;
  const data = await fetchProfile(slug);
  if (!data) notFound();

  const o = data.organisation;
  const s = data.stats;

  return (
    <>
      <PageHero
        eyebrow="Verified NGO"
        heading={o.name}
        subtitle={o.description ?? undefined}
        variant="secondary"
        trailing={
          <div className="flex flex-col items-end gap-2">
            {o.kyc_status === "verified" && (
              <Badge variant="success">
                <ShieldCheck className="w-3 h-3" /> KYC verified
              </Badge>
            )}
            {o.is_80g_eligible && (
              <Badge variant="primary">
                <Award className="w-3 h-3" /> 80G eligible
              </Badge>
            )}
          </div>
        }
      />

      {/* Aggregate stats */}
      <section className="container-page -mt-10 md:-mt-14 relative z-10 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            label="Events hosted"
            value={String(s.event_count)}
            icon={<Calendar className="w-4 h-4" />}
          />
          <StatTile
            label="Raised across events"
            value={formatCompactInr(s.total_raised)}
            icon={<Trophy className="w-4 h-4" />}
            primary
          />
          <StatTile
            label="Runners"
            value={String(s.total_runners)}
            icon={<Users className="w-4 h-4" />}
          />
          <StatTile
            label="Distance covered"
            value={formatDistance(s.total_distance_km)}
            icon={<Award className="w-4 h-4" />}
          />
        </div>
      </section>

      {/* Logo + meta strip */}
      <section className="container-page mb-16">
        <div className="card p-6 md:p-8 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {o.logo_url && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-canvas-deep ring-4 ring-white shadow-soft flex-shrink-0">
                <Image
                  src={o.logo_url}
                  alt={o.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div>
              <p className="font-display text-xl text-ink-900">{o.name}</p>
              <p className="text-xs text-ink-500 font-mono">/{o.slug}</p>
              <p className="mt-1 text-xs text-ink-400">
                Joined RunForACause {formatDate(o.created_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {o.website && (
              <a
                href={o.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-medium"
              >
                <Globe className="w-4 h-4" />
                Visit website
              </a>
            )}
            <Link
              href={`/transparency`}
              className="inline-flex items-center gap-1.5 text-ink-600 hover:text-ink-900 font-medium"
            >
              <ShieldCheck className="w-4 h-4" />
              How verification works
            </Link>
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="container-page mb-16">
        <Reveal>
          <header className="mb-8">
            <span className="eyebrow">Their events</span>
            <h2 className="mt-3 font-display font-medium text-display-md text-ink-900">
              Causes you can join right now
            </h2>
          </header>
        </Reveal>

        {data.events.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-ink-500">
              {o.name} hasn&apos;t hosted any events yet — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.events.map((e, i) => {
              const pct = progressPct(e.total_raised, e.fundraising_goal);
              return (
                <Reveal key={e.id} delay={i * 0.05}>
                  <Tilt3D max={5} scale={1.015} className="h-full">
                    <Link
                      href={`/events/${e.slug}`}
                      className="card overflow-hidden flex flex-col h-full hover:shadow-lift transition"
                    >
                      <div className="relative aspect-[4/3] bg-canvas-deep overflow-hidden">
                        {e.cover_image_url ? (
                          <Image
                            src={e.cover_image_url}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-secondary-200" />
                        )}
                        <Badge
                          variant={e.status === "live" ? "success" : "default"}
                          className="absolute top-3 left-3"
                        >
                          {e.status}
                        </Badge>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-display text-lg text-ink-900 leading-snug">
                          {e.title}
                        </h3>
                        <p className="mt-2 text-sm text-ink-500 line-clamp-2">
                          {e.cause_summary}
                        </p>
                        <div className="mt-auto pt-4">
                          <ProgressBar pct={pct} height="sm" />
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-ink-900 tabular">
                              {formatCompactInr(e.total_raised)}
                            </span>
                            <span className="text-ink-500">
                              {e.total_runners} runners · {pct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Tilt3D>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* DPO contact (DPDP transparency) */}
      {(data.dpo.name || data.dpo.email) && (
        <section className="container-page mb-20">
          <div className="card p-6 md:p-8 bg-canvas-subtle">
            <span className="eyebrow">Data protection</span>
            <h3 className="mt-3 font-display text-xl text-ink-900">
              Have a question about your data?
            </h3>
            <p className="mt-2 text-sm text-ink-500 max-w-2xl">
              Under the DPDP Act 2023, every NGO names a Data Protection
              Officer for donor and runner data-protection requests.
              {o.name}&apos;s DPO is below.
            </p>
            <dl className="mt-5 grid sm:grid-cols-3 gap-4 text-sm">
              {data.dpo.name && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-400 font-bold">
                    Name
                  </dt>
                  <dd className="mt-1 text-ink-900">{data.dpo.name}</dd>
                </div>
              )}
              {data.dpo.email && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-400 font-bold">
                    Email
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={`mailto:${data.dpo.email}`}
                      className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {data.dpo.email}
                    </a>
                  </dd>
                </div>
              )}
              {data.dpo.phone && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-400 font-bold">
                    Phone
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${data.dpo.phone}`}
                      className="text-ink-900 inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {data.dpo.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  icon,
  primary,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  primary?: boolean;
}): React.ReactNode {
  return (
    <div
      className={`card p-5 ${primary ? "bg-primary-50 border-primary-200 ring-1 ring-primary-200" : ""}`}
    >
      <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-ink-500">
        {icon}
        {label}
      </div>
      <p
        className={`mt-3 font-display tabular leading-none text-2xl md:text-3xl ${primary ? "text-primary-700" : "text-ink-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
