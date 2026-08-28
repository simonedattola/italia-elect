"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { ProvinceResult } from "@/types/simulation";
import { PROVINCES } from "@/lib/electoral/provinces";
import { formatPercent } from "@/lib/utils";
import { getParty } from "@/lib/electoral/parties";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import "leaflet/dist/leaflet.css";

function getComuniDrillDown(
  provinceName: string,
  result: ProvinceResult,
) {
  const stem = provinceName.split(" ")[0];
  const labels = ["Centro", "Nord", "Sud", "Ovest"];
  return labels.map((label, i) => {
    const party = result.topParties[i % result.topParties.length];
    const p = getParty(party.slug);
    const swing = (result.swing ?? 0) + (i - 1.5) * 0.8;
    return {
      name: `${label} · ${stem}`,
      slug: party.slug,
      shortName: p?.shortName ?? party.slug,
      percentage: Math.max(1, party.percentage + (i - 1.5) * 1.2),
      color: p?.color ?? "#64748b",
      swing,
    };
  });
}

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    map.fitBounds(
      [
        [Math.min(...lats) - 1, Math.min(...lngs) - 1],
        [Math.max(...lats) + 1, Math.max(...lngs) + 1],
      ],
      { padding: [24, 24] },
    );
  }, [map, points]);
  return null;
}

export function ItalyLeafletMapInner({
  data,
  highlightSlug,
}: {
  data: ProvinceResult[];
  highlightSlug?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const byCode = useMemo(
    () => new Map(data.map((d) => [d.provinceCode, d])),
    [data],
  );

  const markers = useMemo(
    () =>
      PROVINCES.map((p) => {
        const result = byCode.get(p.code);
        const radius = Math.max(8, Math.min(22, Math.sqrt(p.population) / 120));
        return { ...p, result, radius };
      }),
    [byCode],
  );

  const boundsPoints = markers.map((m) => ({ lat: m.lat, lng: m.lng }));

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-xl shadow-blue-500/5">
      <MapContainer
        center={[42.5, 12.5]}
        zoom={6}
        className="h-[480px] w-full z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <FitBounds points={boundsPoints} />
        {markers.map((m) => {
          const color = m.result?.winnerColor ?? "#475569";
          const isHi =
            highlightSlug && m.result?.winnerSlug === highlightSlug;
          return (
            <CircleMarker
              key={m.code}
              center={[m.lat, m.lng]}
              radius={m.radius + (isHi ? 3 : 0)}
              pathOptions={{
                color: isHi ? "#0f172a" : "rgba(15, 23, 42, 0.35)",
                weight: isHi ? 2 : 1,
                fillColor: color,
                fillOpacity: isHi ? 0.92 : 0.75,
              }}
              eventHandlers={{
                click: () =>
                  m.result &&
                  setExpanded((cur) =>
                    cur === m.code ? null : m.code,
                  ),
              }}
            >
              {m.result && (
                <Popup>
                  <div className="min-w-[200px] space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{m.result.provinceName}</strong>
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                        style={{ background: m.result.winnerColor }}
                      >
                        {m.result.winnerName}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {m.result.regionName} · {formatPercent(m.result.percentage)} ·
                      affluenza {formatPercent(m.result.turnout)}
                    </p>
                    <Separator />
                    <p className="text-xs font-medium">Drill-down comuni (proxy)</p>
                    <ul className="space-y-1.5">
                      {getComuniDrillDown(m.result.provinceName, m.result).map(
                        (c) => (
                          <li
                            key={c.name}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span>{c.name}</span>
                            <span className="font-mono-data" style={{ color: c.color }}>
                              {c.shortName} {c.percentage.toFixed(1)}%
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>
      {expanded && byCode.get(expanded) && (
        <div className="border-t border-[var(--border)] bg-black/40 p-3 text-xs text-[var(--muted)]">
          Provincia selezionata:{" "}
          <strong className="text-[var(--foreground)]">
            {byCode.get(expanded)!.provinceName}
          </strong>{" "}
          — clicca un marker per popup comuni
        </div>
      )}
    </div>
  );
}
