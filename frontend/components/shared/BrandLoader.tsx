"use client";

import { motion } from "framer-motion";

/**
 * Full-screen branded loader — orange logo mark with a pulsing ring and
 * a thin shimmer bar below. Used across public, auth, and dashboard routes.
 * Animations are kept short (≤ 1s loops) so the loader feels instant.
 */
export function BrandLoader(): React.ReactNode {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-canvas">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5"
      >
        {/* Logo mark with pulsing glow ring */}
        <div className="relative flex items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-primary-500/30 blur-xl"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-10px] rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 60%, #ED6C0F 90%, transparent 100%)",
              maskImage:
                "radial-gradient(circle, transparent 60%, black 60.5%, black 70%, transparent 70.5%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 60%, black 60.5%, black 70%, transparent 70.5%)",
            }}
            aria-hidden
          />
          <motion.span
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M14.5 4.5C14.5 3.4 15.4 2.5 16.5 2.5C17.6 2.5 18.5 3.4 18.5 4.5C18.5 5.6 17.6 6.5 16.5 6.5C15.4 6.5 14.5 5.6 14.5 4.5Z"
                fill="white"
              />
              <path
                d="M5 21L8 14L6 11L4 12.5M8 14L10.5 11L13 13L11 17L13 21M13 13L16.5 9L20 11"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        </div>

        {/* Wordmark + shimmer bar */}
        <div className="flex flex-col items-center gap-2.5">
          <span className="font-display text-base font-semibold tracking-tight text-ink-700">
            runfora<span className="text-primary-500">cause</span>
          </span>
          <div className="w-28 h-[2px] bg-ink-100 rounded-full overflow-hidden">
            <motion.span
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="block w-1/2 h-full bg-primary-500"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
