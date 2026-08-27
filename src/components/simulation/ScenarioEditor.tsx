"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PARTIES } from "@/lib/electoral/parties";
import {
  COALITION_OPTIONS,
  DEFAULT_UI_SCENARIO,
  type UiMode,
  type UiScenarioConfig,
} from "@/types/scenario";

type Props = {
  value?: UiScenarioConfig;
  onChange: (scenario: UiScenarioConfig) => void;
};

export function ScenarioEditor({ value, onChange }: Props) {
  const [cfg, setCfg] = useState<UiScenarioConfig>(value ?? DEFAULT_UI_SCENARIO);

  useEffect(() => {
    if (value) setCfg(value);
  }, [value]);

  function patch(partial: Partial<UiScenarioConfig>) {
    const next = { ...cfg, ...partial };
    // Fun mode forza chaos
    if (partial.uiMode === "fun") {
      next.chaosMode = true;
      next.uiMode = "fun";
    }
    if (partial.uiMode === "analyst") {
      next.uiMode = "analyst";
      if (cfg.uiMode === "fun") next.chaosMode = false;
    }
    setCfg(next);
    onChange(next);
  }

  function setPartyAdj(slug: string, v: number) {
    const partyVoteAdjustments = { ...cfg.partyVoteAdjustments, [slug]: v };
    if (v === 0) delete partyVoteAdjustments[slug];
    patch({ partyVoteAdjustments });
  }

  function toggleCoalition(id: string, on: boolean) {
    patch({
      activeCoalitions: { ...cfg.activeCoalitions, [id]: on },
    });
  }

  const adjustableParties = useMemo(
    () => PARTIES.filter((p) => p.slug !== "italexit"),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5"
      id="scenario-editor"
    >
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--it-blue)]">
          Editor Scenario
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Aggiustamenti sul prior MRP+ABM — non alterano i dati storici grezzi
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ModeButton
          active={cfg.uiMode === "analyst"}
          onClick={() => patch({ uiMode: "analyst" as UiMode })}
          title="Analista"
          subtitle="Accuratezza · shock contenuti"
        />
        <ModeButton
          active={cfg.uiMode === "fun"}
          onClick={() => patch({ uiMode: "fun" as UiMode })}
          title="Amici"
          subtitle="Chaos · effetti amplificati"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Adjustment voti (pp)</p>
        <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
          {adjustableParties.map((party) => {
            const v = cfg.partyVoteAdjustments[party.slug] ?? 0;
            return (
              <div key={party.slug} className="flex items-center gap-3 text-sm">
                <span
                  className="w-28 shrink-0 truncate font-medium"
                  style={{ color: party.color }}
                  title={party.name}
                >
                  {party.shortName}
                </span>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={v}
                  aria-label={`Adjustment ${party.shortName}`}
                  onChange={(e) => setPartyAdj(party.slug, parseFloat(e.target.value))}
                  className="h-2 w-full accent-[var(--it-blue)]"
                />
                <span className="w-12 shrink-0 text-right tabular-nums text-[var(--muted)]">
                  {v > 0 ? "+" : ""}
                  {v.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Coalizioni attive</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COALITION_OPTIONS.map((coal) => (
            <label
              key={coal.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={cfg.activeCoalitions[coal.id] !== false}
                onChange={(e) => toggleCoalition(coal.id, e.target.checked)}
                className="accent-[var(--it-blue)]"
              />
              <span>{coal.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="threshold">Soglia sbarramento</label>
            <span className="tabular-nums text-[var(--muted)]">
              {cfg.partyThreshold.toFixed(1)}%
            </span>
          </div>
          <input
            id="threshold"
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={cfg.partyThreshold}
            onChange={(e) =>
              patch({ partyThreshold: parseFloat(e.target.value) })
            }
            className="h-2 w-full accent-[var(--it-blue)]"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="turnout">Affluenza</label>
            <span className="tabular-nums text-[var(--muted)]">{cfg.turnout}%</span>
          </div>
          <input
            id="turnout"
            type="range"
            min={50}
            max={90}
            step={1}
            value={cfg.turnout}
            onChange={(e) => patch({ turnout: parseInt(e.target.value, 10) })}
            className="h-2 w-full accent-[var(--it-red)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            id="chaos-mode"
            type="checkbox"
            checked={cfg.chaosMode}
            onChange={(e) => patch({ chaosMode: e.target.checked })}
            className="accent-[var(--it-red)]"
          />
          <span>Modalità Chaos (shock amplificati)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={cfg.useRosatellum}
            onChange={(e) => patch({ useRosatellum: e.target.checked })}
            className="accent-[var(--it-blue)]"
          />
          <span>Rosatellum (uninominale + proporzionale)</span>
        </label>
      </div>
    </motion.div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-3 text-left transition ${
        active
          ? "border-[var(--it-blue)] bg-[var(--it-blue)]/8 shadow-sm"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--it-blue)]/40"
      }`}
    >
      <span className="block font-medium">{title}</span>
      <span className="mt-0.5 block text-xs text-[var(--muted)]">{subtitle}</span>
    </button>
  );
}
