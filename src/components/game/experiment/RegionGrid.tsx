"use client";

import type { RegionalGameResult } from "@/lib/game/types";
import { ALL_REGIONS, regionAbbr } from "@/lib/game/experimentUtils";

export function RegionGrid({
  regions,
  onSelect,
  selected,
}: {
  regions: RegionalGameResult[];
  onSelect?: (name: string) => void;
  selected?: string | null;
}) {
  const byName = new Map(regions.map((r) => [r.regionName, r]));

  return (
    <div className="flex flex-wrap justify-center gap-1 p-3 sm:gap-1.5">
      {ALL_REGIONS.map((name) => {
        const r = byName.get(name);
        const color = r?.winnerColor ?? "#1e293b";
        const abbr = regionAbbr(name);
        const isSel = selected === name;
        return (
          <button
            key={name}
            type="button"
            title={r ? `${name}: ${r.winnerName} ${r.percentage}%` : name}
            onClick={() => onSelect?.(name)}
            className={`experiment-region-tile flex h-8 min-w-[2.25rem] items-center justify-center rounded px-1 sm:h-9 sm:min-w-[2.5rem] ${
              isSel ? "ring-2 ring-white/60" : ""
            }`}
            style={{
              backgroundColor: color,
              color: luminance(color) > 0.55 ? "#0f172a" : "#f8fafc",
            }}
          >
            {abbr}
          </button>
        );
      })}
    </div>
  );
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.3;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
