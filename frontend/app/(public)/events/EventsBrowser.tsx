"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Reveal } from "@/components/shared/Reveal";
import type { EventPublic } from "@/types";

type FormatFilter = "all" | "virtual" | "in_person" | "hybrid";

const CATEGORIES = [
  { value: "", label: "All causes" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "environment", label: "Environment" },
  { value: "animal_welfare", label: "Animal welfare" },
  { value: "disaster_relief", label: "Disaster relief" },
  { value: "poverty", label: "Poverty" },
  { value: "women_empowerment", label: "Women empowerment" },
  { value: "other", label: "Other" },
];

const FORMATS: { value: FormatFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "virtual", label: "Virtual" },
  { value: "in_person", label: "In-person" },
  { value: "hybrid", label: "Hybrid" },
];

export function EventsBrowser({
  initialEvents,
}: {
  initialEvents: EventPublic[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [format, setFormat] = useState<FormatFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialEvents.filter((e) => {
      if (category && e.cause_category !== category) return false;
      if (format !== "all" && e.format !== format) return false;
      if (!q) return true;
      const hay =
        `${e.title} ${e.cause_summary ?? ""} ${e.city ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [initialEvents, search, category, format]);

  const clearAll = () => {
    setSearch("");
    setCategory("");
    setFormat("all");
  };
  const isFiltered = !!(search || category || format !== "all");

  return (
    <>
      {/* ── Filter bar ── */}
      <div className="card p-4 md:p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-ink-400" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Filter events
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <X className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, cause or city…"
              className="input pl-9"
              aria-label="Search events"
            />
          </div>

          {/* Cause dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input sm:w-44"
            aria-label="Filter by cause"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Format chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              aria-pressed={format === f.value}
              className={[
                "chip cursor-pointer border transition-colors",
                format === f.value
                  ? "bg-ink-900 text-white border-ink-900"
                  : "bg-white text-ink-600 border-ink-200 hover:border-primary-400 hover:text-primary-700",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result count ── */}
      <p className="eyebrow mb-5 text-ink-400">
        {filtered.length} of {initialEvents.length} event
        {initialEvents.length !== 1 ? "s" : ""}
        {isFiltered && " match your filters"}
      </p>

      {/* ── Event grid ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration={isFiltered ? "search" : "events"}
            title={isFiltered ? "No events match" : "No events yet"}
            description={
              isFiltered
                ? "Try clearing the filters, or pick a different cause."
                : "Once organisations publish events, they'll appear here."
            }
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event, i) => (
            <Reveal key={event.id} delay={i * 0.04}>
              <EventCard event={event} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
