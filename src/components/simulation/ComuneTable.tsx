"use client";

import { useMemo, useState } from "react";
import type { ProvinceResult } from "@/types/simulation";
import { formatPercent } from "@/lib/utils";
import { getParty } from "@/lib/electoral/parties";

type Props = {
  data: ProvinceResult[];
  highlightSlug?: string;
};

/**
 * Tabella province (proxy “comuni” a granularità disponibile nel motore nazionale).
 */
export function ComuneTable({ data, highlightSlug }: Props) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"margin" | "name" | "turnout">("margin");

  const rows = useMemo(() => {
    const filtered = data.filter((p) => {
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        p.provinceName.toLowerCase().includes(s) ||
        p.regionName.toLowerCase().includes(s) ||
        p.winnerName.toLowerCase().includes(s)
      );
    });
    const withMargin = filtered.map((p) => {
      const second = p.topParties[1]?.percentage ?? 0;
      return { ...p, margin: p.percentage - second };
    });
    withMargin.sort((a, b) => {
      if (sort === "name") return a.provinceName.localeCompare(b.provinceName);
      if (sort === "turnout") return b.turnout - a.turnout;
      return b.margin - a.margin;
    });
    return withMargin;
  }, [data, q, sort]);

  return (
    <div className="space-y-3" id="comune-table">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca provincia / regione…"
          className="h-9 flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm min-w-[160px]"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-sm"
        >
          <option value="margin">Ordina per margine</option>
          <option value="name">Ordina per nome</option>
          <option value="turnout">Ordina per affluenza</option>
        </select>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--surface)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Provincia</th>
              <th className="px-3 py-2">Regione</th>
              <th className="px-3 py-2">Vincitore</th>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2">Margine</th>
              <th className="px-3 py-2">Affluenza</th>
              <th className="px-3 py-2">Top 3</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const hi = highlightSlug && p.winnerSlug === highlightSlug;
              const party = getParty(p.winnerSlug);
              return (
                <tr
                  key={p.provinceCode}
                  className={`border-t border-[var(--border)]/60 ${
                    hi ? "bg-[var(--it-blue)]/5" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{p.provinceName}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{p.regionName}</td>
                  <td className="px-3 py-2">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ background: p.winnerColor }}
                    />
                    {party?.shortName ?? p.winnerName}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatPercent(p.percentage)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {p.margin.toFixed(1)} pp
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--muted)]">
                    {p.turnout.toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--muted)]">
                    {p.topParties
                      .slice(0, 3)
                      .map((t) => `${getParty(t.slug)?.shortName ?? t.slug} ${t.percentage.toFixed(0)}`)
                      .join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Granularità attuale: province (proxy territoriale). I comuni MRP sono
        disponibili nel micro-sim ibrido.
      </p>
    </div>
  );
}
