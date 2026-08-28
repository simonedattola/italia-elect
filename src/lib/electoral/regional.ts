import type { PartyResult } from "@/types/simulation";
import { PARTIES } from "./parties";
import { PROVINCES } from "./provinces";
import { AREA_BIAS, PROVINCE_BIAS } from "./historical";

function normalize(shares: Record<string, number>): Record<string, number> {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) out[k] = (v / sum) * 100;
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Percentuali per regione da baseline nazionale + bias territoriali. */
export function computeRegionalShares(
  national: Record<string, number>,
  regionName: string,
): Record<string, number> {
  const provinces = PROVINCES.filter((p) => p.regionName === regionName);
  if (provinces.length === 0) return { ...national };

  const weighted: Record<string, number> = {};
  let totalPop = 0;

  for (const prov of provinces) {
    const areaBias = AREA_BIAS[prov.area] ?? {};
    const provBias = PROVINCE_BIAS[prov.code] ?? {};
    const local: Record<string, number> = {};
    for (const party of PARTIES) {
      const ab = areaBias[party.slug] ?? 1;
      const pb = provBias[party.slug] ?? 1;
      local[party.slug] = (national[party.slug] ?? 0) * ab * pb;
    }
    const normed = normalize(local);
    const pop = prov.population;
    totalPop += pop;
    for (const [slug, pct] of Object.entries(normed)) {
      weighted[slug] = (weighted[slug] ?? 0) + pct * pop;
    }
  }

  const out: Record<string, number> = {};
  for (const [slug, v] of Object.entries(weighted)) {
    out[slug] = v / totalPop;
  }
  return normalize(out);
}

export function regionalSharesToPartyResults(
  shares: Record<string, number>,
  nationalResults: PartyResult[],
  baseline: Record<string, number>,
): PartyResult[] {
  return PARTIES.map((p) => {
    const ref = nationalResults.find((r) => r.partySlug === p.slug);
    const pct = shares[p.slug] ?? 0;
    const base = baseline[p.slug] ?? 0;
    return {
      partySlug: p.slug,
      partyName: p.name,
      shortName: p.shortName,
      color: p.color,
      percentage: round1(pct),
      percentageLow: ref?.percentageLow ?? round1(pct),
      percentageHigh: ref?.percentageHigh ?? round1(pct),
      swing: round1(pct - base),
      seatsChamber: ref?.seatsChamber ?? 0,
      seatsSenate: ref?.seatsSenate ?? 0,
    };
  }).sort((a, b) => b.percentage - a.percentage);
}
