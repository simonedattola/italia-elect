"use client";

import { useEffect, useState } from "react";
import type { UiScenarioConfig } from "@/types/scenario";

export type SimulationPreviewData = {
  partyCompatibility: number;
  personalImpactScore: number;
  expectedPts: number;
  notoriety: number;
  projectedLeaderPct: number;
  projectedLeaderLow: number;
  projectedLeaderHigh: number;
  swing: number;
  projectedShares: Record<string, number>;
  evidenceNote: string | null;
  defaultPartySlug: string | null;
  categoricalRejection: boolean;
};

function compatTone(score: number): {
  label: string;
  className: string;
  bar: string;
} {
  if (score >= 75) {
    return {
      label: "Alta",
      className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      bar: "bg-emerald-500",
    };
  }
  if (score >= 40) {
    return {
      label: "Media",
      className: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "Bassa",
    className: "text-red-400 bg-red-500/10 border-red-500/30",
    bar: "bg-red-500",
  };
}

export function CandidateCompatBadge({
  firstName,
  lastName,
  partySlug,
  description,
  program,
  partyName,
  partyColor,
  scenario,
  onPreview,
}: {
  firstName: string;
  lastName: string;
  partySlug: string;
  description: string;
  program?: string;
  partyName: string;
  partyColor: string;
  scenario: UiScenarioConfig;
  onPreview?: (data: SimulationPreviewData | null) => void;
}) {
  const [preview, setPreview] = useState<SimulationPreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const fn = firstName.trim();
  const ln = lastName.trim();
  const canPreview = fn.length >= 2 && ln.length >= 2 && description.trim().length >= 20;

  useEffect(() => {
    if (!canPreview) {
      setPreview(null);
      onPreview?.(null);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      fetch("/api/candidate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fn,
          lastName: ln,
          partySlug,
          description: description.trim(),
          program: program?.trim() ?? "",
          scenario: {
            uiMode: scenario.uiMode,
            chaosMode: scenario.chaosMode,
            partyVoteAdjustments: scenario.partyVoteAdjustments,
            activeCoalitions: scenario.activeCoalitions,
            partyThreshold: scenario.partyThreshold,
            turnout: scenario.turnout,
            useRosatellum: scenario.useRosatellum,
          },
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            const data = d as SimulationPreviewData;
            setPreview(data);
            onPreview?.(data);
          } else {
            setPreview(null);
            onPreview?.(null);
          }
        })
        .catch(() => {
          setPreview(null);
          onPreview?.(null);
        })
        .finally(() => setLoading(false));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    fn,
    ln,
    partySlug,
    description,
    program,
    canPreview,
    scenario,
    onPreview,
  ]);

  if (!canPreview) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-[var(--muted)]">
        Inserisci nome, cognome e descrizione (min. 20 caratteri) per l&apos;anteprima
        allineata alla simulazione.
      </div>
    );
  }

  if (loading && !preview) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-[var(--muted)]">
        Calcolo anteprima (stesso motore della simulazione)…
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-[var(--muted)]">
        Anteprima non disponibile.
      </div>
    );
  }

  const compat = preview.partyCompatibility;
  const tone = compatTone(compat);

  return (
    <div className="glass space-y-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Anteprima simulazione
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {fn} {ln}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: partyColor }}
            />
            {partyName}
            {preview.defaultPartySlug &&
              preview.defaultPartySlug !== partySlug && (
                <span className="text-amber-400/90">
                  · naturale: {preview.defaultPartySlug}
                </span>
              )}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone.className}`}
        >
          {tone.label}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-[var(--muted)]">
          <span>Compatibilità elettorale</span>
          <span className="font-mono-data text-white">{compat}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[var(--surface)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
            style={{ width: `${Math.min(100, compat)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Voto stimato
          </p>
          <p className="font-mono-data mt-1 text-lg font-semibold text-white">
            {preview.projectedLeaderPct.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {preview.projectedLeaderLow.toFixed(1)}–
            {preview.projectedLeaderHigh.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Swing
          </p>
          <p className="font-mono-data mt-1 text-lg font-semibold text-white">
            {preview.swing > 0 ? "+" : ""}
            {preview.swing.toFixed(1)}pp
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Personal impact
          </p>
          <p className="font-mono-data mt-1 text-lg font-semibold text-white">
            {preview.personalImpactScore}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Effetto candidato
          </p>
          <p className="font-mono-data mt-1 text-lg font-semibold text-white">
            {preview.expectedPts > 0 ? "+" : ""}
            {preview.expectedPts.toFixed(1)}pp
          </p>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--muted)]">
        Stessa pipeline di /simula (3000 run Monte Carlo, seed fisso). Il risultato finale
        può variare leggermente per seed casuale.
      </p>

      {preview.evidenceNote && (
        <p className="text-xs leading-relaxed text-[var(--muted)] line-clamp-3">
          {preview.evidenceNote}
        </p>
      )}
    </div>
  );
}
