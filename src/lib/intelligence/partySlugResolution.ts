import { PARTIES, getParty } from "@/lib/electoral/parties";
import type { PublicFigureProfile } from "@/lib/intelligence/publicFigure/types";

/** Alias testuali → slug partito (ordine: più specifico prima). */
const PARTY_LABEL_PATTERNS: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /futuro\s+nazionale/i, slug: "futuro-nazionale" },
  { pattern: /fratelli\s+d['']?italia|\bfdi\b/i, slug: "fratelli-ditalia" },
  { pattern: /partito\s+democratico|\bpd\b/i, slug: "partito-democratico" },
  { pattern: /movimento\s+5\s+stelle|\bm5s\b/i, slug: "movimento-5-stelle" },
  { pattern: /forza\s+italia|\bfi\b/i, slug: "forza-italia" },
  { pattern: /lega\s+(per\s+)?salvini|lega\s+nord|\blega\b/i, slug: "lega" },
  { pattern: /alleanza\s+verdi|avss/i, slug: "avss" },
  { pattern: /\bazione\b|italia\s+viva/i, slug: "azione-iv" },
  { pattern: /più\s+europa|piu\s+europa/i, slug: "piu-europa" },
  { pattern: /italexit/i, slug: "italexit" },
];

export function resolvePartySlugFromLabel(label: string): string | null {
  const t = label.trim();
  if (!t) return null;
  for (const { pattern, slug } of PARTY_LABEL_PATTERNS) {
    if (pattern.test(t)) return slug;
  }
  const direct = PARTIES.find(
    (p) =>
      p.slug === t.toLowerCase().replace(/\s+/g, "-") ||
      p.name.toLowerCase() === t.toLowerCase() ||
      p.shortName.toLowerCase() === t.toLowerCase(),
  );
  return direct?.slug ?? null;
}

export function extractPartySlugsFromTexts(texts: string[]): string[] {
  const found = new Set<string>();
  for (const raw of texts) {
    if (!raw) continue;
    for (const { pattern, slug } of PARTY_LABEL_PATTERNS) {
      if (pattern.test(raw)) found.add(slug);
    }
  }
  return [...found];
}

/** Partito politico naturale della figura (KB o carriera). */
export function resolveNaturalPartySlug(
  figure?: PublicFigureProfile,
): string | undefined {
  if (!figure) return undefined;
  if (figure.defaultPartySlug) return figure.defaultPartySlug;

  const texts = [
    ...(figure.partyHistory ?? []),
    ...(figure.associatedParties ?? []),
    figure.biography ?? "",
  ];
  const slugs = extractPartySlugsFromTexts(texts);
  if (slugs.length === 1) return slugs[0];

  // Priorità al partito con ideology più marcata (es. Lega vs generico centro)
  let best: string | undefined;
  let bestAbs = -1;
  for (const slug of slugs) {
    const p = getParty(slug);
    if (!p) continue;
    const abs = Math.abs(p.ideologyScore);
    if (abs > bestAbs) {
      bestAbs = abs;
      best = slug;
    }
  }
  return best;
}

/** Ideologia inferita dai partiti citati nella biografia/carriera. */
export function inferIdeologyFromPartyAffiliation(texts: string[]): number | null {
  const slugs = extractPartySlugsFromTexts(texts);
  if (!slugs.length) return null;

  let sum = 0;
  let n = 0;
  for (const slug of slugs) {
    const p = getParty(slug);
    if (!p) continue;
    sum += p.ideologyScore;
    n++;
  }
  if (n === 0) return null;
  return sum / n;
}
