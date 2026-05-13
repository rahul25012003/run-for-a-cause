"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1800,
  formatter = (n) => Math.round(n).toLocaleString("en-IN"),
  className,
}: AnimatedCounterProps): React.ReactNode {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !hasStarted) {
            setHasStarted(true);
            const start = performance.now();
            const tick = (now: number): void => {
              const t = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3);
              setDisplayed(value * eased);
              if (t < 1) requestAnimationFrame(tick);
              else setDisplayed(value);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration, hasStarted]);

  return (
    <span ref={ref} className={className}>
      {formatter(displayed)}
    </span>
  );
}
