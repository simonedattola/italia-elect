"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
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

  const metrics: {
    label: string;
    av: number;
    bv: number;
    format: (n: number) => string;
    unit: string;
  }[] = [
    {
      label: "Prob. vittoria",
      av: a.winProbability,
      bv: b.winProbability,
      format: (n) => n.toFixed(1),
      unit: "pp",
    },
    {
      label: "Quota nazionale",
      av: a.nationalShare,
      bv: b.nationalShare,
      format: (n) => n.toFixed(1),
      unit: "pp",
    },
    {
      label: "Seggi Camera",
      av: a.seatsChamber,
      bv: b.seatsChamber,
      format: (n) => String(Math.round(n)),
      unit: "",
    },
  ];

  return (
    <div className="space-y-4" id="diff-visualizer">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">A</p>
          <p className="mt-1 font-semibold text-white">{a.name}</p>
          <p className="text-xs text-[var(--muted)]">{a.party}</p>
        </div>
        <div className="flex justify-center">
          <span className="rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs text-[var(--muted)]">
            ⚖️ bilancia
          </span>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">B</p>
          <p className="mt-1 font-semibold text-white">{b.name}</p>
          <p className="text-xs text-[var(--muted)]">{b.party}</p>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map((m) => {
          const delta = m.bv - m.av;
          const positive = delta > 0;
          const neutral = Math.abs(delta) < 0.05;
          const maxAbs = Math.max(Math.abs(m.av), Math.abs(m.bv), 1);
          const leftW = (Math.abs(m.av) / maxAbs) * 50;
          const rightW = (Math.abs(m.bv) / maxAbs) * 50;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white">{m.label}</span>
                <span
                  className={`inline-flex items-center gap-1 font-mono-data text-sm ${
                    neutral
                      ? "text-[var(--muted)]"
                      : positive
                        ? "text-[var(--it-green)]"
                        : "text-[var(--it-red)]"
                  }`}
                >
                  {neutral ? (
                    <Minus className="h-4 w-4" />
                  ) : positive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {positive && !neutral ? "+" : ""}
                  {m.format(delta)}
                  {m.unit ? ` ${m.unit}` : ""}
                </span>
              </div>
              <div className="flex h-3 items-center gap-1">
                <div className="flex flex-1 justify-end">
                  <div
                    className="h-3 rounded-l-full bg-[var(--it-blue)]/80"
                    style={{ width: `${leftW}%` }}
                  />
                </div>
                <div className="h-5 w-px bg-white/20" />
                <div className="flex flex-1 justify-start">
                  <div
                    className="h-3 rounded-r-full bg-[var(--it-green)]/70"
                    style={{ width: `${rightW}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-between font-mono-data text-xs text-[var(--muted)]">
                <span>
                  {m.label.includes("Seggi")
                    ? m.format(m.av)
                    : formatPercent(m.av)}
                </span>
                <span>
                  {m.label.includes("Seggi")
                    ? m.format(m.bv)
                    : formatPercent(m.bv)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
