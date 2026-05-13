import type { Metadata } from "next";
import {
  Inter,
  Fraunces,
  JetBrains_Mono,
  Barlow_Condensed,
} from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { ScrollProgress } from "@/components/shared/ScrollProgress";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import { ConsentBanner } from "@/components/shared/ConsentBanner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RunForACause — Every kilometre counts",
    template: "%s · RunForACause",
  },
  description:
    "India's most transparent crowd-funding run platform. Run for a cause you believe in; donors sponsor every kilometre.",
  keywords: [
    "fundraising",
    "running",
    "NGO",
    "donation",
    "India",
    "transparency",
    "80G",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // iOS home-screen-installed PWA: capable=true switches to standalone
    // display, statusBarStyle "black-translucent" lets our brand orange
    // theme-color paint behind the status bar
    capable: true,
    title: "RunForACause",
    statusBarStyle: "black-translucent",
  },
  icons: {
    // SVG favicon for modern browsers; PNG fallback for legacy
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    // iOS Safari home-screen icon must be PNG
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: "RunForACause",
    description: "Every kilometre counts.",
    type: "website",
    locale: "en_IN",
  },
};

export const viewport = {
  themeColor: "#ED6C0F",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // viewportFit=cover lets the page paint behind the iOS notch + home
  // indicator. Components that need to avoid those zones use
  // pb-[env(safe-area-inset-bottom)] etc.
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable} ${condensed.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-canvas text-ink-900 antialiased"
        suppressHydrationWarning
      >
        <QueryProvider>
          <ScrollProgress />
          {children}
          <InstallPrompt />
          <ConsentBanner />
          <Toaster
            richColors
            position="top-center"
            toastOptions={{
              style: {
                fontFamily: "var(--font-inter)",
                borderRadius: "12px",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
