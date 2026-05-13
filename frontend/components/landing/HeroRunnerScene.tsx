"use client";

import { motion } from "framer-motion";

/**
 * 2D parallax dawn scene with an animated runner.
 * Pure SVG + CSS — no Three.js, no heavy deps.
 * Layers from back to front: sky → mountains → hills → sun → trees →
 * track perspective lines → runner.
 */
export function HeroRunnerScene(): React.ReactNode {
  return (
    <div className="relative w-full aspect-square max-w-[560px] mx-auto lg:mx-0 lg:ml-auto">
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full drop-shadow-[0_20px_60px_rgba(237,108,15,0.15)]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          {/* Sky gradient — dawn warm */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE4CB" />
            <stop offset="45%" stopColor="#FFF5EC" />
            <stop offset="100%" stopColor="#FAF7F2" />
          </linearGradient>

          {/* Sun glow */}
          <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FFA665" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#FFA665" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFA665" stopOpacity="0" />
          </radialGradient>

          {/* Track gradient */}
          <linearGradient id="track" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FAF7F2" stopOpacity="0" />
            <stop offset="100%" stopColor="#EAE4DA" stopOpacity="0.7" />
          </linearGradient>

          {/* Frame border — soft squircle */}
          <clipPath id="frame">
            <rect x="0" y="0" width="600" height="600" rx="60" />
          </clipPath>
        </defs>

        <g clipPath="url(#frame)">
          {/* Sky */}
          <rect width="600" height="600" fill="url(#sky)" />

          {/* Sun glow halo */}
          <circle cx="430" cy="190" r="220" fill="url(#sunGlow)" />

          {/* Sun core (pulses) */}
          <motion.circle
            cx="430"
            cy="190"
            r="46"
            fill="#FA8836"
            initial={{ opacity: 0.85, scale: 1 }}
            animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.04, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "430px 190px" }}
          />

          {/* Distant mountains */}
          <path
            d="M 0 380 L 80 320 L 150 360 L 230 290 L 320 340 L 410 280 L 500 330 L 600 300 L 600 600 L 0 600 Z"
            fill="#2D6A4F"
            fillOpacity="0.14"
          />

          {/* Mid hills */}
          <path
            d="M 0 430 L 90 400 L 180 425 L 270 395 L 360 420 L 460 390 L 560 415 L 600 405 L 600 600 L 0 600 Z"
            fill="#2D6A4F"
            fillOpacity="0.22"
          />

          {/* Tree silhouettes — far row */}
          <Trees baseY={428} count={6} variant="far" />
          {/* Tree silhouettes — mid row, parallax left-shift */}
          <motion.g
            initial={{ x: 0 }}
            animate={{ x: -30 }}
            transition={{
              duration: 14,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <Trees baseY={462} count={5} variant="mid" />
          </motion.g>

          {/* Ground / track band */}
          <rect x="0" y="470" width="600" height="130" fill="url(#track)" />

          {/* Perspective track lane lines — animated dash drift creates speed */}
          <g>
            {[
              { y1: 510, y2: 530, opacity: 0.45 },
              { y1: 540, y2: 560, opacity: 0.6 },
              { y1: 570, y2: 590, opacity: 0.75 },
            ].map((lane, i) => (
              <motion.line
                key={i}
                x1="-40"
                y1={lane.y1}
                x2="640"
                y2={lane.y2}
                stroke="#ED6C0F"
                strokeWidth={2}
                strokeOpacity={lane.opacity}
                strokeDasharray="14 22"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -360 }}
                transition={{
                  duration: 2.4 - i * 0.3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
          </g>

          {/* Floating dust particles */}
          {[
            { cx: 120, cy: 320, r: 3, dur: 7 },
            { cx: 180, cy: 240, r: 2, dur: 9 },
            { cx: 350, cy: 280, r: 2.5, dur: 8 },
            { cx: 470, cy: 350, r: 2, dur: 10 },
            { cx: 540, cy: 260, r: 1.5, dur: 11 },
            { cx: 80, cy: 410, r: 2, dur: 6.5 },
          ].map((p, i) => (
            <motion.circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill="#ED6C0F"
              fillOpacity="0.45"
              initial={{ y: 0, opacity: 0.4 }}
              animate={{
                y: [-8, 8, -8],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: p.dur,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.4,
              }}
            />
          ))}

          {/* The runner — silhouette mid-stride with subtle bob + arm/leg cycle */}
          <Runner />
        </g>

        {/* Soft inner highlight border */}
        <rect
          x="2"
          y="2"
          width="596"
          height="596"
          rx="58"
          fill="none"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1"
        />
      </svg>

      {/* Floating chip badges over the scene */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute top-8 left-4 sm:left-8 hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/85 backdrop-blur shadow-soft text-xs font-medium text-ink-900"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-pulse" />
        Live · 4 events tracking
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        className="absolute bottom-8 right-4 sm:right-6 hidden sm:block"
      >
        <div className="px-4 py-3 rounded-2xl bg-white/90 backdrop-blur shadow-lift border border-ink-100">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-500">
            This week
          </p>
          <p className="font-display text-xl text-ink-900 tabular leading-none mt-1">
            ₹4,52,300
          </p>
          <p className="text-xs text-ink-500 mt-0.5">raised · 6 events</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ----- Sub components ----- */

function Trees({
  baseY,
  count,
  variant,
}: {
  baseY: number;
  count: number;
  variant: "far" | "mid";
}): React.ReactNode {
  const fill = variant === "far" ? "#1B4332" : "#22513D";
  const opacity = variant === "far" ? 0.32 : 0.55;
  const scale = variant === "far" ? 0.7 : 1;
  const trees = Array.from({ length: count }).map((_, i) => {
    const x = 30 + (i * 600) / count + (i % 2 === 0 ? 10 : -10);
    return { x, y: baseY };
  });
  return (
    <g fill={fill} fillOpacity={opacity}>
      {trees.map((t, i) => {
        const h = 22 * scale + (i % 3) * 6 * scale;
        const w = 14 * scale;
        return (
          <g key={i} transform={`translate(${t.x}, ${t.y})`}>
            {/* Trunk */}
            <rect x={-1.5 * scale} y={0} width={3 * scale} height={h * 0.4} fill={fill} />
            {/* Foliage triangle */}
            <path
              d={`M ${-w} ${0} L 0 ${-h} L ${w} ${0} Z`}
            />
          </g>
        );
      })}
    </g>
  );
}

function Runner(): React.ReactNode {
  // Runner positioned at mid-bottom of the frame, slightly left of center.
  return (
    <motion.g
      initial={{ y: 0 }}
      animate={{ y: [0, -5, 0] }}
      transition={{
        duration: 0.55,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{ transformOrigin: "300px 480px" }}
    >
      <g transform="translate(280, 480)">
        {/* Soft shadow under runner */}
        <ellipse
          cx="0"
          cy="76"
          rx="38"
          ry="6"
          fill="#1A1612"
          fillOpacity="0.18"
        />

        {/* Body group — slight forward lean */}
        <g transform="rotate(-6)">
          {/* Head */}
          <circle cx="0" cy="-90" r="14" fill="#ED6C0F" />
          {/* Cap detail */}
          <path
            d="M -12 -94 Q 0 -106 12 -94 L 12 -90 L -12 -90 Z"
            fill="#1A1612"
            opacity="0.85"
          />
          {/* Hair strand */}
          <path
            d="M 12 -88 Q 18 -82 14 -78"
            stroke="#1A1612"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Torso */}
          <path
            d="M -8 -78 L 4 -78 L 8 -22 L -10 -22 Z"
            fill="#1A1612"
          />
          {/* Shirt accent stripe */}
          <path
            d="M -6 -60 L 4 -60 L 6 -50 L -7 -50 Z"
            fill="#ED6C0F"
          />

          {/* Back arm (swung forward) */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -22, 0, 22, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "-4px -70px" }}
          >
            <path
              d="M -4 -70 Q -22 -56 -28 -34"
              stroke="#1A1612"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="-28" cy="-34" r="6" fill="#1A1612" />
          </motion.g>

          {/* Front arm (swung back) */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 22, 0, -22, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "2px -70px" }}
          >
            <path
              d="M 2 -70 Q 22 -54 26 -38"
              stroke="#1A1612"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="26" cy="-38" r="6" fill="#1A1612" />
          </motion.g>

          {/* Front leg (extended) */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 18, 0, -18, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "-1px -22px" }}
          >
            <path
              d="M -1 -22 L 18 22 L 32 60"
              stroke="#1A1612"
              strokeWidth="13"
              strokeLinecap="round"
              fill="none"
            />
            {/* Shoe */}
            <path
              d="M 26 56 L 44 64 L 42 70 L 24 66 Z"
              fill="#ED6C0F"
            />
          </motion.g>

          {/* Back leg (lifted, mid-step) */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -18, 0, 18, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "-1px -22px" }}
          >
            <path
              d="M -1 -22 L -16 14 L -8 50"
              stroke="#1A1612"
              strokeWidth="13"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M -14 46 L -28 54 L -28 60 L -10 56 Z"
              fill="#ED6C0F"
            />
          </motion.g>
        </g>

        {/* Speed lines behind the runner */}
        <motion.g
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <line
            x1="-90"
            y1="-30"
            x2="-50"
            y2="-30"
            stroke="#ED6C0F"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <line
            x1="-110"
            y1="-10"
            x2="-65"
            y2="-10"
            stroke="#ED6C0F"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <line
            x1="-95"
            y1="15"
            x2="-55"
            y2="15"
            stroke="#ED6C0F"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </motion.g>
      </g>
    </motion.g>
  );
}
