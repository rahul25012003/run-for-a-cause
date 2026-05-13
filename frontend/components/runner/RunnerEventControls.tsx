"use client";

import { useEffect, useState } from "react";
import { Loader2, Users2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { CheckInQR } from "@/components/runner/CheckInQR";

interface Team {
  id: string;
  name: string;
  member_count: number;
}

/**
 * Per-event runner card add-ons (D2 join + D8 QR).
 *
 * - Shows the team picker only if the event has at least one team
 *   (auto-hides on events the manager hasn't set up teams for).
 * - Always shows the check-in QR — even on virtual events. The runner
 *   can ignore it; for in-person events the manager scans it.
 */
export function RunnerEventControls({
  eventRunnerId,
  eventId,
  currentTeamId,
}: {
  eventRunnerId: string;
  eventId: string;
  currentTeamId: string | null;
}): React.ReactNode {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selected, setSelected] = useState<string>(currentTeamId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<Team[]>(`/events/${eventId}/teams`);
        setTeams(list);
      } catch {
        setTeams([]);
      }
    })();
  }, [eventId]);

  const join = async (teamId: string) => {
    setSaving(true);
    try {
      await api.put(`/event-runners/${eventRunnerId}/team`, {
        team_id: teamId || null,
      });
      setSelected(teamId);
      toast.success(teamId ? "Joined team" : "Left team");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Team picker — hidden when no teams exist for this event */}
      {teams && teams.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Users2 className="h-4 w-4 text-primary-500" aria-hidden />
            <p className="font-semibold text-ink-900 text-sm">Team</p>
            {saving && (
              <Loader2 className="h-3 w-3 animate-spin text-ink-400 ml-1" />
            )}
          </div>
          <p className="text-xs text-ink-500 mb-3">
            Pick a team to roll your fundraising into a group total on the
            public leaderboard.
          </p>
          <select
            value={selected}
            onChange={(e) => join(e.target.value)}
            disabled={saving}
            className="input w-full"
            aria-label="Select team"
          >
            <option value="">— No team —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.member_count})
              </option>
            ))}
          </select>
        </div>
      )}

      <CheckInQR eventRunnerId={eventRunnerId} size={140} />
    </div>
  );
}
