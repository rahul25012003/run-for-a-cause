"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark";
  className?: string;
  type?: "button" | "submit";
  strength?: number;
}

export function MagneticButton({
  href,
  onClick,
  children,
  variant = "primary",
  className,
  type = "button",
  strength = 0.25,
}: MagneticButtonProps): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18 });
  const springY = useSpring(y, { stiffness: 220, damping: 18 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const handleLeave = (): void => {
    x.set(0);
    y.set(0);
  };

  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    dark: "btn-dark",
  }[variant];

  const inner = (
    <motion.span
      style={{ x: springX, y: springY }}
      className={cn(variantClass, "px-7 py-3.5 text-base", className)}
    >
      {children}
    </motion.span>
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="inline-block"
    >
      {href ? (
        <Link href={href}>{inner}</Link>
      ) : (
        <button type={type} onClick={onClick} className="contents">
          {inner}
        </button>
      )}
    </div>
  );
}
