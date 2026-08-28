/** Clamp helper. */
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Poll share percentage 0..100 → 0..1
 */
export function normalizePollShare(pct: number): number {
  return clamp01(pct / 100);
}

/**
 * Weighted average of recent poll shares for a party.
 * Weights newer polls more heavily (linear decay).
 */
export function weightedAveragePollShare(
  observations: Array<{ sharePct: number; daysAgo: number; sampleSize?: number | null }>,
): number {
  if (observations.length === 0) return 0;
  let num = 0;
  let den = 0;
  for (const o of observations) {
    const recency = Math.max(0.15, 1 - o.daysAgo / 45);
    const sample = o.sampleSize && o.sampleSize > 0 ? Math.min(1.5, Math.sqrt(o.sampleSize) / 40) : 1;
    const w = recency * sample;
    num += o.sharePct * w;
    den += w;
  }
  return den > 0 ? num / den : 0;
}
