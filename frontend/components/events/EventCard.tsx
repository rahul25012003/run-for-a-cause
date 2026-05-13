"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Users, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Tilt3D } from "@/components/shared/Tilt3D";
import { formatCompactInr, daysBetween, progressPct } from "@/lib/utils";
import type { EventPublic } from "@/types";

const categoryLabels: Record<string, string> = {
  health: "Health",
  education: "Education",
  environment: "Environment",
  animal_welfare: "Animal welfare",
  disaster_relief: "Disaster relief",
  poverty: "Poverty",
  women_empowerment: "Women",
  other: "Other",
};

export function EventCard({ event }: { event: EventPublic }): React.ReactNode {
  const pct = progressPct(event.total_raised, event.fundraising_goal);
  const days = daysBetween(event.end_date);
  return (
    <Tilt3D max={5} scale={1.02} className="h-full">
      <Link
        href={`/events/${event.slug}`}
        className="group card overflow-hidden flex flex-col h-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-canvas-deep">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ transform: "translateZ(40px)" }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/45 via-transparent to-transparent" />
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <Badge variant="primary" className="bg-white/95 backdrop-blur text-ink-900">
              {categoryLabels[event.cause_category] ?? event.cause_category}
            </Badge>
            {event.is_featured && (
              <Badge variant="warning" className="bg-gold-500 text-white">Featured</Badge>
            )}
          </div>
          <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-ink-900 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="p-6 flex flex-col flex-1" style={{ transform: "translateZ(20px)" }}>
          <h3 className="font-display text-xl text-ink-900 leading-snug line-clamp-2 group-hover:text-primary-700 transition-colors">
            {event.title}
          </h3>
          <p className="mt-2 text-sm text-ink-500 line-clamp-2 leading-relaxed">
            {event.cause_summary}
          </p>
          <div className="mt-5">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="font-mono font-bold text-ink-900 tabular text-lg">
                {formatCompactInr(event.total_raised)}
              </span>
              <span className="font-condensed text-[11px] text-ink-400 tabular uppercase tracking-wider">
                of {formatCompactInr(event.fundraising_goal)} · {pct}%
              </span>
            </div>
            <ProgressBar pct={pct} height="sm" />
          </div>
          <div className="mt-5 pt-5 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
            <span className="inline-flex items-center gap-1.5 font-condensed uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              {event.total_runners} runners · {event.total_donors} donors
            </span>
            <span className="inline-flex items-center gap-1.5 font-condensed uppercase tracking-wider font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              {days > 0 ? `${days}d left` : "Ended"}
            </span>
          </div>
        </div>
      </Link>
    </Tilt3D>
  );
}
