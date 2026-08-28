"use client";

import dynamic from "next/dynamic";

const ItalyMap = dynamic(
  () => import("@/components/map/italy-leaflet-map-wrapper").then((m) => m.ItalyLeafletMap),
  { ssr: false, loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
      Caricamento mappa…
    </div>
  ) },
);

export function HomeMapSection() {
  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-white">Mappa Italia — comuni per partito</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Clicca su una provincia per il dettaglio simulato
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
        <ItalyMap data={[]} highlightSlug="fratelli-ditalia" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {[
          { name: "FdI", color: "#003399" },
          { name: "PD", color: "#E31C2B" },
          { name: "M5S", color: "#FFED00" },
          { name: "FN", color: "#7C3AED" },
          { name: "Lega", color: "#00A651" },
        ].map((l) => (
          <span key={l.name} className="flex items-center gap-1.5 text-[var(--muted)]">
            <span className="h-2 w-4 rounded-sm" style={{ background: l.color }} />
            {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}
