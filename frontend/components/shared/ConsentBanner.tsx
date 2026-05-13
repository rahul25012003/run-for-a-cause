"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, BarChart3, Megaphone, X } from "lucide-react";

interface ConsentState {
  essential: true; // always true, locked
  analytics: boolean;
  marketing: boolean;
  decided_at: number;
}

const STORAGE_KEY = "rfac_consent_v1";
// Custom event name footer "Cookies preferences" link dispatches to re-open
// the banner from anywhere on the site.
export const REOPEN_EVENT = "rfac:open-consent";

declare global {
  interface Window {
    __rfacConsent?: ConsentState;
  }
}

function readStored(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    // Basic shape guard
    if (typeof parsed.decided_at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: ConsentState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.__rfacConsent = state;
  // Notify listeners (analytics scripts, marketing pixels) so they can flip
  // on/off without a page reload.
  window.dispatchEvent(new CustomEvent("rfac:consent-changed", { detail: state }));
}

export function ConsentBanner(): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      window.__rfacConsent = stored;
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    } else {
      // First visit — show after a short delay so it doesn't fight page entrance
      const t = window.setTimeout(() => setOpen(true), 1200);
      return () => window.clearTimeout(t);
    }
  }, []);

  // Listen for footer link to re-open
  useEffect(() => {
    const handler = (): void => {
      const stored = readStored();
      if (stored) {
        setAnalytics(stored.analytics);
        setMarketing(stored.marketing);
      }
      setOpen(true);
    };
    window.addEventListener(REOPEN_EVENT, handler);
    return () => window.removeEventListener(REOPEN_EVENT, handler);
  }, []);

  const decide = (a: boolean, m: boolean): void => {
    persist({ essential: true, analytics: a, marketing: m, decided_at: Date.now() });
    setAnalytics(a);
    setMarketing(m);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-3 inset-x-3 md:bottom-4 md:left-auto md:right-4 z-[60] max-w-md md:w-[420px] rounded-2xl bg-ink-900 text-white shadow-lift overflow-hidden border border-white/10"
          role="dialog"
          aria-label="Cookie preferences"
        >
          {/* Decorative orb */}
          <div
            aria-hidden
            className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-primary-500/30 blur-2xl pointer-events-none"
          />
          <div className="relative p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-primary-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg leading-tight">
                  Your cookies, your call.
                </h3>
                <p className="mt-1 text-sm text-white/65 leading-relaxed">
                  Essential cookies keep the site running. Anything more, you
                  pick. Read our{" "}
                  <a
                    href="/privacy"
                    className="underline underline-offset-2 hover:text-white"
                  >
                    privacy policy
                  </a>
                  .
                </p>
              </div>
              <button
                onClick={() => decide(false, false)}
                aria-label="Reject all and close"
                className="flex-shrink-0 w-7 h-7 rounded-md hover:bg-white/5 text-white/50 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="space-y-2.5 mb-5">
              <Toggle
                icon={<ShieldCheck className="w-4 h-4" />}
                title="Essential"
                description="Login, security, basic site function. Required."
                checked={true}
                disabled
                onChange={() => undefined}
              />
              <Toggle
                icon={<BarChart3 className="w-4 h-4" />}
                title="Analytics"
                description="Anonymous usage stats so we can improve the site."
                checked={analytics}
                onChange={setAnalytics}
              />
              <Toggle
                icon={<Megaphone className="w-4 h-4" />}
                title="Marketing"
                description="Help us reach more donors with relevant updates."
                checked={marketing}
                onChange={setMarketing}
              />
            </ul>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => decide(false, false)}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/85 text-xs font-semibold rounded-lg transition"
              >
                Reject all
              </button>
              <button
                onClick={() => decide(analytics, marketing)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition"
              >
                Save selection
              </button>
              <button
                onClick={() => decide(true, true)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition"
              >
                Accept all
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}): React.ReactNode {
  return (
    <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.03]">
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-primary-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 leading-tight">
          {title}
          {disabled && (
            <span className="ml-2 text-[9px] uppercase tracking-[0.18em] text-white/40 font-bold">
              always on
            </span>
          )}
        </p>
        <p className="text-xs text-white/55 mt-0.5 leading-snug">
          {description}
        </p>
      </div>
      <label className="flex-shrink-0 cursor-pointer relative inline-block w-9 h-5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span
          className={`absolute inset-0 rounded-full transition ${
            checked ? "bg-primary-500" : "bg-white/15"
          } peer-disabled:opacity-50`}
        />
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[calc(100%-1.125rem)]" : "left-0.5"
          }`}
        />
      </label>
    </li>
  );
}
