"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { EventMapPin } from "@/types";

const CAUSE_COLOR: Record<string, string> = {
  health: "#E53E3E",
  education: "#2D6A4F",
  environment: "#38A169",
  animal_welfare: "#B7791F",
  disaster_relief: "#9F1239",
  poverty: "#7C3AED",
  women_empowerment: "#DB2777",
  other: "#1A1612",
};

const CAUSE_LABEL: Record<string, string> = {
  health: "Health",
  education: "Education",
  environment: "Environment",
  animal_welfare: "Animal welfare",
  disaster_relief: "Disaster relief",
  poverty: "Poverty",
  women_empowerment: "Women empowerment",
  other: "Other",
};

const inrCompact = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
};

// India bounding box — centred on the subcontinent, prevents the user
// from panning to the middle of the Pacific where there are no events.
const INDIA_CENTER: [number, number] = [22.5, 80.5];
const INDIA_ZOOM = 5;

export function IndiaMap({ pins }: { pins: EventMapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let mapInstance: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      mapInstance = L.map(containerRef.current, {
        center: INDIA_CENTER,
        zoom: INDIA_ZOOM,
        scrollWheelZoom: false,
      });
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        },
      ).addTo(mapInstance);

      pins.forEach((p) => {
        const lat = parseFloat(p.latitude);
        const lng = parseFloat(p.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;
        const color = CAUSE_COLOR[p.cause_category] ?? CAUSE_COLOR.other;
        const icon = L.divIcon({
          className: "rfac-pin",
          html: `<span style="
            display:block;
            width:14px;
            height:14px;
            border-radius:50%;
            background:${color};
            border:2px solid #FBF6EE;
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
          "></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const total = parseFloat(p.total_raised);
        const popup = `
          <div style="font-family:Inter,system-ui,sans-serif;min-width:180px;">
            <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${color};margin:0 0 4px;font-weight:700;">
              ${CAUSE_LABEL[p.cause_category] ?? "Other"}
            </p>
            <p style="font-size:14px;font-weight:600;color:#1A1612;margin:0 0 6px;line-height:1.3;">
              ${escapeHtml(p.title)}
            </p>
            <p style="font-size:12px;color:#5B5650;margin:0 0 8px;">
              📍 ${escapeHtml(p.city)} · ${p.total_runners} runner${p.total_runners === 1 ? "" : "s"} · ${inrCompact(total)}
            </p>
            <a href="/events/${encodeURIComponent(p.slug)}"
               style="display:inline-block;font-size:12px;font-weight:600;color:#ED6C0F;text-decoration:none;">
              View event &rarr;
            </a>
          </div>`;
        L.marker([lat, lng], { icon }).addTo(mapInstance!).bindPopup(popup);
      });
    })();

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
    };
  }, [pins]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[500px] md:h-[600px] w-full rounded-2xl overflow-hidden border border-ink-100"
        aria-label="Map of run-for-cause events across India"
        role="region"
      />
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {Object.entries(CAUSE_LABEL).map(([key, label]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 text-ink-600"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: CAUSE_COLOR[key] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
