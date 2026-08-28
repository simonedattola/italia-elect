"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProvinceResult } from "@/types/simulation";
import { PROVINCES } from "@/lib/electoral/provinces";
import { formatPercent } from "@/lib/utils";

/**
 * Mappa Italia interattiva basata su griglia geografica delle province.
 */
export function ItalyMap({
  data,
  highlightSlug,
}: {
  data: ProvinceResult[];
  highlightSlug?: string;
}) {
  const [hover, setHover] = useState<ProvinceResult | null>(null);
  const [pinned, setPinned] = useState<ProvinceResult | null>(null);
  const byCode = useMemo(() => {
    const m = new Map(data.map((d) => [d.provinceCode, d]));
    return m;
  }, [data]);

  const active = pinned ?? hover;

  const points = useMemo(() => {
    const lats = PROVINCES.map((p) => p.lat);
    const lngs = PROVINCES.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const w = 420;
    const h = 520;
    const pad = 28;

    return PROVINCES.map((p) => {
      const x = pad + ((p.lng - minLng) / (maxLng - minLng)) * (w - pad * 2);
      const y = pad + ((maxLat - p.lat) / (maxLat - minLat)) * (h - pad * 2);
      const result = byCode.get(p.code);
      const size = Math.sqrt(p.population) / 55;
      return { ...p, x, y, r: Math.max(6, Math.min(18, size)), result };
    });
  }, [byCode]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-black/20 backdrop-blur-xl">
      <svg
        viewBox="0 0 420 520"
        className="h-auto w-full"
        role="img"
        aria-label="Mappa province italiane"
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.14" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="420" height="520" fill="url(#mapGlow)" />
        {points.map((p) => {
          const color = p.result?.winnerColor ?? "#475569";
          const isLeader =
            highlightSlug && p.result?.winnerSlug === highlightSlug;
          const isActive = active?.provinceCode === p.code;
          return (
            <g key={p.code}>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r + (isLeader || isActive ? 3 : 0)}
                fill={color}
                fillOpacity={isLeader || isActive ? 0.98 : 0.72}
                stroke={isActive ? "#fff" : "rgba(10,11,16,0.8)"}
                strokeWidth={isActive ? 2 : 1.5}
                className="cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => p.result && setHover(p.result)}
                onMouseLeave={() => setHover(null)}
                onClick={() =>
                  p.result &&
                  setPinned((cur) =>
                    cur?.provinceCode === p.result!.provinceCode
                      ? null
                      : p.result!
                  )
                }
              />
              {p.population > 900000 && (
                <text
                  x={p.x}
                  y={p.y + p.r + 10}
                  textAnchor="middle"
                  className="fill-[var(--muted)] text-[7px]"
                >
                  {p.code}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-[#0a0b10]/90 p-3 text-sm shadow-xl backdrop-blur-xl">
        {active ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-white">
                {active.provinceName}
                <span className="text-[var(--muted)]">
                  {" "}
                  · {active.regionName}
                </span>
              </span>
              <span
                className="rounded-lg px-2 py-0.5 text-xs font-semibold text-white"
                style={{ background: active.winnerColor }}
              >
                {active.winnerName}
              </span>
            </div>
            <p className="font-mono-data text-[var(--muted)]">
              {formatPercent(active.percentage)} · swing{" "}
              {active.swing >= 0 ? "+" : ""}
              {active.swing.toFixed(1)} pt · affluenza{" "}
              {formatPercent(active.turnout)}
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              Top:{" "}
              {active.topParties
                .slice(0, 3)
                .map((t) => `${t.slug.split("-")[0]} ${t.percentage.toFixed(0)}%`)
                .join(" · ")}
            </p>
          </div>
        ) : (
          <p className="text-[var(--muted)]">
            Passa o clicca una provincia per il tooltip dettaglio.
          </p>
        )}
      </div>
    </div>
  );
}

export function LeafletMapLoader(props: {
  data: ProvinceResult[];
  highlightSlug?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return <ItalyMap {...props} />;
}
