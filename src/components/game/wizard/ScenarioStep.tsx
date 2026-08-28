"use client";

import type { ScenarioDefinition } from "@/lib/game/types";
import {
  SCENARIO_PRESETS,
  pickRandomScenario,
  scenarioInsights,
} from "@/lib/game/scenarios";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";

interface ScenarioStepProps {
  scenarioKind: "current" | "custom" | "random" | null;
  selectedScenario: ScenarioDefinition | null;
  customText: string;
  onSelectKind: (kind: "current" | "custom" | "random") => void;
  onCustomTextChange: (text: string) => void;
  onRandomize: () => void;
}

export function ScenarioStep({
  scenarioKind,
  selectedScenario,
  customText,
  onSelectKind,
  onCustomTextChange,
  onRandomize,
}: ScenarioStepProps) {
  const randomPreview = scenarioKind === "random" ? selectedScenario : null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        Lo scenario modifica il clima elettorale e influenza tutti i partiti — non solo quelli dei
        giocatori.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["current", "custom", "random"] as const).map((kind) => {
          const title =
            kind === "current"
              ? "Scenario attuale"
              : kind === "custom"
                ? "Personalizzato"
                : "Casuale";
          const desc =
            kind === "current"
              ? "Baseline aggiornata, senza shock esterni."
              : kind === "custom"
                ? "Scrivi tu la situazione politica."
                : "Un evento imprevisto cambia le carte in tavola.";
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onSelectKind(kind)}
              className={`hub-card rounded-xl p-4 text-left transition-all ${
                scenarioKind === kind ? "ring-2 ring-[var(--it-blue)]" : ""
              }`}
            >
              <h4 className="font-semibold">{title}</h4>
              <p className="mt-1 text-xs text-[var(--muted)]">{desc}</p>
            </button>
          );
        })}
      </div>

      {scenarioKind === "custom" && (
        <div>
          <Label htmlFor="custom-scenario">Descrivi lo scenario</Label>
          <Textarea
            id="custom-scenario"
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="Es. crisi energetica, scioperi generali, nuova ondata pandemica…"
            rows={4}
          />
        </div>
      )}

      {scenarioKind === "random" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">
                {randomPreview?.title ?? "Scenario casuale"}
              </h4>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {randomPreview?.narrative ?? "Premi rigenera per sorteggiare uno scenario."}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onRandomize}>
              Rigenera
            </Button>
          </div>
          {randomPreview && randomPreview.partyModifiers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Effetti sui partiti
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {scenarioInsights(randomPreview).map((ins) => (
                  <li
                    key={ins.party}
                    className="rounded-full bg-[var(--card)] px-2 py-0.5 text-xs"
                  >
                    {ins.party} {ins.effect}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {scenarioKind === "current" && selectedScenario && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          {selectedScenario.description}
        </div>
      )}
    </div>
  );
}

export function buildScenarioFromWizard(
  kind: "current" | "custom" | "random",
  customText: string,
  randomScenario: ScenarioDefinition | null,
): ScenarioDefinition {
  if (kind === "current") {
    return SCENARIO_PRESETS.find((s) => s.id === "current")!;
  }
  if (kind === "random" && randomScenario) {
    return randomScenario;
  }
  return {
    id: "custom",
    kind: "custom",
    title: "Scenario personalizzato",
    description: customText.slice(0, 120) || "Evento definito dal giocatore.",
    narrative: customText || "Una situazione politica su misura modifica le preferenze degli elettori.",
    partyModifiers: [],
    customText,
  };
}

export function initRandomScenario(): ScenarioDefinition {
  return pickRandomScenario();
}
