"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/lib/electoral/parties";

export function VoteIntentPanel() {
  const [snapshot, setSnapshot] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch("/api/baseline")
      .then((r) => r.json())
      .then((d) => d.ok && setSnapshot(d.baseline))
      .catch(() => undefined);
  }, []);

  if (!snapshot) return null;

  const entries = Object.entries(snapshot)
    .filter(([, pct]) => pct >= 0.5)
    .sort(([, a], [, b]) => b - a);

  const max = entries[0]?.[1] ?? 1;

  return (
    <ul className="space-y-3">
      {entries.map(([slug, pct]) => {
        const party = PARTIES.find((p) => p.slug === slug);
        return (
          <li key={slug}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: party?.color ?? "#64748b" }}
                />
                {party?.shortName ?? slug}
              </span>
              <span className="font-mono-data tabular-nums text-[var(--muted)]">
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-[var(--surface)]">
              <div
                className="h-full rounded-full opacity-90"
                style={{
                  width: `${(pct / max) * 100}%`,
                  background: party?.color ?? "#64748b",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
