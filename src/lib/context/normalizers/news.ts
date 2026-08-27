/** Clamp helper. */
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * News tone from -1 (very negative) .. +1 (very positive) → 0..1
 */
export function normalizeNewsTone(tone: number): number {
  return clamp01((tone + 1) / 2);
}

/**
 * Media coverage share 0..1 already, or 0..100 → 0..1
 */
export function normalizeCoverage(share: number): number {
  if (share > 1) return clamp01(share / 100);
  return clamp01(share);
}
