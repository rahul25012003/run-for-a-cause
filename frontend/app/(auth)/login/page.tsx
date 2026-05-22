"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { AuthResponse } from "@/types";

type Tab = "email" | "phone";

/** Keep retrying until the backend responds or the 90s budget runs out.
 *  Network errors and 5xx responses are retried; auth errors are not. */
async function withWarmupRetry<T>(fn: () => Promise<T>): Promise<T> {
  const BUDGET_MS = 90_000;
  const start = Date.now();
  let toastId: string | number | undefined;

  for (;;) {
    try {
      if (toastId != null) toast.dismiss(toastId);
      return await fn();
    } catch (err) {
      const elapsed = Date.now() - start;
      const isRetryable =
        err instanceof TypeError ||
        (err instanceof ApiError && err.status >= 500);
      if (!isRetryable || elapsed >= BUDGET_MS) {
        if (toastId != null) toast.dismiss(toastId);
        throw err;
      }
      const remaining = Math.round((BUDGET_MS - elapsed) / 1000);
      toastId = toast.loading(
        elapsed < 15_000
          ? "Server is warming up — please wait…"
          : `Still starting up… (${remaining}s left)`,
        toastId != null ? { id: toastId } : undefined,
      );
      await new Promise((r) => setTimeout(r, elapsed < 20_000 ? 10_000 : 20_000));
    }
  }
}

export default function LoginPage(): React.ReactNode {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("email");

  // Email path
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Phone path
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState<"phone" | "code">("phone");
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

  const onEmailSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await withWarmupRetry(() =>
        api.post<AuthResponse>("/auth/login", { email, password }),
      );
      toast.success(`Welcome back, ${res.user.full_name.split(" ")[0]}`);
      const dest =
        res.user.role === "super_admin" ? "/admin"
        : res.user.role === "event_manager" ? "/manager"
        : res.user.role === "runner" ? "/runner"
        : "/account";
      router.push(dest);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Login failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestOtp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPhoneSubmitting(true);
    try {
      await withWarmupRetry(() =>
        api.post("/auth/sms-otp/request", { phone }),
      );
      toast.success("If a matching account exists, an OTP was sent.");
      setOtpStage("code");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Couldn't send OTP",
      );
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPhoneSubmitting(true);
    try {
      const res = await withWarmupRetry(() =>
        api.post<AuthResponse>("/auth/sms-otp/verify", { phone, otp }),
      );
      toast.success(`Welcome back, ${res.user.full_name.split(" ")[0]}`);
      const dest =
        res.user.role === "super_admin" ? "/admin"
        : res.user.role === "event_manager" ? "/manager"
        : res.user.role === "runner" ? "/runner"
        : "/account";
      router.push(dest);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Verification failed",
      );
    } finally {
      setPhoneSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <span className="eyebrow">Welcome back</span>
      <h1 className="mt-3 font-display text-display-md text-ink-900">
        Sign in to keep running.
      </h1>
      <p className="mt-3 text-ink-500">
        Pick up where you left off — your dashboard, donors, and progress are
        waiting.
      </p>

      <div
        className="mt-8 inline-flex rounded-lg bg-ink-50 p-1"
        role="tablist"
        aria-label="Sign-in method"
      >
        {(
          [
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
          ] as { value: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${
              tab === t.value ? "bg-white text-ink-900 shadow-soft" : "text-ink-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "email" ? (
        <form onSubmit={onEmailSubmit} className="mt-6 space-y-5">
          <Field label="Email" Icon={Mail}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-11"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>

          <label className="block">
            <span className="label">Password</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-11 pr-11"
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-700 transition"
                aria-label={showPw ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-ink-600">
              <input
                type="checkbox"
                className="rounded border-ink-300 text-primary-500 focus:ring-primary-500/30"
              />
              Keep me signed in
            </label>
            <Link
              href="/forgot-password"
              className="text-primary-600 font-medium hover:underline underline-offset-4"
            >
              Forgot?
            </Link>
          </div>
          <button
            type="submit"
            className="btn-primary w-full py-3.5"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign in <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : otpStage === "phone" ? (
        <form onSubmit={requestOtp} className="mt-6 space-y-5">
          <Field label="Phone number" Icon={Phone}>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input pl-11 tabular"
              autoComplete="tel"
              placeholder="+91 98765 43210"
            />
          </Field>
          <p className="text-xs text-ink-500">
            We&apos;ll send a 6-digit code via SMS. The phone must already be on
            your account.
          </p>
          <button
            type="submit"
            className="btn-primary w-full py-3.5"
            disabled={phoneSubmitting}
          >
            {phoneSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Send OTP <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="mt-6 space-y-5">
          <p className="text-sm text-ink-600">
            Code sent to <span className="tabular font-medium">{phone}</span>.
            <button
              type="button"
              className="btn-link ml-2"
              onClick={() => {
                setOtpStage("phone");
                setOtp("");
              }}
            >
              Change
            </button>
          </p>
          <Field label="6-digit code" Icon={KeyRound}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="input pl-11 tabular text-lg tracking-widest"
              autoComplete="one-time-code"
              placeholder="123456"
              autoFocus
            />
          </Field>
          <button
            type="submit"
            className="btn-primary w-full py-3.5"
            disabled={phoneSubmitting || otp.length !== 6}
          >
            {phoneSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Verify &amp; sign in <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-ink-500">
        New here?{" "}
        <Link
          href="/register"
          className="text-primary-600 font-semibold hover:underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>

      <details className="mt-10 group">
        <summary className="text-xs text-ink-400 cursor-pointer hover:text-ink-700 select-none">
          Demo credentials →
        </summary>
        <div className="mt-3 p-4 rounded-xl bg-ink-50 border border-ink-100 text-xs text-ink-600 space-y-1.5 font-mono">
          <p>admin@runforacause.in · Admin@1234</p>
          <p>contact@ashafoundation.in · Manager@1234</p>
          <p>ravi.kumar@example.com · Runner@1234</p>
        </div>
      </details>
    </div>
  );
}

function Field({
  label,
  Icon,
  children,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        {children}
      </div>
    </label>
  );
}
