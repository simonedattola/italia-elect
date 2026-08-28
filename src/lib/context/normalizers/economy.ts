/** Clamp helper. */
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * GDP growth: -5% → 0, 0% → 0.5, +5% → 1
 */
export function normalizeGDP(gdpValue: number): number {
  return clamp01((gdpValue + 5) / 10);
}

/**
 * Unemployment: 5% → 0 (best), 20% → 1 (worst) on distress scale.
 * For "positive economy" factors invert when needed upstream.
 */
export function normalizeUnemployment(unemploymentRate: number): number {
  return clamp01((unemploymentRate - 5) / 15);
}

/**
 * Inflation YoY: 0% → 0, 2% → ~0.4, 10%+ → 1 (distress).
 */
export function normalizeInflation(inflationRate: number): number {
  return clamp01(inflationRate / 10);
}

/**
 * Disposable income index (100 = national mean) → 0..1 centered at 0.5.
 */
export function normalizeIncomeIndex(index: number): number {
  return clamp01((index - 70) / 60);
}

/**
 * Household consumption growth: -5..+5 → 0..1
 */
export function normalizeConsumptionGrowth(growthPct: number): number {
  return clamp01((growthPct + 5) / 10);
}

/**
 * Investment climate score already on 0..100 → 0..1
 */
export function normalizeInvestmentScore(score0to100: number): number {
  return clamp01(score0to100 / 100);
}
