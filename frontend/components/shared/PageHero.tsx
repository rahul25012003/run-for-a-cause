"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  heading: string;
  subtitle?: string;
  /** Variant tunes the colour of the decorative blurred orbs. */
  variant?: "primary" | "secondary" | "gold";
  /** Optional element rendered to the right of the title (button, badge). */
  trailing?: ReactNode;
}

const ORB_COLOURS = {
  primary: { a: "bg-primary-200/35", b: "bg-secondary-200/30" },
  secondary: { a: "bg-secondary-200/40", b: "bg-primary-200/25" },
  gold: { a: "bg-gold-100/60", b: "bg-primary-200/25" },
};

export function PageHero({
  eyebrow,
  heading,
  subtitle,
  variant = "primary",
  trailing,
}: PageHeroProps): React.ReactNode {
  const orb = ORB_COLOURS[variant];
  return (
    <section className="relative overflow-hidden bg-canvas-subtle border-b border-ink-100 pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Decorative blurred orbs */}
      <div
        className={`absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full ${orb.a} blur-3xl`}
        aria-hidden
      />
      <div
        className={`absolute -bottom-48 -left-40 w-[600px] h-[600px] rounded-full ${orb.b} blur-3xl`}
        aria-hidden
      />
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(rgba(26,22,18,1) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
        }}
      />

      <div className="container-page relative">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            {eyebrow && (
              <span className="eyebrow">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                {eyebrow}
              </span>
            )}
            <h1
              className="mt-4 font-display font-medium text-display-xl text-ink-900 leading-[1.05]"
              style={{ letterSpacing: "-0.025em" }}
            >
              {heading}
            </h1>
            {subtitle && (
              <p className="mt-6 text-lg md:text-xl text-ink-600 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </motion.div>
          {trailing && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="flex-shrink-0"
            >
              {trailing}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
