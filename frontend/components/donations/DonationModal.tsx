"use client";

import { useEffect, useState } from "react";
import {
  X,
  Heart,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { DonationCreatePayload, DonationCreateResponse } from "@/types";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact?: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  eventRunnerId: string;
  runnerName: string;
  runnerGoalKm?: number;
  is80gEligible: boolean;
}

type Step = "type" | "details" | "success";

export function DonationModal({
  open,
  onClose,
  eventRunnerId,
  runnerName,
  runnerGoalKm = 100,
  is80gEligible,
}: DonationModalProps): React.ReactNode {
  const [step, setStep] = useState<Step>("type");
  const [donationType, setDonationType] = useState<"per_km" | "fixed">("fixed");
  const [amountPerKm, setAmountPerKm] = useState<string>("50");
  const [maxCap, setMaxCap] = useState<string>("5000");
  const [fixedAmount, setFixedAmount] = useState<string>("1000");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("type");
  }, [open]);

  if (!open) return null;

  const estimated =
    donationType === "fixed"
      ? Number(fixedAmount) || 0
      : Math.min(
          (Number(amountPerKm) || 0) * runnerGoalKm,
          Number(maxCap) || (Number(amountPerKm) || 0) * runnerGoalKm,
        );

  const handlePay = async (): Promise<void> => {
    if (!donorName || !donorEmail) {
      toast.error("Please fill your name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: DonationCreatePayload = {
        event_runner_id: eventRunnerId,
        donor_name: donorName,
        donor_email: donorEmail,
        donor_phone: donorPhone || undefined,
        is_anonymous: isAnonymous,
        donation_type: donationType,
        message: message || undefined,
      };
      if (donationType === "per_km") {
        payload.amount_per_km = Number(amountPerKm);
        payload.max_cap_amount = Number(maxCap) || estimated;
      } else {
        payload.fixed_amount = Number(fixedAmount);
      }

      const response = await api.post<DonationCreateResponse>(
        "/donations",
        payload,
      );

      const isMockOrder = response.razorpay_order.id.startsWith("order_mock_");

      if (isMockOrder) {
        // Demo / staging mode: dummy Razorpay keys are configured.
        // Skip the real Razorpay checkout and verify directly with mock creds.
        await api.post("/payments/verify", {
          donation_id: response.donation.id,
          razorpay_order_id: response.razorpay_order.id,
          razorpay_payment_id: `pay_mock_${response.donation.id.replace(/-/g, "").slice(0, 12)}`,
          razorpay_signature: "mock_signature",
        });
        setStep("success");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ED6C0F", "#2D6A4F", "#BF9000"],
        });
        setSubmitting(false);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        toast.error("Could not load payment SDK.");
        setSubmitting(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: response.razorpay_key_id,
        amount: response.razorpay_order.amount,
        currency: response.razorpay_order.currency,
        name: "RunForACause",
        description: `Sponsoring ${runnerName}`,
        order_id: response.razorpay_order.id,
        prefill: {
          name: donorName,
          email: donorEmail,
          contact: donorPhone || undefined,
        },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", {
              donation_id: response.donation.id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setStep("success");
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#ED6C0F", "#2D6A4F", "#BF9000"],
            });
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Payment verification failed. Contact support if money was deducted.",
            );
          } finally {
            setSubmitting(false);
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
        theme: { color: "#ED6C0F" },
      });
      rzp.open();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lift scrollbar-thin"
      >
        <header className="flex items-center justify-between p-5 border-b border-ink-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="font-display text-lg text-ink-900">
              {step === "success" ? "Thank you" : `Sponsor ${runnerName.split(" ")[0]}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-ink-50 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === "type" && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <p className="text-sm text-ink-600 mb-5">
                  Choose how you&apos;d like to support {runnerName.split(" ")[0]}.
                </p>
                <ChoiceCard
                  selected={false}
                  onClick={() => {
                    setDonationType("per_km");
                    setStep("details");
                  }}
                  title="Per kilometre"
                  description={`₹X for every km ${runnerName.split(" ")[0]} runs · capped at your max`}
                  recommended
                />
                <ChoiceCard
                  selected={false}
                  onClick={() => {
                    setDonationType("fixed");
                    setStep("details");
                  }}
                  title="Fixed amount"
                  description="Donate a specific amount today, regardless of distance"
                />
              </motion.div>
            )}

            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {donationType === "per_km" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="₹ per km" required>
                        <input
                          type="number"
                          value={amountPerKm}
                          onChange={(e) => setAmountPerKm(e.target.value)}
                          className="input"
                        />
                      </Field>
                      <Field label="Max cap (₹)" required>
                        <input
                          type="number"
                          value={maxCap}
                          onChange={(e) => setMaxCap(e.target.value)}
                          className="input"
                        />
                      </Field>
                    </div>
                    <div className="rounded-xl bg-canvas-subtle p-3 text-sm text-ink-700">
                      Estimated if {runnerName.split(" ")[0]} hits {runnerGoalKm} km goal:{" "}
                      <strong className="font-mono tabular text-ink-900">
                        {formatCurrency(estimated)}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Donation amount (₹)" required>
                      <input
                        type="number"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(e.target.value)}
                        className="input-lg font-mono tabular text-center"
                      />
                    </Field>
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2500, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFixedAmount(String(amt))}
                          className={cn(
                            "py-2 rounded-lg text-sm font-mono tabular border transition",
                            Number(fixedAmount) === amt
                              ? "bg-primary-500 text-white border-primary-500"
                              : "bg-white text-ink-700 border-ink-200 hover:border-ink-300",
                          )}
                        >
                          ₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="pt-2 space-y-3">
                  <Field label="Your name" required>
                    <input
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label="Email" required>
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <input
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label="Personal note (optional)">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      className="input"
                      maxLength={200}
                      placeholder={`Message ${runnerName.split(" ")[0]}…`}
                    />
                  </Field>
                  <label className="flex items-center gap-2.5 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded text-primary-500 focus:ring-primary-500/30"
                    />
                    Donate anonymously
                  </label>
                </div>

                {is80gEligible && (
                  <div className="rounded-xl bg-secondary-50 border border-secondary-200 p-3 text-xs text-secondary-700 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      80G tax receipt will be emailed automatically after payment.
                    </span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep("type")}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePay}
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Pay {formatCurrency(estimated)}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-ink-400 text-center">
                  Secured by Razorpay · 256-bit encryption
                </p>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-6"
              >
                <div className="inline-flex w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 items-center justify-center shadow-glow">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
                <h3 className="mt-6 font-display text-2xl text-ink-900">
                  You&apos;re sponsoring {runnerName.split(" ")[0]}!
                </h3>
                <p className="mt-2 text-ink-600 leading-relaxed text-sm">
                  A confirmation is on its way to{" "}
                  <span className="font-semibold text-ink-900">
                    {donorEmail}
                  </span>
                  . You&apos;ll get progress updates as {runnerName.split(" ")[0]} runs.
                </p>
                <button onClick={onClose} className="btn-primary mt-7 w-full">
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  recommended,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  recommended?: boolean;
}): React.ReactNode {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group hover:border-primary-500 hover:bg-primary-50/40",
        selected ? "border-primary-500 bg-primary-50/40" : "border-ink-100",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-lg text-ink-900">{title}</p>
        {recommended && (
          <span className="text-[10px] font-bold tracking-wider uppercase text-primary-600">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-600 leading-relaxed">{description}</p>
      <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary-600 font-semibold opacity-0 group-hover:opacity-100 transition">
        Continue <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <label className="block">
      <span className="label">
        {label} {required && <span className="text-danger-500">*</span>}
      </span>
      {children}
    </label>
  );
}
