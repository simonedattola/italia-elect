import { FACTOR_SPECS, FACTOR_COUNT } from "./factorSpecs";
import type { FactorSpec, WeightCategory } from "./types";

export const FACTORS: FactorSpec[] = FACTOR_SPECS;

export function getFactorById(id: string): FactorSpec | undefined {
  return FACTORS.find((f) => f.id === id);
}

export function factorsByCategory(category: WeightCategory): FactorSpec[] {
  return FACTORS.filter((f) => f.category === category);
}

export function countFactorsByCategory(): Record<WeightCategory, number> {
  const counts = {} as Record<WeightCategory, number>;
  for (const f of FACTORS) {
    counts[f.category] = (counts[f.category] ?? 0) + 1;
  }
  return counts;
}

export { FACTOR_COUNT };
