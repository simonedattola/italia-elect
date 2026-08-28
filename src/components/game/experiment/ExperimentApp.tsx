"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ElectoralScoreboard } from "./ElectoralScoreboard";
import { RegionGrid } from "./RegionGrid";
import { TicketPanel, generateTicket } from "./TicketPanel";
import { Button } from "@/components/ui/button";
import { getGameBaseline } from "@/lib/game/gameBaseline";
import { buildProvincialMapFromNational } from "@/lib/electoral/provincialMap";
import { PARTIES } from "@/lib/electoral/parties";
import type { GamePlayer, GameSimulationResult } from "@/lib/game/types";
import type { ProvinceResult } from "@/types/simulation";

const ItalyLeafletMapInner = dynamic(
  () => import("@/components/map/italy-leaflet-map").then((m) => m.ItalyLeafletMapInner),
  { ssr: false, loading: () => <div className="h-full min-h-[320px] animate-pulse bg-[var(--surface-2)]" /> },
);

type Phase = "setup" | "counting" | "called";

export function ExperimentApp() {
  const [setupOpen, setSetupOpen] = useState(true);
  const [leftPlayer, setLeftPlayer] = useState<GamePlayer | null>(null);
  const [rightPlayer, setRightPlayer] = useState<GamePlayer | null>(null);
  const [result, setResult] = useState<GameSimulationResult | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [pending, setPending] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    setLeftPlayer(generateTicket("Coalizione A"));
    setRightPlayer(generateTicket("Coalizione B"));
  }, []);

  const baselineMap = useMemo(() => {
    const shares = getGameBaseline();
    const top = Object.entries(shares).sort((a, b) => b[1] - a[1])[0]?.[0];
    return buildProvincialMapFromNational(shares, {
      leaderSlug: top ?? "fratelli-ditalia",
      seed: 42,
    });
  }, []);

  const baselineRegions = useMemo(() => {
    const byRegion = new Map<string, { slug: string; name: string; color: string; pct: number }>();
    for (const prov of baselineMap) {
      const existing = byRegion.get(prov.regionName);
      if (!existing || prov.percentage > existing.pct) {
        byRegion.set(prov.regionName, {
          slug: prov.winnerSlug,
          name: prov.winnerName,
          color: prov.winnerColor,
          pct: prov.percentage,
        });
      }
    }
    return [...byRegion.entries()].map(([regionName, w]) => ({
      regionName,
      winnerSlug: w.slug,
      winnerName: w.name,
      winnerColor: w.color,
      percentage: w.pct,
      partyShares: {},
    }));
  }, [baselineMap]);

  const mapData: ProvinceResult[] = result?.provincialMap ?? baselineMap;

  const statusLabel = useMemo(() => {
    if (pending || phase === "counting") return "Scrutini in corso";
    if (phase === "called" && result) return "Risultato proclamato";
    return "Seggi aperti";
  }, [pending, phase, result]);

  const runSimulation = useCallback(async () => {
    if (!leftPlayer || !rightPlayer) return;
    setPending(true);
    setPhase("counting");
    setSetupOpen(false);
    try {
      const res = await fetch("/api/game/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "multiplayer",
          players: [leftPlayer, rightPlayer],
          redistributionMode: "candidates_only",
          seed: Date.now() % 1e9,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await new Promise((r) => setTimeout(r, 900));
      setResult(data.result);
      setPhase("called");
    } catch (e) {
      alert((e as Error).message);
      setPhase("setup");
    } finally {
      setPending(false);
    }
  }, [leftPlayer, rightPlayer]);

  function resetElection() {
    setResult(null);
    setPhase("setup");
    setSetupOpen(true);
    setSelectedRegion(null);
  }

  const selectedRegionData = result?.regionalResults.find(
    (r) => r.regionName === selectedRegion,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <ElectoralScoreboard result={result} running={pending} />

      <div className="border-b border-[var(--border)] px-4 py-2 text-center sm:px-6">
        <button
          type="button"
          onClick={() => setSetupOpen((o) => !o)}
          className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          {setupOpen ? "▾ nascondi configurazione" : "▸ mostra configurazione"}
        </button>
      </div>

      <div className={`experiment-setup-drawer ${setupOpen ? "open" : ""} border-b border-[var(--border)]`}>
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6">
          {leftPlayer && (
            <TicketPanel
              side="left"
              label="Lista A"
              player={leftPlayer}
              onChange={setLeftPlayer}
              onGenerate={() => setLeftPlayer(generateTicket("Coalizione A"))}
            />
          )}
          {rightPlayer && (
            <TicketPanel
              side="right"
              label="Lista B"
              player={rightPlayer}
              onChange={setRightPlayer}
              onGenerate={() => setRightPlayer(generateTicket("Coalizione B"))}
            />
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3 px-4 pb-4">
          <Button
            size="lg"
            className="min-w-[200px] glow-button-blue"
            disabled={pending || !leftPlayer || !rightPlayer}
            onClick={runSimulation}
          >
            {pending ? "Conteggio…" : "Avvia simulazione"}
          </Button>
          {result && (
            <Button size="lg" variant="outline" onClick={resetElection}>
              Nuova elezione
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 py-3 sm:px-4">
        <div className="experiment-map-frame mx-auto flex w-full max-w-6xl flex-1 flex-col">
          <RegionGrid
            regions={result?.regionalResults ?? baselineRegions}
            selected={selectedRegion}
            onSelect={setSelectedRegion}
          />
          <div className="min-h-[min(52vh,520px)] flex-1">
            <ItalyLeafletMapInner
              data={mapData}
              highlightSlug={selectedRegionData?.winnerSlug}
              dark
              tall
            />
          </div>
          {selectedRegionData && (
            <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
              <strong>{selectedRegionData.regionName}</strong>
              <span className="text-[var(--muted)]">
                {" "}
                — {selectedRegionData.winnerName} {selectedRegionData.percentage}%
              </span>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-4">
            <span className={pending ? "experiment-status-pulse font-medium text-[var(--foreground)]" : ""}>
              {statusLabel}
            </span>
            <span className="hidden sm:inline">Clicca una regione per i dettagli</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {PARTIES.slice(0, 5).map((p) => (
              <span key={p.slug} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: p.color }}
                />
                {p.shortName}
              </span>
            ))}
          </div>
        </div>
      </footer>

      {result && (
        <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm leading-relaxed text-[var(--muted)]">{result.narrative}</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {result.players.map((p) => (
                <div key={p.playerId} className="text-xs">
                  <span className="font-semibold" style={{ color: p.partyColor }}>
                    {p.candidateName}
                  </span>
                  <span className="text-[var(--muted)]">
                    {" "}
                    {p.percentage}% · {p.chamberSeats} seggi
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
