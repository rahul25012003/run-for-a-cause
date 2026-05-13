"use client";

import { useEffect, useRef } from "react";

interface CanvasParticlesProps {
  density?: number;
  color?: string;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  baseAlpha: number;
}

export function CanvasParticles({
  density = 80,
  color = "#ED6C0F",
  className,
}: CanvasParticlesProps): React.ReactNode {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let particles: Particle[] = [];
    let raf = 0;

    const resize = (): void => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      const target = Math.max(20, Math.round((width * height) / 14000));
      const count = Math.min(density, target);
      particles = Array.from({ length: count }, () => {
        const baseAlpha = 0.15 + Math.random() * 0.55;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 0.6 + Math.random() * 1.6,
          alpha: baseAlpha,
          baseAlpha,
        };
      });
    };

    const tick = (): void => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() * 0.001;
      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t + p.x * 0.01));
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density, color]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
