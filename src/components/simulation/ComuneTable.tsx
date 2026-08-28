"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProvinceResult } from "@/types/simulation";
import { formatPercent } from "@/lib/utils";
import { getParty } from "@/lib/electoral/parties";

type Props = {
  data: ProvinceResult[];
  highlightSlug?: string;
};

export function ComuneTable({ data, highlightSlug }: Props) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"margin" | "name" | "turnout">("margin");
  const [selected, setSelected] = useState<string | null>(null);

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
      const hiShare =
        highlightSlug
          ? p.topParties.find((t) => t.slug === highlightSlug)?.percentage ?? 0
          : p.percentage;
      return { ...p, margin: p.percentage - second, hiShare };
    });
    withMargin.sort((a, b) => {
      if (sort === "name") return a.provinceName.localeCompare(b.provinceName);
      if (sort === "turnout") return b.turnout - a.turnout;
      return b.margin - a.margin;
    });
    return withMargin;
  }, [data, q, sort, highlightSlug]);

  const maxShare = Math.max(...rows.map((r) => r.hiShare || r.percentage), 1);

  return (
    <div className="space-y-3" id="comune-table">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca provincia / regione…"
          className="h-9 min-w-[160px] flex-1 rounded-xl border border-[var(--border)] bg-black/20 px-3 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-9 rounded-xl border border-[var(--border)] bg-black/20 px-2 text-sm"
        >
          <option value="margin">Ordina per margine</option>
          <option value="name">Ordina per nome</option>
          <option value="turnout">Ordina per affluenza</option>
        </select>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#12141c]/95 text-[var(--muted)] backdrop-blur">
            <tr>
              <th className="px-3 py-2">Provincia</th>
              <th className="px-3 py-2">Vincitore</th>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2">Swing / share</th>
              <th className="px-3 py-2">Margine</th>
              <th className="px-3 py-2">Affluenza</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const hi = highlightSlug && p.winnerSlug === highlightSlug;
              const party = getParty(p.winnerSlug);
              const open = selected === p.provinceCode;
              const barW = ((p.hiShare || p.percentage) / maxShare) * 100;
              return (
                <tr
                  key={p.provinceCode}
                  onClick={() =>
                    setSelected(open ? null : p.provinceCode)
                  }
                  className={`cursor-pointer border-t border-[var(--border)]/60 transition hover:bg-white/[0.04] ${
                    hi ? "bg-[var(--it-blue)]/10" : ""
                  } ${open ? "bg-white/[0.05]" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-white">{p.provinceName}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {p.regionName}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ background: p.winnerColor }}
                    />
                    {party?.shortName ?? p.winnerName}
                  </td>
                  <td className="px-3 py-2.5 font-mono-data tabular-nums">
                    {formatPercent(p.percentage)}
                  </td>
                  <td className="px-3 py-2.5 min-w-[120px]">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: highlightSlug
                            ? getParty(highlightSlug)?.color ?? p.winnerColor
                            : p.winnerColor,
                          width: `${barW}%`,
                        }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${barW}%` }}
                        viewport={{ once: true }}
                      />
                    </div>
                    <span className="mt-1 block font-mono-data text-[10px] text-[var(--muted)]">
                      {(p.hiShare || p.percentage).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono-data tabular-nums">
                    {p.margin.toFixed(1)} pp
                  </td>
                  <td className="px-3 py-2.5 font-mono-data tabular-nums text-[var(--muted)]">
                    {p.turnout.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-xl p-4 text-sm"
          >
            {(() => {
              const p = rows.find((r) => r.provinceCode === selected);
              if (!p) return null;
              return (
                <>
                  <p className="font-medium text-white">
                    {p.provinceName} · top partiti
                  </p>
                  <p className="mt-2 text-[var(--muted)]">
                    {p.topParties
                      .slice(0, 5)
                      .map(
                        (t) =>
                          `${getParty(t.slug)?.shortName ?? t.slug} ${t.percentage.toFixed(1)}%`
                      )
                      .join(" · ")}
                  </p>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-xs text-[var(--muted)]">
        Granularità attuale: province (proxy territoriale). Click su una riga per
        il dettaglio.
      </p>
    </div>
  );
}
