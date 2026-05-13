"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

/** Detect iOS Safari (where beforeinstallprompt never fires). */
function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  // Don't show on Safari already installed as PWA
  return isIOS && !isStandalone;
}

// Persistent dismissal — survives browser restart for 14 days after the user
// explicitly says "Not now" or rejects the native install dialog.
const DISMISS_KEY = "rfac_pwa_install_dismissed_at";
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

// One-shot per browser session — once we've shown it (or it's been dismissed
// in this session), don't show it again until the user closes and reopens the
// browser. sessionStorage clears automatically when the tab closes.
const SESSION_SHOWN_KEY = "rfac_pwa_install_shown_this_session";

export function InstallPrompt(): React.ReactNode {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  // iOS Safari can't fire beforeinstallprompt — show manual instructions
  // ("tap Share, then Add to Home Screen") instead.
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    // Already shown this session? Don't show again until next browser open.
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;

    // Persistently dismissed within the last 14 days? Don't show.
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) return;

    // iOS path — no event, just check UA and show after a delay.
    if (isIOSSafari()) {
      const t = window.setTimeout(() => {
        if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;
        sessionStorage.setItem(SESSION_SHOWN_KEY, String(Date.now()));
        setIosMode(true);
        setOpen(true);
      }, 6000);
      return () => window.clearTimeout(t);
    }

    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Show after a short delay so it doesn't fight the page entrance.
      setTimeout(() => {
        // Re-check the session flag at fire time in case another tab opened
        // a prompt simultaneously and beat us to it.
        if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;
        sessionStorage.setItem(SESSION_SHOWN_KEY, String(Date.now()));
        setOpen(true);
      }, 4000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = (): void => {
    setOpen(false);
    sessionStorage.setItem(SESSION_SHOWN_KEY, String(Date.now()));
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async (): Promise<void> => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDeferred(null);
      setOpen(false);
    } else {
      dismiss();
    }
  };

  const visible = open && (deferred || iosMode);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 right-4 z-[60] max-w-sm w-[calc(100%-2rem)] rounded-2xl bg-ink-900 text-white shadow-lift overflow-hidden border border-white/10"
          role="dialog"
          aria-label="Install RunForACause"
        >
          <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-primary-500/30 blur-2xl pointer-events-none" />
          <div className="relative p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg leading-tight">
                  Install RunForACause
                </h3>
                {iosMode ? (
                  <>
                    <p className="mt-1 text-sm text-white/65 leading-relaxed">
                      Add to your home screen for full-screen, faster access.
                    </p>
                    <ol className="mt-3 space-y-2 text-sm text-white/85">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-[11px] font-bold flex items-center justify-center mt-0.5">
                          1
                        </span>
                        <span>
                          Tap the{" "}
                          <Share className="inline w-3.5 h-3.5 text-primary-300 mx-0.5 -translate-y-0.5" />
                          <strong>Share</strong> button below
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-[11px] font-bold flex items-center justify-center mt-0.5">
                          2
                        </span>
                        <span>
                          Scroll &amp; tap{" "}
                          <Plus className="inline w-3.5 h-3.5 text-primary-300 mx-0.5 -translate-y-0.5" />
                          <strong>Add to Home Screen</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-[11px] font-bold flex items-center justify-center mt-0.5">
                          3
                        </span>
                        <span>Tap <strong>Add</strong> — done.</span>
                      </li>
                    </ol>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={dismiss}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 text-sm rounded-lg transition"
                      >
                        Got it
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-white/65 leading-relaxed">
                      One tap to your home screen. Faster, full-screen, log
                      distance on the go.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={install}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition active:scale-[0.97]"
                      >
                        Install
                      </button>
                      <button
                        onClick={dismiss}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 text-sm rounded-lg transition"
                      >
                        Not now
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={dismiss}
                aria-label="Close"
                className="flex-shrink-0 w-7 h-7 rounded-md hover:bg-white/5 text-white/50 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
