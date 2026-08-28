import {
  CATEGORY_LABELS,
  CATEGORY_SCENARIO_WEIGHTS,
} from "./categoryConfig";
import { FACTORS } from "./factorRegistry";
import { computeDynamicWeights } from "./dynamicWeights";
import type {
  AggregatedWeights,
  CategoryWeightSummary,
  DailyFactorSnapshot,
  ScenarioMode,
} from "./types";

export function aggregateByCategory(
  aggregated: AggregatedWeights,
): CategoryWeightSummary[] {
  return aggregated.categories;
}

export function getTopFactors(
  aggregated: AggregatedWeights,
  limit = 10,
): AggregatedWeights["factors"] {
  return [...aggregated.factors]
    .sort((a, b) => b.dynamicWeight - a.dynamicWeight)
    .slice(0, limit);
}

export function compareScenarios(
  snapshot: DailyFactorSnapshot,
): Record<ScenarioMode, AggregatedWeights> {
  const modes: ScenarioMode[] = ["base", "crisis", "election"];
  const out = {} as Record<ScenarioMode, AggregatedWeights>;
  for (const mode of modes) {
    const factors = computeDynamicWeights(snapshot, mode);
    const totalWeight = factors.reduce((s, f) => s + f.dynamicWeight, 0);
    const categories = (Object.keys(CATEGORY_SCENARIO_WEIGHTS.base) as Array<
      keyof typeof CATEGORY_SCENARIO_WEIGHTS.base
    >).map((category) => {
      const catFactors = factors.filter((f) => f.category === category);
      return {
        category,
        label: CATEGORY_LABELS[category],
        baseShare: CATEGORY_SCENARIO_WEIGHTS[mode][category],
        adjustedShare:
          catFactors.reduce((s, f) => s + f.dynamicWeight, 0) * 100,
        factorCount: catFactors.length,
      };
    });
    out[mode] = {
      scenario: mode,
      computedAt: new Date().toISOString(),
      snapshotDate: snapshot.date,
      factors,
      categories,
      totalWeight,
    };
  }
  return out;
}

export function categoryWeightDelta(
  base: AggregatedWeights,
  crisis: AggregatedWeights,
): Array<{ category: string; deltaPct: number }> {
  return base.categories.map((b) => {
    const c = crisis.categories.find((x) => x.category === b.category);
    return {
      category: b.label,
      deltaPct: (c?.adjustedShare ?? 0) - b.adjustedShare,
    };
  });
}

export function validateFactorCoverage(snapshot: DailyFactorSnapshot): {
  total: number;
  covered: number;
  missing: string[];
} {
  const missing = FACTORS
    .filter((f) => snapshot.factors[f.id] == null)
    .map((f) => f.id);
  return {
    total: FACTORS.length,
    covered: FACTORS.length - missing.length,
    missing,
  };
}
