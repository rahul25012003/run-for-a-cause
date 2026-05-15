"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Heart, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/types";

interface JoinEventButtonProps {
  eventId: string;
  eventTitle: string;
  /** Distance goal in km (pre-fills the form) */
  goalKm?: number;
  className?: string;
}

interface JoinPayload {
  personal_story?: string;
  personal_goal_km?: number;
  personal_goal_amount?: number;
}

export function JoinEventButton({
  eventId,
  eventTitle,
  goalKm = 100,
  className,
}: JoinEventButtonProps): React.ReactNode {
  const router = useRouter();
  const [me, setMe] = useState<UserPublic | null | "loading">("loading");
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [story, setStory] = useState("");
  const [goalKmVal, setGoalKmVal] = useState(String(goalKm));
  const [goalAmount, setGoalAmount] = useState("25000");
  const storyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api
      .get<UserPublic>("/auth/me")
      .then((u) => setMe(u))
      .catch(() => setMe(null));
  }, []);

  // Note: checking already-joined status is handled by the 409 Conflict
  // response from the backend on submit — no separate pre-check needed.

  useEffect(() => {
    if (open && storyRef.current) {
      storyRef.current.focus();
    }
  }, [open]);

  const handleJoin = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const payload: JoinPayload = {};
      if (story.trim()) payload.personal_story = story.trim();
      if (goalKmVal && Number(goalKmVal) > 0)
        payload.personal_goal_km = Number(goalKmVal);
      if (goalAmount && Number(goalAmount) > 0)
        payload.personal_goal_amount = Number(goalAmount);

      await api.post(`/events/${eventId}/runners`, payload);
      setOpen(false);
      setAlreadyJoined(true);
      toast.success(
        "Application submitted — the event manager will review and approve.",
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setOpen(false);
        setAlreadyJoined(true);
        toast.info("You've already applied for this event.");
      } else {
        toast.error(
          err instanceof ApiError
            ? err.detail ?? err.message
            : "Could not join event",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (me === "loading") {
    return (
      <span className={cn("btn-primary btn-sm opacity-50 cursor-wait", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </span>
    );
  }

  // Not logged in → go to register
  if (!me) {
    return (
      <a
        href={`/register?role=runner&event=${eventId}`}
        className={cn("btn-primary btn-sm inline-flex items-center gap-1.5", className)}
      >
        <Heart className="w-3.5 h-3.5" /> Join as runner
      </a>
    );
  }

  // Logged in but not a runner (manager/admin) → show nothing meaningful
  if (me.role !== "runner") {
    return (
      <a
        href={`/register?role=runner&event=${eventId}`}
        className={cn("btn-primary btn-sm inline-flex items-center gap-1.5", className)}
      >
        <Heart className="w-3.5 h-3.5" /> Join as runner
      </a>
    );
  }

  // Already joined
  if (alreadyJoined) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary-50 border border-secondary-200 text-secondary-700 text-sm font-semibold", className)}>
        <CheckCircle2 className="w-3.5 h-3.5" /> Applied — pending approval
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn("btn-primary btn-sm inline-flex items-center gap-1.5", className)}
      >
        <Heart className="w-3.5 h-3.5" /> Join as runner
      </button>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl w-full max-w-md shadow-lift overflow-hidden"
            >
              <header className="flex items-center justify-between p-5 border-b border-ink-100">
                <h2 className="font-display text-lg text-ink-900">
                  Join "{eventTitle}"
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 -mr-2 hover:bg-ink-50 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="p-6 space-y-4">
                <p className="text-sm text-ink-600 leading-relaxed">
                  The event manager will review your application and approve
                  it. Once approved, your fundraising page goes live.
                </p>

                <label className="block">
                  <span className="label">
                    Why are you running for this cause? <span className="text-ink-400 font-normal">(optional)</span>
                  </span>
                  <textarea
                    ref={storyRef}
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="input mt-1.5"
                    placeholder="Share your motivation — donors love personal stories…"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">Distance goal (km)</span>
                    <input
                      type="number"
                      value={goalKmVal}
                      onChange={(e) => setGoalKmVal(e.target.value)}
                      min={1}
                      className="input mt-1.5 font-mono tabular"
                    />
                  </label>
                  <label className="block">
                    <span className="label">Fundraising goal (₹)</span>
                    <input
                      type="number"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                      min={0}
                      className="input mt-1.5 font-mono tabular"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Apply to join"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
