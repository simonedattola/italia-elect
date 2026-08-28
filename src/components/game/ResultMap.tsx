"use client";

import type { GameSimulationResult } from "@/lib/game/types";
import dynamic from "next/dynamic";

const ItalyLeafletMapInner = dynamic(
  () => import("@/components/map/italy-leaflet-map").then((m) => m.ItalyLeafletMapInner),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-white/5" /> },
);

export function ResultMap({ result }: { result: GameSimulationResult }) {
  return (
    <div className="glass overflow-hidden rounded-2xl p-2">
      <ItalyLeafletMapInner data={result.provincialMap} />
    </div>
  );
}
