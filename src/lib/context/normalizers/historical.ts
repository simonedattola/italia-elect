/** Clamp helper. */
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Historical election share vs a reference peak (e.g. party max or 50%).
 * sharePct and peakPct are percentages 0..100.
 */
export function normalizeHistoricalShare(sharePct: number, peakPct = 50): number {
  if (peakPct <= 0) return 0;
  return clamp01(sharePct / peakPct);
}

/**
 * Turnout rate 0..100 → 0..1
 */
export function normalizeTurnout(turnoutPct: number): number {
  return clamp01(turnoutPct / 100);
}

/**
 * Historical swing magnitude (absolute pp change) capped at 15pp → 0..1
 */
export function normalizeSwing(absPpChange: number): number {
  return clamp01(Math.abs(absPpChange) / 15);
}
