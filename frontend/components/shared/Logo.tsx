import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  /** Override the inline SVG with an uploaded logo image. */
  imageUrl?: string | null;
}

export function Logo({
  className,
  variant = "default",
  imageUrl,
}: LogoProps): React.ReactNode {
  const textColor = variant === "light" ? "text-white" : "text-ink-900";
  const accent = variant === "light" ? "text-primary-300" : "text-primary-500";

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 group",
        textColor,
        className,
      )}
      aria-label="RunForACause home"
    >
      {/* Squircle logomark — matches the PWA icon shape */}
      <span
        className="relative flex items-center justify-center w-8 h-8 overflow-hidden transition-transform group-hover:scale-105 flex-shrink-0"
        style={{ borderRadius: "30%" }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden
          >
            {/* Background gradient */}
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F08534" />
                <stop offset="100%" stopColor="#C9520B" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9.6" fill="url(#logoGrad)" />

            {/* Runner — profile view, running right, forward lean */}
            {/* Head */}
            <circle cx="20" cy="6.5" r="2.8" fill="white" />
            {/* Torso */}
            <line
              x1="19.5" y1="9.3" x2="16" y2="17.5"
              stroke="white" strokeWidth="2.8" strokeLinecap="round"
            />
            {/* Right arm forward-up */}
            <line
              x1="18.5" y1="11.2" x2="23.5" y2="8.8"
              stroke="white" strokeWidth="2.3" strokeLinecap="round"
            />
            {/* Left arm back */}
            <line
              x1="18" y1="11.8" x2="13.5" y2="14.5"
              stroke="white" strokeWidth="2.3" strokeLinecap="round"
            />
            {/* Left leg — forward stride */}
            <polyline
              points="16,17.5 18.5,23 17,28.5"
              fill="none"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right leg — push-off */}
            <polyline
              points="16,17.5 11.5,22.5 10,28"
              fill="none"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <span className="font-display text-[1.2rem] font-semibold tracking-tight leading-none">
        runfora<span className={accent}>cause</span>
      </span>
    </Link>
  );
}
