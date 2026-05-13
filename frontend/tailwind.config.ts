import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#FAF7F2",
          subtle: "#F2EEE7",
          deep: "#EAE4DA",
        },
        ink: {
          50: "#F4F0EA",
          100: "#E8E2DA",
          200: "#D4CCC1",
          300: "#ABA39B",
          400: "#857F77",
          500: "#6B6259",
          600: "#56504A",
          700: "#3D352D",
          800: "#2A2520",
          900: "#1A1612",
        },
        primary: {
          50: "#FFF5EC",
          100: "#FFE4CB",
          200: "#FFC79A",
          300: "#FFA665",
          400: "#FA8836",
          500: "#ED6C0F",
          600: "#D45D08",
          700: "#A94905",
          800: "#7C3603",
          900: "#5C2A03",
        },
        secondary: {
          50: "#F1F7F3",
          100: "#DEEEDF",
          200: "#B6D6BE",
          300: "#85B795",
          400: "#52966E",
          500: "#2D6A4F",
          600: "#22513D",
          700: "#1B4332",
          800: "#102B1E",
          900: "#081A11",
        },
        gold: {
          50: "#FBF5DD",
          100: "#FAF1D0",
          400: "#D9A60A",
          500: "#BF9000",
          600: "#9C7700",
        },
        danger: {
          50: "#FCEEEA",
          500: "#A93D2C",
          600: "#8C2F20",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        condensed: ['"Barlow Condensed"', "ui-sans-serif", "sans-serif"],
      },
      fontSize: {
        "display-2xl": ["clamp(3.5rem, 7vw, 5.5rem)", { lineHeight: "1", letterSpacing: "-0.04em" }],
        "display-xl": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(1.5rem, 3vw, 2.25rem)", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 4px rgba(26, 22, 18, 0.04), 0 1px 2px rgba(26, 22, 18, 0.06)",
        card: "0 4px 12px rgba(26, 22, 18, 0.06), 0 2px 4px rgba(26, 22, 18, 0.04)",
        lift: "0 16px 40px rgba(26, 22, 18, 0.08), 0 4px 12px rgba(26, 22, 18, 0.05)",
        glow: "0 0 40px rgba(237, 108, 15, 0.20)",
        ring: "0 0 0 1px rgba(26, 22, 18, 0.08), 0 1px 3px rgba(26, 22, 18, 0.05)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-down": "slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
