import type { ContestLevel, ScenarioApplication, ScenarioInput, ScenarioMovement, ScenarioTheme } from "./types";
import { analogueFor } from "./library";

/** Tetto per una lista in un singolo scenario, in punti percentuali, prima della rinormalizzazione. */
export const SCENARIO_LIST_CAP = 4;
/** Tetto cumulato se si impilano più scenari, sempre prima della rinormalizzazione. */
export const SCENARIO_STACK_CAP = 8;

const DURATION = { breve: 0.65, media: 1, lunga: 1.15 } as const;

const INCUMBENTS = new Set(["fratelli-ditalia", "lega", "forza-italia", "noi-moderati"]);

interface ListRef {
  id: string;
  ideology?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function scopeScale(scope: ScenarioInput["scope"], level?: ContestLevel): number {
  if (scope === "nazionale") return 1;
  if (scope === "regionale") return level === "regionali" ? 1 : 0.35;
  return level === "comunali" ? 1 : 0.15;
}

/**
 * Peso di issue ownership, da −1 (perde) a +1 (guadagna).
 * È uno schema dichiarato: la salienza del tema, non un coefficiente stimato.
 */
export function ownership(theme: ScenarioTheme, list: ListRef, affected?: Set<string>): number {
  const id = list.id;
  const ideology = list.ideology ?? 0;
  const hit = affected?.has(id) ?? false;
  if ((theme === "corruption" || theme === "leader") && affected && affected.size > 0) {
    if (hit) return -1;
    return ideology < -0.15 ? 0.28 : ideology > 0.45 ? 0.12 : 0.18;
  }
  switch (theme) {
    case "migration":
      if (id === "lega" || id === "futuro-nazionale") return 1;
      if (id === "fratelli-ditalia") return 0.72;
      if (ideology > 0.45) return 0.4;
      if (id === "partito-democratico" || id === "avss" || id === "piu-europa") return -0.62;
      return ideology < 0 ? -0.28 : -0.05;
    case "security":
      if (ideology > 0.5) return 0.85;
      if (id === "fratelli-ditalia" || id === "lega") return 0.8;
      if (ideology < -0.2) return -0.45;
      return 0.05;
    case "recession":
      if (INCUMBENTS.has(id)) return -0.8;
      if (id === "movimento-5-stelle" || id === "partito-democratico") return 0.55;
      return ideology < 0 ? 0.25 : -0.1;
    case "inflation":
      if (INCUMBENTS.has(id)) return -0.7;
      if (id === "movimento-5-stelle") return 0.6;
      if (id === "partito-democratico" || id === "avss") return 0.3;
      return -0.05;
    case "energy":
      if (INCUMBENTS.has(id)) return -0.55;
      if (id === "avss") return 0.35;
      if (id === "movimento-5-stelle" || id === "partito-democratico") return 0.3;
      return 0;
    case "growth":
      if (INCUMBENTS.has(id)) return 0.75;
      if (id === "azione" || id === "italia-viva" || id === "forza-italia") return 0.35;
      return ideology < -0.3 ? -0.25 : -0.08;
    case "war":
      if (INCUMBENTS.has(id)) return 0.4;
      if (id === "piu-europa" || id === "partito-democratico") return 0.22;
      if (id === "futuro-nazionale" || id === "italexit") return -0.2;
      return 0.05;
    case "pandemic":
      if (INCUMBENTS.has(id)) return 0.35;
      if (id === "partito-democratico") return 0.15;
      return -0.08;
    case "environment":
      if (id === "avss") return 1;
      if (id === "partito-democratico" || id === "piu-europa" || id === "movimento-5-stelle") return 0.45;
      if (ideology > 0.45) return -0.4;
      return 0;
    case "corruption":
      if (INCUMBENTS.has(id) || id === "partito-democratico" || id === "forza-italia") return -0.55;
      if (id === "movimento-5-stelle") return 0.7;
      return 0.15;
    case "leader":
      if (INCUMBENTS.has(id)) return -0.65;
      return 0.2;
    default:
      return 0;
  }
}

function renormalize(values: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  let sum = 0;
  for (const [id, value] of Object.entries(values)) {
    const v = Math.max(0, value);
    next[id] = v;
    sum += v;
  }
  if (sum <= 0) return next;
  for (const id of Object.keys(next)) next[id] = (next[id] / sum) * 100;
  return next;
}

function themeLabel(theme: ScenarioTheme): string {
  const labels: Record<ScenarioTheme, string> = {
    migration: "immigrazione",
    recession: "recessione",
    inflation: "inflazione",
    energy: "energia",
    security: "sicurezza",
    corruption: "corruzione",
    war: "crisi internazionale",
    pandemic: "pandemia",
    growth: "crescita",
    environment: "ambiente",
    leader: "scandalo del leader",
  };
  return labels[theme];
}

export function applyScenarioStack(
  baseline: Record<string, number>,
  lists: ListRef[],
  scenarios: ScenarioInput[],
  level?: ContestLevel,
): ScenarioApplication {
  const deltas: Record<string, number> = {};
  const notes: string[] = [];
  const known = new Map(lists.map((list) => [list.id, list]));
  for (const id of Object.keys(baseline)) {
    if (!known.has(id)) known.set(id, { id, ideology: 0 });
  }

  for (const scenario of scenarios) {
    const intensity = clamp(scenario.intensity, 0, 1);
    if (intensity === 0) {
      notes.push(`${scenario.title}: intensità zero, nessuno spostamento.`);
      continue;
    }
    const scale = 2.6 * intensity * DURATION[scenario.duration] * scopeScale(scenario.scope, level);
    const affected = new Set(scenario.affectedPartyIds ?? []);
    const local: Record<string, number> = {};
    for (const list of known.values()) {
      if ((baseline[list.id] ?? 0) <= 0 && !affected.has(list.id)) continue;
      let weight = 0;
      for (const [theme, themeWeight] of Object.entries(scenario.themes) as [ScenarioTheme, number][]) {
        const tw = clamp(themeWeight ?? 0, 0, 1);
        if (tw === 0) continue;
        weight += ownership(theme, list, affected.size ? affected : undefined) * tw;
      }
      const delta = clamp(weight * scale, -SCENARIO_LIST_CAP, SCENARIO_LIST_CAP);
      if (delta !== 0) local[list.id] = delta;
    }
    for (const [id, delta] of Object.entries(local)) {
      deltas[id] = clamp((deltas[id] ?? 0) + delta, -SCENARIO_STACK_CAP, SCENARIO_STACK_CAP);
    }
    const themes = (Object.keys(scenario.themes) as ScenarioTheme[])
      .filter((theme) => (scenario.themes[theme] ?? 0) > 0)
      .map(themeLabel);
    const where = scenario.territory ? `${scenario.scope}, ${scenario.territory}` : scenario.scope;
    const moved = Object.entries(local)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 4)
      .map(([id, delta]) => `${id} ${delta > 0 ? "+" : ""}${delta.toFixed(1)}`)
      .join(", ");
    notes.push(
      `${scenario.title} (intensità ${Math.round(intensity * 100)}%, ${scenario.duration}, ${where}${themes.length ? `, temi: ${themes.join(", ")}` : ""}): ${moved || "nessuna lista presente da spostare"}. Schema di issue ownership, non una stima causale.`,
    );
    const analogue = analogueFor(scenario.themes);
    if (analogue) notes.push(analogue);
  }

  const shifted: Record<string, number> = { ...baseline };
  const any = Object.values(deltas).some((delta) => delta !== 0);
  for (const [id, delta] of Object.entries(deltas)) {
    shifted[id] = Math.max(0, (shifted[id] ?? 0) + delta);
  }
  const shares = any ? renormalize(shifted) : { ...baseline };
  const movements: ScenarioMovement[] = Object.keys({ ...baseline, ...shares })
    .map((id) => {
      const before = baseline[id] ?? 0;
      const after = shares[id] ?? 0;
      return { id, before, after, delta: after - before };
    })
    .filter((row) => Math.abs(row.delta) >= 0.05)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { shares, notes, movements };
}
