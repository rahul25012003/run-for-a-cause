"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface NewsletterFormProps {
  variant?: "compact" | "hero";
}

/**
 * Newsletter input. Two visual variants:
 *  - "compact" — narrow column form (icon-button, tight)
 *  - "hero"    — wide full-width form with prominent CTA, used in footer strip
 */
export function NewsletterForm({
  variant = "compact",
}: NewsletterFormProps): React.ReactNode {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email || status === "loading" || status === "success") return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      if (!res.ok) throw new Error(`Subscribe failed (${res.status})`);
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 6000);
    } catch {
      setStatus("error");
    }
  };

  const isHero = variant === "hero";
  const inputCls = isHero
    ? "flex-1 min-w-0 bg-transparent pl-12 pr-4 py-4 text-base text-white placeholder:text-white/35 outline-none disabled:opacity-60"
    : "flex-1 min-w-0 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-60";
  const wrapCls = isHero
    ? "relative flex items-stretch bg-white/[0.06] border border-white/15 rounded-2xl overflow-hidden focus-within:border-primary-400 focus-within:bg-white/[0.09] transition-all"
    : "relative flex items-stretch bg-white/5 border border-white/15 rounded-xl overflow-hidden focus-within:border-primary-500 focus-within:bg-white/[0.07] transition-all";
  const btnCls = isHero
    ? "flex-shrink-0 px-6 md:px-7 py-4 bg-primary-500 hover:bg-primary-600 active:scale-[0.97] text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-80 inline-flex items-center justify-center gap-2 min-w-[140px]"
    : "flex-shrink-0 px-4 py-3 bg-primary-500 hover:bg-primary-600 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-80 inline-flex items-center justify-center gap-1.5 min-w-[110px]";

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className={wrapCls}>
        {isHero && (
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
            aria-hidden
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "loading" || status === "success"}
          className={inputCls}
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className={btnCls}
          aria-label="Subscribe"
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === "loading" && (
              <motion.span
                key="loading"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="inline-flex items-center gap-1.5"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </motion.span>
            )}
            {status === "success" && (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" strokeWidth={3} /> Subscribed
              </motion.span>
            )}
            {(status === "idle" || status === "error") && (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5"
              >
                Subscribe
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      <div className="min-h-[20px] mt-2">
        <AnimatePresence>
          {status === "success" && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-secondary-300 font-medium"
            >
              ✓ You&apos;re in. First report lands soon.
            </motion.p>
          )}
          {status === "error" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-300"
            >
              Something went wrong. Try again.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
