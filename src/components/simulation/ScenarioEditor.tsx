"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  collapsed?: boolean;
  parties?: Array<{ slug: string; shortName: string; color: string; aiDetected?: boolean }>;
};

export function ScenarioEditor({ value, onChange, collapsed = false, parties: partiesProp }: Props) {
  const [cfg, setCfg] = useState<UiScenarioConfig>(value ?? DEFAULT_UI_SCENARIO);
  const [open, setOpen] = useState(!collapsed);

  useEffect(() => {
    if (value) setCfg(value);
  }, [value]);

  function patch(partial: Partial<UiScenarioConfig>) {
    const next = { ...cfg, ...partial };
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

  const adjustableParties = useMemo(() => {
    if (partiesProp?.length) {
      return partiesProp.map((p) => {
        const full = PARTIES.find((x) => x.slug === p.slug);
        return full ?? {
          slug: p.slug,
          name: p.shortName,
          shortName: p.shortName,
          color: p.color,
          ideology: "CENTER" as const,
          ideologyScore: 0,
          coalitionFamily: "ALTRO" as const,
          aiDetected: p.aiDetected,
        };
      });
    }
    return PARTIES.filter((p) => p.slug !== "italexit");
  }, [partiesProp]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white/[0.03] backdrop-blur-xl"
      id="scenario-editor"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
      >
        <h3 className="text-base font-semibold text-white">Scenario</h3>
        <span className="text-xs text-[var(--muted)]">{open ? "−" : "+"}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="border-t border-[var(--border)]"
          >
            <div className="space-y-5 p-4 sm:p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <ModeButton
                  active={cfg.uiMode === "analyst"}
                  onClick={() => patch({ uiMode: "analyst" as UiMode })}
                  label="Analista"
                />
                <ModeButton
                  active={cfg.uiMode === "fun"}
                  onClick={() => patch({ uiMode: "fun" as UiMode })}
                  label="Amici"
                  chaos
                />
              </div>

              <div className="space-y-3">
                <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                  {adjustableParties.map((party) => {
                    const v = cfg.partyVoteAdjustments[party.slug] ?? 0;
                    const pct = ((v + 5) / 10) * 100;
                    return (
                      <div key={party.slug} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className="truncate font-medium"
                            style={{ color: party.color }}
                            title={party.name}
                          >
                            {party.shortName}
                          </span>
                          <span className="font-mono-data text-[var(--muted)]">
                            {v > 0 ? "+" : ""}
                            {v.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-5}
                          max={5}
                          step={0.5}
                          value={v}
                          aria-label={party.shortName}
                          onChange={(e) =>
                            setPartyAdj(party.slug, parseFloat(e.target.value))
                          }
                          className="slider-premium w-full"
                          style={{
                            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {COALITION_OPTIONS.map((coal) => (
                    <label
                      key={coal.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 py-2.5 text-sm transition hover:border-[var(--it-blue)]/40"
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
                    <label htmlFor="threshold">Soglia</label>
                    <span className="font-mono-data text-[var(--muted)]">
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
                    className="slider-premium w-full"
                    style={{
                      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(cfg.partyThreshold / 10) * 100}%, rgba(255,255,255,0.08) ${(cfg.partyThreshold / 10) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor="turnout">Affluenza</label>
                    <span className="font-mono-data text-[var(--muted)]">
                      {cfg.turnout}%
                    </span>
                  </div>
                  <input
                    id="turnout"
                    type="range"
                    min={50}
                    max={90}
                    step={1}
                    value={cfg.turnout}
                    onChange={(e) =>
                      patch({ turnout: parseInt(e.target.value, 10) })
                    }
                    className="slider-premium w-full"
                    style={{
                      background: `linear-gradient(to right, #009246 0%, #009246 ${((cfg.turnout - 50) / 40) * 100}%, rgba(255,255,255,0.08) ${((cfg.turnout - 50) / 40) * 100}%, rgba(255,255,255,0.08) 100%)`,
                    }}
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
                    className="accent-[var(--chaos)]"
                  />
                  <span>Chaos</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cfg.useRosatellum}
                    onChange={(e) => patch({ useRosatellum: e.target.checked })}
                    className="accent-[var(--it-blue)]"
                  />
                  <span>Rosatellum</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  chaos,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  chaos?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
        active
          ? chaos
            ? "border-[var(--chaos)]/50 bg-[var(--chaos)]/15 glow-chaos text-white"
            : "border-[var(--it-blue)]/50 bg-[var(--it-blue)]/15 glow-blue text-white"
          : "border-[var(--border)] bg-white/[0.03] text-white hover:border-white/15"
      }`}
    >
      {label}
    </button>
  );
}
