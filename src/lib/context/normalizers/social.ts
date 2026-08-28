/** Clamp helper. */
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Sentiment score from -1..+1 → 0..1
 */
export function normalizeSentiment(sentiment: number): number {
  return clamp01((sentiment + 1) / 2);
}

/**
 * Conversation / mention volume relative to a reference max.
 */
export function normalizeVolume(volume: number, referenceMax = 100): number {
  return clamp01(volume / referenceMax);
}
