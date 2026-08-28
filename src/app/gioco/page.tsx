"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ModeSelector } from "@/components/game/ModeSelector";
import { DifficultySelector } from "@/components/game/DifficultySelector";
import { PlayerSetupForm } from "@/components/game/PlayerSetupForm";
import { ComputerChoiceDisplay } from "@/components/game/ComputerChoiceDisplay";
import { ResultMap } from "@/components/game/ResultMap";
import { ResultComparison } from "@/components/game/ResultComparison";
import { CandidateCard } from "@/components/game/CandidateCard";
import type {
  GameMode,
  GameDifficulty,
  ComputerOrientation,
  GamePlayer,
  GameSimulationResult,
  RedistributionMode,
  ComputerChoice,
} from "@/lib/game/types";
import { PARTIES } from "@/lib/electoral/parties";
import { CORE_PARTIES } from "@/lib/electoral/coreParties";

const GAME_RESULT_KEY = "italia-elect-game-result";

type Step = "mode" | "setup" | "summary" | "results";

export default function GiocoPage() {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  const [orientation, setOrientation] = useState<ComputerOrientation>("random");
  const [redistribution, setRedistribution] = useState<RedistributionMode>("candidates_only");
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [showPlayerForm, setShowPlayerForm] = useState(true);
  const [realParties, setRealParties] = useState<string[]>(
    CORE_PARTIES.map((p) => p.slug),
  );
  const [result, setResult] = useState<GameSimulationResult | null>(null);
  const [pending, setPending] = useState(false);
  const [computerChoice, setComputerChoice] = useState<ComputerChoice | null>(null);
  const [computerPreviewLoading, setComputerPreviewLoading] = useState(false);

  const minPlayers = mode === "multiplayer" ? 2 : mode === "computervscomputer" ? 0 : 1;
  const maxPlayers = mode === "multiplayer" ? 4 : 1;
  const canSimulate =
    mode === "computervscomputer" ||
    (players.length >= minPlayers && players.length <= maxPlayers);

  const fetchComputerPreview = useCallback(async () => {
    if (mode !== "vscomputer" || players.length !== 1) return;
    setComputerPreviewLoading(true);
    try {
      const human = players[0]!;
      const res = await fetch("/api/game/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty,
          orientation,
          humanPlayer: {
            party: {
              slug: human.party.slug,
              ideologyScore: human.party.ideologyScore,
            },
            candidate: human.candidate,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) setComputerChoice(data.choice);
    } catch {
      setComputerChoice(null);
    } finally {
      setComputerPreviewLoading(false);
    }
  }, [mode, players, difficulty, orientation]);

  useEffect(() => {
    if (step === "summary" && mode === "vscomputer") {
      void fetchComputerPreview();
    }
  }, [step, mode, fetchComputerPreview]);

  async function runSimulation() {
    setPending(true);
    try {
      const res = await fetch("/api/game/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          players,
          redistributionMode: redistribution,
          realPartySlugs: mode === "singleplayer" ? realParties : undefined,
          difficulty: mode === "vscomputer" ? difficulty : undefined,
          computerOrientation: mode === "vscomputer" ? orientation : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResult(data.result);
      if (data.players) {
        const cpu = (data.players as GamePlayer[]).find((p) => p.isComputer);
        if (cpu && mode === "vscomputer") {
          setComputerChoice({
            displayName: cpu.displayName,
            party: cpu.party,
            candidate: cpu.candidate,
            vicePresident: cpu.vicePresident,
            program: cpu.candidate.program ?? "",
            description: cpu.candidate.description ?? "",
          });
        }
      }
      sessionStorage.setItem(GAME_RESULT_KEY, JSON.stringify(data.result));
      setStep("results");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  function handlePlayerConfirmed(p: GamePlayer) {
    setPlayers((prev) => [...prev, p]);
    setShowPlayerForm(false);
    if (mode !== "multiplayer") {
      setStep("summary");
    }
  }

  function resetGame() {
    setStep("mode");
    setMode(null);
    setPlayers([]);
    setShowPlayerForm(true);
    setResult(null);
    setComputerChoice(null);
  }

  return (
    <PageShell>
      <PageHeader title="Italia Elect Game" />
      <p className="-mt-6 mb-8 text-sm text-[var(--muted)]">
        Simulazione politica multiplayer, single player e vs computer
      </p>

      {step === "mode" && (
        <div className="space-y-8">
          <ModeSelector
            value={mode}
            onChange={(m) => {
              setMode(m);
              setPlayers([]);
              setShowPlayerForm(true);
              if (m === "computervscomputer") {
                setStep("summary");
              }
            }}
          />
          {mode === "vscomputer" && (
            <div className="glass rounded-2xl p-5">
              <p className="mb-4 text-sm font-medium text-white">Impostazioni computer</p>
              <DifficultySelector
                difficulty={difficulty}
                orientation={orientation}
                onDifficulty={setDifficulty}
                onOrientation={setOrientation}
              />
            </div>
          )}
          {mode && mode !== "computervscomputer" && (
            <Button
              size="lg"
              onClick={() => setStep("setup")}
              className="glow-button-blue"
            >
              Continua
            </Button>
          )}
        </div>
      )}

      {step === "setup" && mode && (
        <div className="space-y-8">
          {mode === "singleplayer" && (
            <div className="glass rounded-2xl p-5">
              <p className="mb-3 text-sm font-medium text-white">Partiti reali in gara</p>
              <div className="flex flex-wrap gap-2">
                {PARTIES.map((p) => (
                  <label key={p.slug} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={realParties.includes(p.slug)}
                      onChange={(e) => {
                        setRealParties((prev) =>
                          e.target.checked
                            ? [...prev, p.slug]
                            : prev.filter((s) => s !== p.slug),
                        );
                      }}
                    />
                    {p.shortName}
                  </label>
                ))}
              </div>
            </div>
          )}

          {players.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">
                Giocatori confermati ({players.length}/{maxPlayers})
              </p>
              {players.map((p) => (
                <div key={p.id} className="glass rounded-xl p-3 text-sm">
                  <span className="font-semibold text-white">{p.displayName}</span>
                  <span className="text-[var(--muted)]">
                    {" "}
                    — {p.candidate.firstName} {p.candidate.lastName} ({p.party.name})
                  </span>
                </div>
              ))}
            </div>
          )}

          {showPlayerForm && players.length < maxPlayers && (
            <PlayerSetupForm
              index={players.length}
              onConfirm={handlePlayerConfirmed}
              defaultName={mode === "vscomputer" ? "Tu" : undefined}
            />
          )}

          <div className="flex flex-wrap gap-3">
            {mode === "multiplayer" && players.length >= minPlayers && (
              <Button size="lg" onClick={() => setStep("summary")}>
                Vai al riepilogo
              </Button>
            )}
            {mode === "multiplayer" &&
              !showPlayerForm &&
              players.length < maxPlayers && (
                <Button variant="outline" onClick={() => setShowPlayerForm(true)}>
                  + Aggiungi giocatore
                </Button>
              )}
            <Button variant="ghost" onClick={() => setStep("mode")}>
              ← Cambia modalità
            </Button>
          </div>
        </div>
      )}

      {step === "summary" && mode && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <p className="text-sm text-[var(--muted)]">Modalità ridistribuzione</p>
            <div className="mt-2 flex gap-3">
              <Button
                type="button"
                size="sm"
                variant={redistribution === "candidates_only" ? "default" : "outline"}
                onClick={() => setRedistribution("candidates_only")}
              >
                Solo candidati
              </Button>
              <Button
                type="button"
                size="sm"
                variant={redistribution === "all_parties" ? "default" : "outline"}
                onClick={() => setRedistribution("all_parties")}
              >
                Tutti i partiti
              </Button>
            </div>
          </div>

          {players.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-4">
              <p className="font-semibold text-white">{p.displayName}</p>
              <p className="text-sm text-[var(--muted)]">
                {p.candidate.firstName} {p.candidate.lastName} · {p.party.name}
                {p.vicePresident
                  ? ` · VP ${p.vicePresident.firstName} ${p.vicePresident.lastName}`
                  : ""}
              </p>
            </div>
          ))}

          {mode === "vscomputer" && (
            <ComputerChoiceDisplay
              choice={computerChoice}
              isRevealed={Boolean(computerChoice) && !computerPreviewLoading}
            />
          )}

          {mode === "computervscomputer" && (
            <p className="text-sm text-[var(--muted)]">
              Due avversari AI si sfidano — premi simula per vedere il risultato.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="gradient"
              className="glow-button-blue"
              disabled={!canSimulate || pending}
              onClick={runSimulation}
            >
              {pending ? "Simulazione…" : "⚔️ Simula elezioni"}
            </Button>
            {mode !== "computervscomputer" && (
              <Button variant="outline" onClick={() => setStep("setup")}>
                ← Modifica giocatori
              </Button>
            )}
            <Button variant="ghost" onClick={resetGame}>
              Cambia modalità
            </Button>
          </div>
        </div>
      )}

      {step === "results" && result && (
        <div className="space-y-8">
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-sm uppercase tracking-wider text-[var(--muted)]">Vincitore</p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              🏆 {result.winner.candidateName}
            </h2>
            <p className="text-[var(--muted)]">
              {result.winner.partyName} · {result.winner.totalSeats} seggi ·{" "}
              {result.winner.percentage}%
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.players.map((p) => (
              <div
                key={p.playerId}
                className="glass rounded-2xl p-4"
                style={{ borderLeft: `4px solid ${p.partyColor}` }}
              >
                <p className="font-semibold text-white">{p.displayName}</p>
                <p className="font-mono-data text-2xl text-white">{p.percentage}%</p>
                <p className="text-xs text-[var(--muted)]">
                  {p.totalSeats} seggi ({p.chamberSeats}C + {p.senateSeats}S)
                </p>
                <div className="mt-3">
                  <CandidateCard profile={p.profile} />
                </div>
              </div>
            ))}
          </div>

          <ResultComparison result={result} />
          <ResultMap result={result} />

          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white">Analisi narrativa</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{result.narrative}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={resetGame}>🔄 Nuova partita</Button>
            <Button variant="outline" asChild>
              <Link href="/simula">Analista avanzato</Link>
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
