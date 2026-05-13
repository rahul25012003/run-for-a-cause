"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Play, ShieldCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";

// Spring controls the lag and weight of every parallax layer. Heavy mass +
// high damping = smooth glide, never twitchy.
const PARALLAX_SPRING = { stiffness: 60, damping: 22, mass: 1 };

export interface HeroContent {
  eyebrow: string;
  heading: string;
  italicWord: string;
  subheading: string;
  subtitle: string;
  primaryCta: string;
  primaryCtaHref: string;
  secondaryCta: string;
  secondaryCtaHref: string;
  trustLine: string;
  imageUrl: string;
  /** Optional looping background video — if present, plays muted over the photo
   * with the photo as poster. Empty string = image-only. */
  videoUrl?: string;
}

export interface HeroStats {
  totalRaised: number;
  totalRunners: number;
  totalEvents: number;
}

const DEFAULTS: HeroContent = {
  eyebrow: "Transparent giving · Made in India",
  heading: "Every kilometre",
  italicWord: "tells a story",
  subheading: ".\nEvery rupee finds a cause.",
  subtitle:
    "Run for a verified NGO. Sponsor someone you know. Watch the money move — from card to cause to impact — on a public audit page.",
  primaryCta: "Start running for a cause",
  primaryCtaHref: "/register",
  secondaryCta: "Browse live events",
  secondaryCtaHref: "/events",
  trustLine: "Every NGO is KYC-verified · Every event has a public audit page",
  // Single trail runner heading toward mountains — composition keeps the
  // upper-third (sky/peaks) clean for the headline.
  // Replace via /admin/content → Hero section → image URL anytime.
  imageUrl:
    "https://images.unsplash.com/photo-1486218119243-13883505764c?w=3000&q=92",
};

export function HeroSection({
  content,
  stats,
}: {
  content?: Partial<HeroContent>;
  stats?: HeroStats;
}): React.ReactNode {
  const c = { ...DEFAULTS, ...(content ?? {}) };
  // Defensive fallbacks: an admin can clear an image/video URL via
  // /admin/content (saving "" to the setting). The empty string would
  // otherwise reach <Image src=""> and crash hydration. Always keep a
  // valid image as backdrop and only opt into the video element when
  // a real URL is present.
  const heroImageUrl = c.imageUrl && c.imageUrl.trim() !== ""
    ? c.imageUrl
    : DEFAULTS.imageUrl;
  const heroVideoUrl =
    c.videoUrl && c.videoUrl.trim() !== "" ? c.videoUrl : null;

  // ---- 3D background parallax (mouse only — scroll parallax removed) -----
  // Mouse position (-1..1) relative to the section
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Photo — closest layer to camera, biggest mouse shift (background of a
  // window: the further away you "look", the less it moves with your head).
  // Inverted so the photo follows the cursor like a wide-angle lens.
  const photoX = useSpring(useTransform(mx, [-1, 1], [18, -18]), PARALLAX_SPRING);
  const photoY = useSpring(useTransform(my, [-1, 1], [12, -12]), PARALLAX_SPRING);

  // Mid-depth lens overlay — moves opposite the photo, half the distance.
  // This separation is what sells the depth.
  const lensX = useSpring(useTransform(mx, [-1, 1], [-9, 9]), PARALLAX_SPRING);
  const lensY = useSpring(useTransform(my, [-1, 1], [-6, 6]), PARALLAX_SPRING);

  // Foreground vignette — smallest movement, anchors the frame.
  const vigX = useSpring(useTransform(mx, [-1, 1], [-4, 4]), PARALLAX_SPRING);
  const vigY = useSpring(useTransform(my, [-1, 1], [-3, 3]), PARALLAX_SPRING);

  const handleMove = (e: React.MouseEvent<HTMLElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    mx.set(cx * 2 - 1);
    my.set(cy * 2 - 1);
  };

  const handleLeave = (): void => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden bg-ink-900"
      style={{ perspective: "1800px" }}
    >
      {/* Photo — gets the strongest parallax (mouse + scroll + Ken Burns) */}
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <motion.div
          style={{
            x: photoX,
            y: photoY,
            willChange: "transform",
          }}
          className="absolute -inset-8"
        >
          {/* Image gets the Ken Burns scale loop. Video does NOT — stacking
              a continuous CSS scale transform on a <video> forces GPU
              re-rasterization every frame and looks janky. The video has
              its own motion from playback. */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={heroImageUrl}
              alt="A runner toward the mountains"
              fill
              priority
              quality={92}
              sizes="110vw"
              className="object-cover object-center"
              style={{ filter: "saturate(0.95) contrast(1.1)" }}
            />
          </motion.div>

          {/* Optional looping video — SIBLING of the Ken Burns div so it
              isn't subject to the scale animation. Image below acts as
              poster while the video buffers (and is the only thing that
              loads on slow networks / autoplay-blocked browsers). */}
          {heroVideoUrl && (
            <video
              src={heroVideoUrl}
              poster={heroImageUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: "saturate(0.95) contrast(1.1)",
                // Force its own GPU compositor layer so the parent
                // parallax transforms don't cause re-decode every frame.
                transform: "translateZ(0)",
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Layer 1 — very light global tint. Photo stays bright everywhere. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(15,11,8,0.30) 0%, rgba(15,11,8,0.10) 50%, transparent 100%)",
        }}
      />
      {/* Layer 2 — focused dark "lens" behind the headline area only.
          Mid-depth: gets the inverted-mouse parallax for true 3D feel. */}
      <motion.div
        style={{ x: lensX, y: lensY, willChange: "transform" }}
        className="absolute -inset-12 pointer-events-none"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 35% 56%, rgba(8,6,4,0.7) 0%, rgba(8,6,4,0.4) 45%, transparent 80%)",
          }}
        />
      </motion.div>
      {/* Layer 3 — soft edge vignette, anchors the frame, smallest shift */}
      <motion.div
        style={{ x: vigX, y: vigY, willChange: "transform" }}
        className="absolute -inset-6 pointer-events-none"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 110% 95% at 50% 50%, transparent 70%, rgba(15,11,8,0.4) 100%)",
          }}
        />
      </motion.div>

      {/* Atmospheric particle drift — subtle warm motes for depth.
          Pure CSS, no JS overhead. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.35] mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle 1.5px at 20% 30%, rgba(255,200,150,0.6), transparent 100%), radial-gradient(circle 1px at 70% 60%, rgba(255,220,180,0.5), transparent 100%), radial-gradient(circle 2px at 85% 25%, rgba(255,200,150,0.4), transparent 100%), radial-gradient(circle 1px at 35% 75%, rgba(255,220,180,0.5), transparent 100%), radial-gradient(circle 1.5px at 55% 15%, rgba(255,200,150,0.4), transparent 100%)",
          animation: "heroDrift 18s ease-in-out infinite alternate",
        }}
      />
      {/* Bottom bleed — soft gradient that hands the eye off into the next
          (cream) section so the transition isn't a hard cut. */}
      <div
        aria-hidden
        className="absolute bottom-0 inset-x-0 h-40 pointer-events-none z-[5]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(245,237,225,0.05) 55%, rgba(245,237,225,0.35) 85%, rgba(245,237,225,0.7) 100%)",
        }}
      />

      {/* Content — centred, fits one screen */}
      <div className="container-page relative z-10 w-full py-16 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto text-center lg:text-left lg:mx-0 lg:max-w-3xl"
        >
          <span className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-[0.22em] uppercase text-white/95">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
            {c.eyebrow}
          </span>

          <h1
            className="mt-5 md:mt-6 font-display font-medium tracking-[-0.035em] [text-wrap:balance]"
            style={{
              color: "#FBF6EE",
              fontSize: "clamp(2.5rem, 7vw, 5.75rem)",
              lineHeight: 0.96,
              textShadow:
                "0 6px 50px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            {c.heading}{" "}
            <em
              className="text-primary-300"
              style={{
                fontStyle: "italic",
                fontWeight: 400,
                letterSpacing: "-0.035em",
                textShadow:
                  "0 2px 30px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)",
              }}
            >
              {c.italicWord}
            </em>
            {c.subheading.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-4 md:mt-5 max-w-2xl mx-auto text-sm md:text-base text-white/85 leading-relaxed px-2">
            {c.subtitle}
          </p>

          <div className="mt-5 md:mt-7 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center lg:justify-start">
            <Link
              href={c.primaryCtaHref}
              className="group relative inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-base transition-all duration-200 hover:shadow-glow active:scale-[0.97] clip-parallelogram"
            >
              {c.primaryCta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={c.secondaryCtaHref}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 backdrop-blur-md border border-white/25 hover:bg-white/20 hover:border-white/40 text-white font-semibold text-base transition-all duration-200 active:scale-[0.97] clip-parallelogram"
            >
              <Play className="w-4 h-4" />
              {c.secondaryCta}
            </Link>
          </div>

          <div className="mt-5 md:mt-6 inline-flex items-center gap-2 text-xs md:text-sm text-white/70 px-2">
            <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-300 flex-shrink-0" />
            <span className="text-center">{c.trustLine}</span>
          </div>

          {/* Stats inline — real numbers from backend, no fake fallbacks */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md sm:max-w-2xl mx-auto lg:mx-0 mt-6 md:mt-7 pt-4 md:pt-5 border-t border-white/15">
            <Stat
              value={stats ? stats.totalRaised : 0}
              prefix="₹"
              label="Raised"
              isInr
            />
            <Stat
              value={stats ? stats.totalRunners : 0}
              label="Runners"
              isInteger
            />
            <Stat
              value={stats ? stats.totalEvents : 0}
              label="Events"
              isInteger
            />
          </div>
        </motion.div>
      </div>

    </section>
  );
}

function Stat({
  value,
  prefix = "",
  suffix = "",
  label,
  isInteger,
  isInr,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  isInteger?: boolean;
  isInr?: boolean;
}): React.ReactNode {
  // INR formatter handles its own units (Cr / L / K / raw) so no static suffix.
  const formatter = isInteger
    ? (n: number) => Math.round(n).toLocaleString("en-IN")
    : isInr
      ? (n: number) => {
          if (n >= 1e7) return `${(n / 1e7).toFixed(1)} Cr`;
          if (n >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
          if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
          return Math.round(n).toLocaleString("en-IN");
        }
      : (n: number) => n.toFixed(1);
  return (
    <div className="text-center">
      <p
        className="font-display text-white tabular leading-none"
        style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)" }}
      >
        {prefix}
        <AnimatedCounter value={value} formatter={formatter} />
        <span className="text-white/50">{suffix}</span>
      </p>
      <p className="mt-1.5 font-condensed font-semibold text-[10px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
    </div>
  );
}
