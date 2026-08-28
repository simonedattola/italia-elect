/**
 * Normalizza quote partito a somma 100%.
 */
export function normalizePartyShares(shares: Record<string, number>): Record<string, number> {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) {
    out[k] = (v / sum) * 100;
  }
  return out;
}
