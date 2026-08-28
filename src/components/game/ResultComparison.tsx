"use client";

import type { GameSimulationResult } from "@/lib/game/types";

export function ResultComparison({ result }: { result: GameSimulationResult }) {
  return (
    <div className="glass overflow-x-auto rounded-2xl p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="pb-2">Candidato</th>
            <th className="pb-2">Partito</th>
            <th className="pb-2">%</th>
            <th className="pb-2">Seggi</th>
            <th className="pb-2">Posizione</th>
          </tr>
        </thead>
        <tbody>
          {result.comparisonTable.map((row) => (
            <tr key={row.name + row.party} className="border-t border-white/5">
              <td className="py-2 text-white">{row.name}</td>
              <td className="py-2">{row.party}</td>
              <td className="font-mono-data py-2">{row.percentage.toFixed(1)}%</td>
              <td className="font-mono-data py-2">{row.seats}</td>
              <td className="py-2 text-[var(--muted)]">{row.position}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
