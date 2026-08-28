"use client";

import dynamic from "next/dynamic";
import type { ProvinceResult } from "@/types/simulation";

const ItalyLeafletMapInner = dynamic(
  () => import("./italy-leaflet-map").then((m) => m.ItalyLeafletMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center rounded-2xl border border-[var(--border)] bg-black/20 text-sm text-[var(--muted)]">
        Caricamento mappa…
      </div>
    ),
  },
);

export function ItalyLeafletMap({
  data,
  highlightSlug,
}: {
  data: ProvinceResult[];
  highlightSlug?: string;
}) {
  return <ItalyLeafletMapInner data={data} highlightSlug={highlightSlug} />;
}
