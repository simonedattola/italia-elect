"use client";

import type { GameMode } from "@/lib/game/types";

const modes: Array<{
  mode: GameMode;
  icon: string;
  label: string;
  desc: string;
}> = [
  { mode: "multiplayer", icon: "👥", label: "Multiplayer", desc: "2–4 giocatori umani" },
  { mode: "singleplayer", icon: "🧑", label: "Single Player", desc: "Tu vs partiti reali" },
  { mode: "vscomputer", icon: "🤖", label: "Vs Computer", desc: "Sfida l'IA" },
  { mode: "computervscomputer", icon: "🤖🤖", label: "PC vs PC", desc: "Modalità spettatore" },
];

export function ModeSelector({
  value,
  onChange,
}: {
  value: GameMode | null;
  onChange: (m: GameMode) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {modes.map((m) => (
        <button
          key={m.mode}
          type="button"
          onClick={() => onChange(m.mode)}
          className={`hub-card rounded-2xl p-5 text-left transition ${
            value === m.mode ? "ring-2 ring-[var(--it-blue)]" : ""
          }`}
        >
          <span className="text-3xl">{m.icon}</span>
          <p className="mt-3 font-semibold text-[var(--foreground)]">{m.label}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{m.desc}</p>
        </button>
      ))}
    </div>
  );
}
