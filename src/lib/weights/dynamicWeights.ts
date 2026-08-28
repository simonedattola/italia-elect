import { FACTORS } from "./factorRegistry";
import {
  CATEGORY_LABELS,
  CATEGORY_SCENARIO_WEIGHTS,
} from "./categoryConfig";
import type {
  AggregatedWeights,
  ComputedFactorWeight,
  DailyFactorSnapshot,
  FactorSpec,
  ScenarioMode,
} from "./types";

const CORRECTION_FACTOR = 0.3;
const MIN_STD = 0.0001;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Normalizza valore grezzo in [0,1] rispetto alla media storica.
 * Per effetti "bonus quando alto" vs "penalty quando alto" il segno è gestito downstream.
 */
export function normalizeFactorValue(
  value: number,
  spec: FactorSpec,
): number {
  const std = Math.max(spec.historicalStdDev, MIN_STD);
  const z = (value - spec.historicalMean) / std;
  return clamp(0.5 + z * 0.15, 0, 1);
}

/**
 * Peso_Fattore_i = Baseline_i * (1 + (Valore - Media) / Std * 0.3)
 */
export function computeFactorDynamicWeight(
  spec: FactorSpec,
  currentValue: number,
  baseline: number,
): { dynamicWeight: number; correction: number; rawValue: number } {
  const std = Math.max(spec.historicalStdDev, MIN_STD);
  const correction =
    ((currentValue - spec.historicalMean) / std) * CORRECTION_FACTOR;
  const dynamicWeight = baseline * (1 + correction);
  const rawValue = normalizeFactorValue(currentValue, spec);
  return {
    dynamicWeight: Math.max(0, dynamicWeight),
    correction,
    rawValue,
  };
}

function baselineForFactor(spec: FactorSpec, scenario: ScenarioMode): number {
  const categoryPct = CATEGORY_SCENARIO_WEIGHTS[scenario][spec.category];
  const inCategory = FACTORS.filter((f) => f.category === spec.category).length;
  // Baseline come frazione del totale (0..1)
  return (categoryPct / 100) / inCategory;
}

export function computeDynamicWeights(
  snapshot: DailyFactorSnapshot,
  scenario: ScenarioMode = "base",
): ComputedFactorWeight[] {
  const results: ComputedFactorWeight[] = [];

  for (const spec of FACTORS) {
    const value = snapshot.factors[spec.id] ?? spec.historicalMean;
    const baseline = baselineForFactor(spec, scenario);
    const { dynamicWeight, correction, rawValue } = computeFactorDynamicWeight(
      spec,
      value,
      baseline,
    );

    results.push({
      factorId: spec.id,
      factorName: spec.name,
      category: spec.category,
      rawValue,
      baseline,
      dynamicWeight,
      weight: dynamicWeight,
      weightedScore: rawValue * dynamicWeight,
      correction,
    });
  }

  return results;
}

export function aggregateCategoryWeights(
  factors: ComputedFactorWeight[],
  scenario: ScenarioMode,
  snapshotDate: string,
): AggregatedWeights {
  const categories = Object.keys(CATEGORY_SCENARIO_WEIGHTS.base).map(
    (cat) => cat as ComputedFactorWeight["category"],
  );

  const categorySummaries = categories.map((category) => {
    const catFactors = factors.filter((f) => f.category === category);
    const baseShare = CATEGORY_SCENARIO_WEIGHTS[scenario][category];
    const adjustedShare =
      catFactors.reduce((s, f) => s + f.dynamicWeight, 0) * 100;
    return {
      category,
      label: CATEGORY_LABELS[category],
      baseShare,
      adjustedShare,
      factorCount: catFactors.length,
    };
  });

  const totalWeight = factors.reduce((s, f) => s + f.dynamicWeight, 0);

  return {
    scenario,
    computedAt: new Date().toISOString(),
    snapshotDate,
    factors,
    categories: categorySummaries,
    totalWeight,
  };
}

export function computeAggregatedWeights(
  snapshot: DailyFactorSnapshot,
  scenario: ScenarioMode = "base",
): AggregatedWeights {
  const factors = computeDynamicWeights(snapshot, scenario);
  return aggregateCategoryWeights(factors, scenario, snapshot.date);
}
