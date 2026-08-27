"use client";

import { formatPercent } from "@/lib/utils";

type Side = {
  name: string;
  party: string;
  winProbability: number;
  nationalShare: number;
  seatsChamber: number;
};

export function DiffVisualizer({
  a,
  b,
}: {
  a: Side | null;
  b: Side | null;
}) {
  if (!a || !b) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Seleziona due simulazioni per vedere le differenze.
      </p>
    );
  }

  const rows: { label: string; av: string; bv: string; delta: string }[] = [
    {
      label: "Prob. vittoria",
      av: `${a.winProbability}%`,
      bv: `${b.winProbability}%`,
      delta: `${(b.winProbability - a.winProbability).toFixed(1)} pp`,
    },
    {
      label: "Quota nazionale",
      av: formatPercent(a.nationalShare),
      bv: formatPercent(b.nationalShare),
      delta: `${(b.nationalShare - a.nationalShare).toFixed(1)} pp`,
    },
    {
      label: "Seggi Camera",
      av: String(a.seatsChamber),
      bv: String(b.seatsChamber),
      delta: String(b.seatsChamber - a.seatsChamber),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface)] text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2 text-left">Metrica</th>
            <th className="px-3 py-2 text-left">{a.name}</th>
            <th className="px-3 py-2 text-left">{b.name}</th>
            <th className="px-3 py-2 text-left">Δ (B−A)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-[var(--border)]/60">
              <td className="px-3 py-2 font-medium">{r.label}</td>
              <td className="px-3 py-2">{r.av}</td>
              <td className="px-3 py-2">{r.bv}</td>
              <td className="px-3 py-2 tabular-nums text-[var(--it-blue)]">
                {r.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
        {a.party} vs {b.party} — confronto sulle metriche chiave della simulazione
      </p>
    </div>
  );
}
