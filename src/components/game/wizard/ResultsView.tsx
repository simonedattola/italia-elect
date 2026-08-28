"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ElectoralScoreboard } from "@/components/game/experiment/ElectoralScoreboard";
import { RegionGrid } from "@/components/game/experiment/RegionGrid";
import { Button } from "@/components/ui/button";
import type { GameSimulationResult } from "@/lib/game/types";
import type { ModeSlug } from "@/lib/game/modeConfig";

const ItalyLeafletMapInner = dynamic(
  () => import("@/components/map/italy-leaflet-map").then((m) => m.ItalyLeafletMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[360px] animate-pulse bg-[var(--surface-2)]" />
    ),
  },
);

interface ResultsViewProps {
  result: GameSimulationResult | null;
  running: boolean;
  modeSlug: ModeSlug;
  onRestart: () => void;
}

export function ResultsView({ result, running, modeSlug, onRestart }: ResultsViewProps) {
  const [phase, setPhase] = useState<"counting" | "called">("counting");
  const [revealedRows, setRevealedRows] = useState(0);

  useEffect(() => {
    if (running) {
      setPhase("counting");
      setRevealedRows(0);
      return;
    }
    if (!result) return;

    const t1 = setTimeout(() => setPhase("called"), 1200);
    const interval = setInterval(() => {
      setRevealedRows((n) => {
        if (n >= result.players.length) {
          clearInterval(interval);
          return n;
        }
        return n + 1;
      });
    }, 400);

    return () => {
      clearTimeout(t1);
      clearInterval(interval);
    };
  }, [running, result]);

  const sortedPlayers = useMemo(
    () => (result ? [...result.players].sort((a, b) => b.percentage - a.percentage) : []),
    [result],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <ElectoralScoreboard result={result} running={running || phase === "counting"} />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {running && (
          <div className="mb-6 text-center">
            <p className="experiment-status-pulse text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
              Scrutini in corso…
            </p>
          </div>
        )}

        {result && !running && (
          <>
            {result.scenario && (
              <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-in fade-in duration-500">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Scenario
                </p>
                <h2 className="mt-1 text-lg font-semibold">{result.scenario.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{result.scenario.narrative}</p>
              </div>
            )}

            <div className="experiment-map-frame mb-6 h-[380px] sm:h-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ItalyLeafletMapInner
                data={result.provincialMap}
                highlightSlug={result.winner.partySlug}
                dark
                tall
              />
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <div className="hub-card rounded-xl p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Classifica
                </h3>
                <ul className="space-y-2">
                  {sortedPlayers.map((p, i) => (
                    <li
                      key={p.playerId}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
                        i < revealedRows ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                      }`}
                      style={{
                        backgroundColor: i === 0 ? `${p.partyColor}22` : "var(--surface)",
                        transitionDelay: `${i * 80}ms`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: p.partyColor }}
                        />
                        <div>
                          <p className="text-sm font-medium">{p.candidateName}</p>
                          <p className="text-xs text-[var(--muted)]">{p.partyName}</p>
                        </div>
                      </div>
                      <div className="text-right font-mono text-sm">
                        <span className="font-bold">{p.percentage}%</span>
                        <span className="ml-2 text-[var(--muted)]">{p.totalSeats} seggi</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hub-card rounded-xl p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Insights
                </h3>
                <ul className="space-y-3">
                  {(result.insights ?? []).map((ins) => (
                    <li key={ins.label} className="border-b border-[var(--border)] pb-2 last:border-0">
                      <p className="text-xs text-[var(--muted)]">{ins.label}</p>
                      <p className="font-medium">{ins.value}</p>
                      {ins.detail && (
                        <p className="text-xs text-[var(--muted)]">{ins.detail}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{result.narrative}</p>
              </div>
            </div>

            <RegionGrid
              regions={result.regionalResults}
              selected={null}
              onSelect={() => {}}
            />

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={onRestart}>Nuova partita</Button>
              <Button variant="outline" asChild>
                <Link href={`/gioco/${modeSlug}`}>Riconfigura</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/gioco">Home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
