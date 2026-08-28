"use client";

import type { GameSimulationResult } from "@/lib/game/types";
import { CHAMBER_MAJORITY, scoreboardSides } from "@/lib/game/experimentUtils";

export function ElectoralScoreboard({
  result,
  running,
}: {
  result: GameSimulationResult | null;
  running: boolean;
}) {
  const sides = scoreboardSides(result);

  return (
    <header className="experiment-scoreboard px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[var(--foreground)] sm:text-xl">
          L&apos;Esperimento Italiano
        </h1>
        <div className="grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              {sides.left.candidate ?? sides.left.name}
            </p>
            <p
              className="font-mono text-4xl font-bold tabular-nums sm:text-5xl"
              style={{ color: sides.left.color }}
            >
              {running ? "…" : sides.left.seats}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {result ? `${sides.left.pct}%` : "Camera dei Deputati"}
            </p>
          </div>

          <div className="text-center">
            <p className="font-mono text-xs text-[var(--muted)]">{CHAMBER_MAJORITY}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              per vincere
            </p>
          </div>

          <div className="text-left">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              {sides.right.candidate ?? sides.right.name}
            </p>
            <p
              className="font-mono text-4xl font-bold tabular-nums sm:text-5xl"
              style={{ color: sides.right.color }}
            >
              {running ? "…" : sides.right.seats}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {result ? `${sides.right.pct}%` : "seggi in palio"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
