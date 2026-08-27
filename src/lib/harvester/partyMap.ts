/**
 * Mapping nomi lista Ministero / Eligendo → slug Italia Elect.
 */

const RULES: { pattern: RegExp; slug: string }[] = [
  { pattern: /fratelli\s*d.?italia|fdi/i, slug: "fratelli-ditalia" },
  { pattern: /\blega\b|salvini/i, slug: "lega" },
  { pattern: /forza\s*italia|\bfi\b/i, slug: "forza-italia" },
  { pattern: /partito\s*democratico|\bpd\b|italia\s*democratica\s*e\s*progressista/i, slug: "partito-democratico" },
  { pattern: /movimento\s*5\s*stelle|m5s|cinque\s*stelle/i, slug: "movimento-5-stelle" },
  { pattern: /azione|italia\s*viva|calenda/i, slug: "azione-iv" },
  { pattern: /verdi|sinistra|avs|alleanza\s*verdi/i, slug: "avss" },
  { pattern: /\+?\s*europa|piu\s*europa|più\s*europa/i, slug: "piu-europa" },
  { pattern: /italexit/i, slug: "italexit" },
  { pattern: /noi\s*moderati|udc/i, slug: "forza-italia" }, // coalizione minore → FI proximity
];

export function mapListaToSlug(listaName: string): string | null {
  const name = listaName.trim();
  if (!name) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(name)) return rule.slug;
  }
  return null;
}

/** Normalizza percentuali affinché sommino ~100 (resto → other) */
export function normalizeShares(
  shares: Record<string, number>,
  opts?: { includeOther?: boolean }
): Record<string, number> {
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) {
    if (!Number.isFinite(v) || v <= 0) continue;
    cleaned[k] = (cleaned[k] ?? 0) + v;
  }
  const sum = Object.values(cleaned).reduce((a, b) => a + b, 0);
  if (sum <= 0) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(cleaned)) {
    out[k] = Math.round((v / sum) * 1000) / 10;
  }
  const rounded = Object.values(out).reduce((a, b) => a + b, 0);
  if (opts?.includeOther !== false && rounded < 99.5) {
    out.other = Math.round((100 - rounded) * 10) / 10;
  }
  return out;
}
