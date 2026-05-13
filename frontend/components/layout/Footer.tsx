import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { SummitLogo } from "@/components/shared/SummitLogo";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { CookiesPreferencesButton } from "@/components/shared/CookiesPreferencesButton";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Twitter,
  Youtube,
  Activity,
  Sparkles,
} from "lucide-react";
import { fetchPublicSettings } from "@/lib/hooks/useSiteSettings";

export async function Footer(): Promise<React.ReactNode> {
  const s = await fetchPublicSettings();
  const tagline =
    s["footer.tagline"] ||
    "India's most transparent crowd-funding run platform. Verified NGOs, escrow-protected funds, and a public audit page for every event.";
  const contactEmail = s["footer.contact_email"] || "hello@runforacause.in";
  const contactPhone = s["footer.contact_phone"] || "+91 80 4956 1234";
  const contactCity = s["footer.contact_city"] || "Bengaluru, India";
  const newsletterText =
    s["footer.newsletter_text"] ||
    "Quarterly impact reports — no spam. Ever.";
  const twitterUrl = s["social.twitter_url"] || "https://twitter.com/runforacause";
  const instagramUrl = s["social.instagram_url"] || "https://instagram.com/runforacause";
  const linkedinUrl = s["social.linkedin_url"] || "https://linkedin.com/company/runforacause";
  const youtubeUrl = s["social.youtube_url"] || "https://youtube.com/@runforacause";
  const brandLogoUrl = s["brand.logo_url"] || null;
  const summitLogoUrl = s["brand.summit_logo_url"] || null;
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-ink-900 text-white overflow-hidden">
      {/* Top hairline */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(237,108,15,0.5), transparent)",
        }}
        aria-hidden
      />

      {/* Atmospheric orbs */}
      <div
        aria-hidden
        className="absolute right-0 top-0 w-[55%] h-[60%] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 80% 30%, rgba(237,108,15,0.15), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute left-0 bottom-0 w-[55%] h-[55%] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 20% 80%, rgba(45,106,79,0.12), transparent 70%)",
        }}
      />

      {/* Editorial signature word */}
      <p
        aria-hidden
        className="absolute -bottom-12 left-1/2 -translate-x-1/2 font-condensed italic font-black leading-none text-outline-thick pointer-events-none select-none whitespace-nowrap hidden md:block"
        style={{
          fontSize: "clamp(220px, 26vw, 480px)",
          color: "rgba(237,108,15,0.08)",
        }}
      >
        RUN. GIVE. MOVE.
      </p>

      {/* ===================== Pre-footer CTA card ===================== */}
      <div className="container-page relative pt-14 md:pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 p-7 md:p-10 lg:p-12 grid md:grid-cols-12 gap-6 md:gap-10 items-center shadow-glow">
          <div
            aria-hidden
            className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-white/15 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-secondary-400/30 blur-3xl"
          />

          <div className="md:col-span-7 relative">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] font-bold tracking-[0.22em] uppercase text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Last call
            </span>
            <h3 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl text-white leading-[1.05] [text-wrap:balance]">
              The next event you join could be the one a runner remembers
              forever.
            </h3>
          </div>
          <div className="md:col-span-5 relative flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 md:justify-end">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-primary-700 hover:bg-canvas-subtle font-semibold text-sm rounded-xl transition-all active:scale-[0.97]"
            >
              Become a runner
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/events"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 text-white font-semibold text-sm rounded-xl transition-all active:scale-[0.97]"
            >
              Browse events
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ===================== Newsletter strip (full-width) ===================== */}
      <div className="container-page relative pt-14 md:pt-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.03] via-white/[0.06] to-transparent p-7 md:p-10 lg:p-12 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Decorative inner glow */}
          <div
            aria-hidden
            className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-primary-500/20 blur-3xl pointer-events-none"
          />

          {/* Left: heading */}
          <div className="lg:col-span-5 relative">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-[10px] font-bold tracking-[0.22em] uppercase text-primary-300">
              <Sparkles className="w-3 h-3" />
              Quarterly impact
            </span>
            <h3 className="mt-4 font-display text-2xl md:text-3xl lg:text-[2.25rem] text-white leading-[1.1] [text-wrap:balance]">
              Get the impact reports nobody else has the receipts to publish.
            </h3>
            <p className="mt-3 text-sm md:text-base text-white/65 leading-relaxed max-w-md">
              {newsletterText}
            </p>
          </div>

          {/* Right: form (gets full width on mobile, half on desktop) */}
          <div className="lg:col-span-7 relative">
            <NewsletterForm variant="hero" />
            <p className="mt-2 text-[11px] text-white/45 leading-relaxed">
              By subscribing you agree to receive occasional updates from
              RunForACause. We never share your email — unsubscribe in one
              click.
            </p>
          </div>
        </div>
      </div>

      {/* ===================== Main grid: brand + nav + connect ===================== */}
      <div className="container-page relative pt-14 md:pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-12">
          {/* Brand + tagline + contact + trust + social */}
          <div className="col-span-2 md:col-span-5">
            <Logo variant="light" imageUrl={brandLogoUrl} />
            <p className="mt-6 text-white/65 max-w-md leading-relaxed">
              {tagline}
            </p>

            {/* Contact strip */}
            <ul className="mt-7 space-y-2.5 text-sm">
              <li>
                <a
                  href={`mailto:${contactEmail}`}
                  className="group inline-flex items-center gap-2.5 text-white/75 hover:text-primary-300 transition"
                >
                  <Mail className="w-4 h-4 text-primary-400 group-hover:scale-110 transition" />
                  {contactEmail}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${contactPhone.replace(/\s/g, "")}`}
                  className="group inline-flex items-center gap-2.5 text-white/75 hover:text-primary-300 transition"
                >
                  <Phone className="w-4 h-4 text-primary-400 group-hover:scale-110 transition" />
                  {contactPhone}
                </a>
              </li>
              <li className="inline-flex items-center gap-2.5 text-white/75">
                <MapPin className="w-4 h-4 text-primary-400" />
                {contactCity}
              </li>
            </ul>

            {/* Trust chips */}
            <div className="mt-7 flex flex-wrap items-center gap-2 text-[10px] font-condensed font-semibold uppercase tracking-[0.22em] text-white/65">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <ShieldCheck className="w-3 h-3 text-secondary-400" />
                FCRA compliant
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                80G receipts
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                DPDP-aware
              </span>
            </div>
          </div>

          {/* Platform links */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-white/45 mb-5">
              Platform
            </h4>
            <ul className="space-y-3 text-sm text-white/75">
              <FooterLink href="/events">Browse events</FooterLink>
              <FooterLink href="/map">Find events near you</FooterLink>
              <FooterLink href="/causes">Explore causes</FooterLink>
              <FooterLink href="/organisations">Verified organisers</FooterLink>
              <FooterLink href="/transparency">Transparency</FooterLink>
              <FooterLink href="/register?role=event_manager">
                Host an event
              </FooterLink>
              <FooterLink href="/register?role=runner">Run for us</FooterLink>
            </ul>
          </div>

          {/* Company links */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-white/45 mb-5">
              Company
            </h4>
            <ul className="space-y-3 text-sm text-white/75">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href={`mailto:${contactEmail}`} external>
                Contact
              </FooterLink>
              <FooterLink href="/privacy">Privacy policy</FooterLink>
              <FooterLink href="/terms">Terms of use</FooterLink>
              <FooterLink href="/about#dpo">Data protection</FooterLink>
              <CookiesPreferencesLink />
            </ul>
          </div>

          {/* Connect */}
          <div className="col-span-2 md:col-span-3">
            <h4 className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-white/45 mb-5">
              Connect
            </h4>
            <p className="text-sm text-white/65 leading-relaxed mb-5 max-w-xs">
              Follow along — runner stories, milestones unlocked, and the
              numbers behind the numbers.
            </p>
            <div className="flex items-center gap-2">
              <SocialIcon href={twitterUrl} label="Twitter / X">
                <Twitter className="w-4 h-4" />
              </SocialIcon>
              <SocialIcon href={instagramUrl} label="Instagram">
                <Instagram className="w-4 h-4" />
              </SocialIcon>
              <SocialIcon href={linkedinUrl} label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </SocialIcon>
              <SocialIcon href={youtubeUrl} label="YouTube">
                <Youtube className="w-4 h-4" />
              </SocialIcon>
            </div>

            {/* Status indicator */}
            <Link
              href="/transparency"
              className="mt-7 inline-flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition group"
            >
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-secondary-400 animate-ping opacity-70" />
                <span className="relative w-2 h-2 rounded-full bg-secondary-400" />
              </span>
              <span className="text-[11px] font-medium text-white/65 group-hover:text-white/85 transition">
                All systems operational
              </span>
              <Activity className="w-3 h-3 text-primary-300 ml-1" />
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-16 mb-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-condensed text-[11px] font-bold tracking-[0.22em] uppercase text-white/60 mb-4">
              A product engineered by
            </p>
            <SummitLogo
              variant="light"
              size="md"
              imageUrl={summitLogoUrl}
            />
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs text-white/45 inline-flex items-center gap-1.5">
              Made with{" "}
              <Heart className="w-3 h-3 text-primary-400 fill-primary-400" /> in
              India
            </p>
            <p className="mt-2 text-[11px] text-white/35">
              © {year} RunForACause · All rights reserved.
            </p>
            <p className="mt-1 text-[10px] text-white/30 font-mono tabular tracking-wider">
              v1.0 · build {String(year).slice(-2)}.{new Date().getMonth() + 1}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ----------------------------------------------------------------------------

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}): React.ReactNode {
  const Component = external ? "a" : Link;
  return (
    <li>
      <Component
        href={href}
        className="group inline-flex items-center gap-1.5 hover:text-primary-300 transition relative"
      >
        <span>{children}</span>
        <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
      </Component>
    </li>
  );
}

/**
 * Re-opens the consent banner. Server-component-safe entrypoint:
 * a tiny client island that dispatches the custom event ConsentBanner listens
 * for. Keeps the rest of Footer as RSC.
 */
function CookiesPreferencesLink(): React.ReactNode {
  return (
    <li>
      <CookiesPreferencesButton />
    </li>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-primary-500 hover:border-primary-500 hover:text-white text-white/70 flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
    >
      {children}
    </a>
  );
}
