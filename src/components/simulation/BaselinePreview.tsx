"use client";

import { useEffect, useMemo, useState } from "react";
import { PARTIES } from "@/lib/electoral/parties";
import type { UiScenarioConfig } from "@/types/scenario";
import {
  CandidateCompatBadge,
  type SimulationPreviewData,
} from "./CandidateCompatBadge";

type BaselineMeta = {
  asOf?: string;
  methodology?: string;
};

export function BaselinePreview({
  partySlug,
  scenario,
  candidate,
}: {
  partySlug: string;
  scenario: UiScenarioConfig;
  candidate?: {
    firstName: string;
    lastName: string;
    description: string;
    program?: string;
  };
}) {
  const [baseline, setBaseline] = useState<Record<string, number> | null>(null);
  const [meta, setMeta] = useState<BaselineMeta | null>(null);
  const [simPreview, setSimPreview] = useState<SimulationPreviewData | null>(null);

  const selectedParty = PARTIES.find((p) => p.slug === partySlug);

  useEffect(() => {
    fetch("/api/baseline")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setBaseline(d.baseline);
          setMeta(d.meta);
        }
      })
      .catch(() => undefined);
  }, []);

  const rows = useMemo(() => {
    const source =
      simPreview?.projectedShares && Object.keys(simPreview.projectedShares).length > 0
        ? simPreview.projectedShares
        : null;

    if (source) {
      const list = PARTIES.filter((p) => p.slug !== "italexit").map((p) => ({
        slug: p.slug,
        name: p.shortName,
        color: p.color,
        pct: source[p.slug] ?? 0,
      }));
      return list.sort((a, b) => b.pct - a.pct);
    }

    if (!baseline) return [];
    const chaosMul = scenario.chaosMode ? 1.35 : 1;
    const list = PARTIES.filter((p) => p.slug !== "italexit").map((p) => {
      const base = baseline[p.slug] ?? 0;
      const adj = (scenario.partyVoteAdjustments[p.slug] ?? 0) * chaosMul;
      return {
        slug: p.slug,
        name: p.shortName,
        color: p.color,
        value: Math.max(0.1, base + adj),
      };
    });
    const total = list.reduce((s, r) => s + r.value, 0);
    return list
      .map((r) => ({ ...r, pct: (r.value / total) * 100 }))
      .sort((a, b) => b.pct - a.pct);
  }, [baseline, scenario, simPreview]);

  const selectedPct = rows.find((r) => r.slug === partySlug)?.pct;
  const usingSimulation = Boolean(simPreview?.projectedShares);

  return (
    <div className="space-y-4">
      {candidate && selectedParty && (
        <CandidateCompatBadge
          firstName={candidate.firstName}
          lastName={candidate.lastName}
          partySlug={partySlug}
          description={candidate.description}
          program={candidate.program}
          partyName={selectedParty.name}
          partyColor={selectedParty.color}
          scenario={scenario}
          onPreview={setSimPreview}
        />
      )}

      <div className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              {usingSimulation ? "Distribuzione simulata" : "Baseline nazionale"}
            </p>
            {selectedParty && selectedPct != null && (
              <p className="mt-1 text-sm text-white">
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ background: selectedParty.color }}
                />
                {selectedParty.shortName}{" "}
                <span className="font-mono-data text-[var(--muted)]">
                  {selectedPct.toFixed(1)}%
                </span>
                {scenario.chaosMode && (
                  <span className="ml-2 text-xs text-[var(--chaos)]">chaos</span>
                )}
              </p>
            )}
          </div>
          {meta?.asOf && !usingSimulation && (
            <time className="text-[10px] text-[var(--muted)]">
              {new Date(meta.asOf).toLocaleDateString("it-IT")}
            </time>
          )}
        </div>

        {!baseline && !usingSimulation ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Caricamento…</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {rows.slice(0, 9).map((r) => {
              const isSelected = r.slug === partySlug;
              const max = rows[0]?.pct ?? 1;
              return (
                <li key={r.slug} className="flex items-center gap-3 text-sm">
                  <span
                    className={`w-12 shrink-0 font-mono-data tabular-nums ${
                      isSelected ? "text-white" : "text-[var(--muted)]"
                    }`}
                  >
                    {r.pct.toFixed(1)}%
                  </span>
                  <div
                    className={`h-1.5 flex-1 rounded-full bg-[var(--surface)] ${
                      isSelected ? "ring-1 ring-white/20" : ""
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(r.pct / max) * 100}%`,
                        background: r.color,
                        opacity: isSelected ? 1 : 0.75,
                      }}
                    />
                  </div>
                  <span
                    className={`w-10 shrink-0 text-right ${
                      isSelected ? "font-medium text-white" : "text-[var(--muted)]"
                    }`}
                  >
                    {r.name}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {usingSimulation ? (
          <p className="mt-4 text-[10px] leading-relaxed text-[var(--muted)]">
            Barre da anteprima Monte Carlo — allineate al motore di simulazione.
          </p>
        ) : (
          meta?.methodology && (
            <p className="mt-4 text-[10px] leading-relaxed text-[var(--muted)]">
              {meta.methodology}
            </p>
          )
        )}
      </div>
    </div>
  );
}
