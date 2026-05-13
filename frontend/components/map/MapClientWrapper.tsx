"use client";

import dynamic from "next/dynamic";
import type { EventMapPin } from "@/types";

const IndiaMap = dynamic(
  () => import("@/components/map/IndiaMap").then((m) => m.IndiaMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] md:h-[600px] rounded-2xl bg-canvas-subtle animate-pulse border border-ink-100" />
    ),
  },
);

export function MapClientWrapper({
  pins,
}: {
  pins: EventMapPin[];
}): React.ReactNode {
  return <IndiaMap pins={pins} />;
}
