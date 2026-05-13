"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

interface Tilt3DProps {
  children: ReactNode;
  max?: number;
  scale?: number;
  glare?: boolean;
  className?: string;
}

// Softer spring — heavier mass + higher damping = no jitter, smooth glide.
const SPRING: SpringOptions = {
  stiffness: 120,
  damping: 28,
  mass: 1,
  restDelta: 0.001,
};

/**
 * Mouse-follow 3D tilt — soft, smooth, GPU-accelerated.
 * Wrap any card/block; on hover, content gently tilts toward the cursor
 * with optional shine overlay.
 */
export function Tilt3D({
  children,
  max = 4,
  scale = 1.012,
  glare = true,
  className,
}: Tilt3DProps): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-1, 1], [max, -max]), SPRING);
  const rotateY = useSpring(useTransform(x, [-1, 1], [-max, max]), SPRING);
  const glareX = useTransform(x, [-1, 1], ["0%", "100%"]);
  const glareY = useTransform(y, [-1, 1], ["0%", "100%"]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    x.set(cx * 2 - 1);
    y.set(cy * 2 - 1);
  };

  const handleLeave = (): void => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ perspective: 1400 }}
      className={className}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        whileHover={{ scale }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full h-full"
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: useTransform(
                [glareX, glareY],
                ([gx, gy]) =>
                  `radial-gradient(circle 280px at ${gx} ${gy}, rgba(255,255,255,0.12), transparent 70%)`,
              ),
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
