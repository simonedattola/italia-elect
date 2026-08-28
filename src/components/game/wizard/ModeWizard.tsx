"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PlayerSetupCard } from "./PlayerSetupCard";
import {
  ScenarioStep,
  buildScenarioFromWizard,
  initRandomScenario,
} from "./ScenarioStep";
import { ResultsView } from "./ResultsView";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/input";
import type { ModeConfig } from "@/lib/game/modeConfig";
import type {
  GameDifficulty,
  GamePlayer,
  GameSimulationResult,
  PlayerFormState,
  RedistributionMode,
  WizardStep,
} from "@/lib/game/types";
import { emptyPlayerForm, formToGamePlayer, validatePlayerForm } from "@/lib/game/playerFormUtils";
import { PARTIES } from "@/lib/electoral/parties";
import type { ScenarioDefinition } from "@/lib/game/types";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "players", label: "Giocatori" },
  { id: "scenario", label: "Scenario" },
  { id: "competition", label: "Competizione" },
  { id: "results", label: "Risultati" },
];

interface ModeWizardProps {
  config: ModeConfig;
}

export function ModeWizard({ config }: ModeWizardProps) {
  const [step, setStep] = useState<WizardStep>("players");
  const [players, setPlayers] = useState<PlayerFormState[]>(() => {
    const count = Math.max(config.minPlayers, config.gameMode === "multiplayer" ? 2 : 1);
    return Array.from({ length: count }, (_, i) => emptyPlayerForm(`p-${i + 1}`));
  });
  const [difficulty, setDifficulty] = useState<GameDifficulty>(
    config.defaultDifficulty ?? "medium",
  );
  const [scenarioKind, setScenarioKind] = useState<"current" | "custom" | "random" | null>(null);
  const [randomScenario, setRandomScenario] = useState<ScenarioDefinition | null>(null);
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [redistributionMode, setRedistributionMode] =
    useState<RedistributionMode | null>(null);
  const [result, setResult] = useState<GameSimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedScenario = useMemo(() => {
    if (!scenarioKind) return null;
    if (scenarioKind === "random") return randomScenario;
    if (scenarioKind === "current") {
      return buildScenarioFromWizard("current", "", null);
    }
    return null;
  }, [scenarioKind, randomScenario]);

  const updatePlayer = useCallback((id: string, patch: Partial<PlayerFormState>) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const addPlayer = () => {
    if (players.length >= config.maxPlayers) return;
    setPlayers((prev) => [...prev, emptyPlayerForm(`p-${Date.now()}`)]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= config.minPlayers) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleScenarioKind = (kind: "current" | "custom" | "random") => {
    setScenarioKind(kind);
    if (kind === "random" && !randomScenario) {
      setRandomScenario(initRandomScenario());
    }
  };

  const playersValid = useMemo(() => {
    return players.every((p) => validatePlayerForm(p).length === 0);
  }, [players]);

  const canAdvancePlayers = playersValid && players.length >= config.minPlayers;

  const canAdvanceScenario =
    scenarioKind !== null &&
    (scenarioKind !== "custom" || customScenarioText.trim().length > 10);

  const runSimulation = async () => {
    if (!scenarioKind || !redistributionMode) return;
    setError(null);
    setRunning(true);
    setStep("results");

    const gamePlayers: GamePlayer[] = [];
    for (const form of players) {
      const gp = formToGamePlayer(form);
      if (gp) gamePlayers.push(gp);
    }

    const scenario = buildScenarioFromWizard(scenarioKind, customScenarioText, randomScenario);

    const body: Record<string, unknown> = {
      mode: config.gameMode,
      players: gamePlayers,
      redistributionMode,
      scenario,
      difficulty,
    };

    if (config.gameMode === "singleplayer" && redistributionMode === "all_parties") {
      body.realPartySlugs = PARTIES.map((p) => p.slug);
    }

    try {
      const res = await fetch("/api/game/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Simulazione fallita");
        setStep("competition");
        return;
      }
      setResult(data.result);
    } catch {
      setError("Errore di rete");
      setStep("competition");
    } finally {
      setRunning(false);
    }
  };

  const restart = () => {
    setStep("players");
    setResult(null);
    setScenarioKind(null);
    setRandomScenario(null);
    setCustomScenarioText("");
    setRedistributionMode(null);
    setPlayers(() => {
      const count = Math.max(config.minPlayers, config.gameMode === "multiplayer" ? 2 : 1);
      return Array.from({ length: count }, (_, i) => emptyPlayerForm(`p-${i + 1}`));
    });
  };

  if (step === "results") {
    return (
      <ResultsView
        result={result}
        running={running}
        modeSlug={config.slug}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/gioco"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Home
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          {config.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{config.description}</p>
      </header>

      <nav className="mb-8 flex gap-2 overflow-x-auto">
        {STEPS.slice(0, 3).map((s) => {
          const active = s.id === step;
          const done =
            (s.id === "players" && step !== "players") ||
            (s.id === "scenario" && step === "competition");
          return (
            <span
              key={s.id}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? "bg-[var(--it-blue)] text-white"
                  : done
                    ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                    : "bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              {s.label}
            </span>
          );
        })}
      </nav>

      {step === "players" && (
        <section className="space-y-6">
          {config.showDifficulty && (
            <div className="hub-card rounded-xl p-4">
              <Label>Difficoltà</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as GameDifficulty)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Facile</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="hard">Difficile</SelectItem>
                  <SelectItem value="impossible">Impossibile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              {players.length} / {config.maxPlayers} giocatori
            </p>
            {config.gameMode === "multiplayer" && players.length < config.maxPlayers && (
              <Button type="button" variant="outline" size="sm" onClick={addPlayer}>
                + Aggiungi giocatore
              </Button>
            )}
          </div>

          {players.map((p, i) => (
            <PlayerSetupCard
              key={p.id}
              index={i}
              form={p}
              onChange={(patch) => updatePlayer(p.id, patch)}
              onRemove={() => removePlayer(p.id)}
              canRemove={players.length > config.minPlayers}
            />
          ))}

          <div className="flex justify-end">
            <Button disabled={!canAdvancePlayers} onClick={() => setStep("scenario")}>
              Continua — Scenario
            </Button>
          </div>
        </section>
      )}

      {step === "scenario" && (
        <section className="space-y-6">
          <ScenarioStep
            scenarioKind={scenarioKind}
            selectedScenario={selectedScenario}
            customText={customScenarioText}
            onSelectKind={handleScenarioKind}
            onCustomTextChange={setCustomScenarioText}
            onRandomize={() => setRandomScenario(initRandomScenario())}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("players")}>
              Indietro
            </Button>
            <Button disabled={!canAdvanceScenario} onClick={() => setStep("competition")}>
              Continua — Competizione
            </Button>
          </div>
        </section>
      )}

      {step === "competition" && (
        <section className="space-y-6">
          <p className="text-sm text-[var(--muted)]">
            Vuoi competere solo tra i partiti in gara o includere tutti i partiti reali italiani?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRedistributionMode("candidates_only")}
              className={`hub-card rounded-xl p-5 text-left ${
                redistributionMode === "candidates_only" ? "ring-2 ring-[var(--it-blue)]" : ""
              }`}
            >
              <h4 className="font-semibold">Solo partiti in gara</h4>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Il voto si ridistribuisce solo tra i candidati presenti.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRedistributionMode("all_parties")}
              className={`hub-card rounded-xl p-5 text-left ${
                redistributionMode === "all_parties" ? "ring-2 ring-[var(--it-blue)]" : ""
              }`}
            >
              <h4 className="font-semibold">Tutti i partiti reali</h4>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Anche i partiti senza candidato giocano con la loro quota di baseline.
              </p>
            </button>
          </div>

          {error && (
            <p className="text-sm text-[var(--it-red)]">{error}</p>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("scenario")}>
              Indietro
            </Button>
            <Button disabled={!redistributionMode} onClick={runSimulation}>
              Simula elezioni
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
