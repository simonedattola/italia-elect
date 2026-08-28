"use client";

import type { ComputerChoice } from "@/lib/game/types";

export function ComputerChoiceDisplay({
  choice,
  isRevealed,
}: {
  choice: ComputerChoice | null;
  isRevealed: boolean;
}) {
  return (
    <div className="glass glow-purple rounded-2xl border border-purple-300 p-6">
      <div className="flex items-center gap-4">
        <span className="text-4xl">🤖</span>
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">Computer</h3>
          {isRevealed && choice ? (
            <p className="text-sm text-[var(--muted)]">
              {choice.candidate.firstName} {choice.candidate.lastName} · {choice.party.name}
              {choice.vicePresident
                ? ` · VP: ${choice.vicePresident.firstName} ${choice.vicePresident.lastName}`
                : ""}
            </p>
          ) : (
            <p className="animate-pulse text-sm text-[var(--muted)]">Sta scegliendo…</p>
          )}
        </div>
      </div>
    </div>
  );
}
