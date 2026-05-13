"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

/**
 * One-click "Submit for review" for draft events. Calls
 * POST /events/{id}/submit → status becomes pending_approval.
 * Refreshes the page on success so the status badge updates.
 */
export function SubmitEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/events/${eventId}/submit`, {});
      toast.success("Event submitted for review. The admin will approve shortly.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail ?? err.message : "Submission failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={loading}
      className="btn-primary btn-sm inline-flex items-center gap-1.5"
      title="Submit this draft to the super-admin for approval"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Send className="w-3.5 h-3.5" />
      )}
      Submit for review
    </button>
  );
}
