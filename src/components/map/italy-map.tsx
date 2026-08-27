"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProvinceResult } from "@/types/simulation";
import { PROVINCES } from "@/lib/electoral/provinces";
import { formatPercent } from "@/lib/utils";

/**
 * Mappa Italia interattiva basata su griglia geografica delle province
 * (Leaflet/GeoJSON può sostituire questo layer in produzione con shapefile ISTAT).
 */
export function ItalyMap({
  data,
  highlightSlug,
}: {
  data: ProvinceResult[];
  highlightSlug?: string;
}) {
  const [hover, setHover] = useState<ProvinceResult | null>(null);
  const byCode = useMemo(() => {
    const m = new Map(data.map((d) => [d.provinceCode, d]));
    return m;
  }, [data]);

  // Proiezione semplice lat/lng → SVG
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
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <svg viewBox="0 0 420 520" className="h-auto w-full" role="img" aria-label="Mappa province italiane">
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="var(--it-blue)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="420" height="520" fill="url(#mapGlow)" />
        {points.map((p) => {
          const color = p.result?.winnerColor ?? "#94a3b8";
          const isLeader =
            highlightSlug && p.result?.winnerSlug === highlightSlug;
          return (
            <g key={p.code}>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r + (isLeader ? 2 : 0)}
                fill={color}
                fillOpacity={isLeader ? 0.95 : 0.75}
                stroke="var(--background)"
                strokeWidth={1.5}
                className="cursor-pointer transition-transform duration-200 hover:opacity-100"
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                onMouseEnter={() => p.result && setHover(p.result)}
                onMouseLeave={() => setHover(null)}
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

      <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/95 p-3 text-sm shadow-lg backdrop-blur">
        {hover ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {hover.provinceName}
                <span className="text-[var(--muted)]"> · {hover.regionName}</span>
              </span>
              <span
                className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                style={{ background: hover.winnerColor }}
              >
                {hover.winnerName}
              </span>
            </div>
            <p className="text-[var(--muted)]">
              {formatPercent(hover.percentage)} · swing{" "}
              {hover.swing >= 0 ? "+" : ""}
              {hover.swing.toFixed(1)} pt · affluenza {formatPercent(hover.turnout)}
            </p>
          </div>
        ) : (
          <p className="text-[var(--muted)]">
            Passa il cursore su una provincia per dettagli (partito, %, swing).
          </p>
        )}
      </div>
    </div>
  );
}

/** Leaflet map alternative loader — ready for GeoJSON ISTAT */
export function LeafletMapLoader(props: {
  data: ProvinceResult[];
  highlightSlug?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return <ItalyMap {...props} />;
}
