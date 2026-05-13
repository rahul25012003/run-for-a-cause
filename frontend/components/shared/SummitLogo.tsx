"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface SummitLogoProps {
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  /** Override the SVG mark with an uploaded image. */
  imageUrl?: string | null;
}

const SIZES = {
  sm: {
    mark: 40,
    wordmark: "text-[1.05rem]",
    sub: "text-[0.95rem]",
    tagline: "text-[10px]",
    gap: "gap-2.5",
  },
  md: {
    mark: 52,
    wordmark: "text-xl md:text-[1.35rem]",
    sub: "text-lg md:text-[1.2rem]",
    tagline: "text-[11px] md:text-xs",
    gap: "gap-3.5",
  },
  lg: {
    mark: 64,
    wordmark: "text-2xl md:text-[1.65rem]",
    sub: "text-[1.4rem] md:text-[1.5rem]",
    tagline: "text-xs md:text-[13px]",
    gap: "gap-4",
  },
};

/**
 * Summit Solutions wordmark — stylized peak monogram + condensed wordmark.
 * The "S" is implied by two ascending peaks. Animates a subtle glow on
 * hover to feel premium without being loud.
 */
export function SummitLogo({
  variant = "default",
  size = "md",
  showTagline = true,
  className,
  imageUrl,
}: SummitLogoProps): React.ReactNode {
  const textColor =
    variant === "light"
      ? "text-white"
      : variant === "dark"
        ? "text-ink-900"
        : "text-ink-800";
  // Higher opacity on light variant so the tagline reads on dark surfaces.
  const subColor =
    variant === "light" ? "text-white/75" : "text-ink-500";
  const s = SIZES[size];

  return (
    <motion.div
      whileHover="hover"
      className={`inline-flex items-center ${s.gap} select-none ${className ?? ""}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Summit Solutions"
          width={s.mark}
          height={s.mark}
          className="rounded-xl object-cover"
        />
      ) : (
      /* Mark — stylized peaks with sun */
      <motion.svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        variants={{
          hover: { rotate: -2, scale: 1.04 },
        }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
      >
        <defs>
          <linearGradient id="sl-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ED6C0F" />
            <stop offset="50%" stopColor="#FA8836" />
            <stop offset="100%" stopColor="#BF9000" />
          </linearGradient>
          <filter id="sl-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="2"
          y="2"
          width="40"
          height="40"
          rx="11"
          fill="url(#sl-grad)"
        />
        <motion.path
          d="M 8 32 L 18 14 L 24 22 L 30 12 L 36 32 Z"
          fill="white"
          opacity={0.95}
          variants={{ hover: { y: -1 } }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
        <circle cx="30" cy="11" r="2.6" fill="#FFE4CB" filter="url(#sl-glow)" />
        <line
          x1="6"
          y1="35"
          x2="38"
          y2="35"
          stroke="white"
          strokeOpacity="0.4"
          strokeWidth="0.8"
        />
      </motion.svg>
      )}

      {/* Wordmark */}
      <div className="flex flex-col leading-tight">
        <span
          className={`font-display font-semibold tracking-tight ${s.wordmark} ${textColor}`}
        >
          Summit
          <span className="text-primary-500 mx-0.5">·</span>
          <span
            className={`font-condensed font-bold uppercase tracking-[0.04em] ${s.sub}`}
          >
            Solutions
          </span>
        </span>
        {showTagline && (
          <span
            className={`mt-1.5 font-condensed uppercase tracking-[0.22em] font-semibold ${s.tagline} ${subColor}`}
          >
            Engineering with intent
          </span>
        )}
      </div>
    </motion.div>
  );
}
