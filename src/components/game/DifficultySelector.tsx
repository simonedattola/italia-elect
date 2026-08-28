"use client";

import type { GameDifficulty, ComputerOrientation } from "@/lib/game/types";
import { Button } from "@/components/ui/button";

export function DifficultySelector({
  difficulty,
  orientation,
  onDifficulty,
  onOrientation,
}: {
  difficulty: GameDifficulty;
  orientation: ComputerOrientation;
  onDifficulty: (d: GameDifficulty) => void;
  onOrientation: (o: ComputerOrientation) => void;
}) {
  const diffs: Array<{ id: GameDifficulty; label: string }> = [
    { id: "easy", label: "🟢 Facile" },
    { id: "medium", label: "🟡 Medio" },
    { id: "hard", label: "🔴 Difficile" },
    { id: "impossible", label: "🔥 Impossibile" },
  ];
  const orients: Array<{ id: ComputerOrientation; label: string }> = [
    { id: "random", label: "Casuale" },
    { id: "right", label: "Destra" },
    { id: "left", label: "Sinistra" },
    { id: "center", label: "Centro" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {diffs.map((d) => (
          <Button
            key={d.id}
            type="button"
            variant={difficulty === d.id ? "default" : "outline"}
            size="sm"
            onClick={() => onDifficulty(d.id)}
          >
            {d.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {orients.map((o) => (
          <Button
            key={o.id}
            type="button"
            variant={orientation === o.id ? "default" : "outline"}
            size="sm"
            onClick={() => onOrientation(o.id)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
