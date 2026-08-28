import type { ProvinceResult } from "@/types/simulation";
import { PARTIES, getPartyOrThrow } from "./parties";
import { PROVINCES } from "./provinces";
import { AREA_BIAS, PROVINCE_BIAS } from "./historical";
import { createRng } from "@/lib/utils";

function normalize(shares: Record<string, number>): Record<string, number> {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) out[k] = (v / sum) * 100;
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function buildProvincialMapFromNational(
  national: Record<string, number>,
  opts: {
    leaderSlug?: string;
    leaderMult?: number;
    seed?: number;
    turnoutBase?: number;
  } = {},
): ProvinceResult[] {
  const leaderSlug = opts.leaderSlug ?? "fratelli-ditalia";
  const leaderMult = opts.leaderMult ?? 1;
  const rng = createRng(opts.seed ?? 42);
  const turnoutBase = opts.turnoutBase ?? 65;

  return PROVINCES.map((prov) => {
    const areaBias = AREA_BIAS[prov.area] ?? {};
    const provBias = PROVINCE_BIAS[prov.code] ?? {};
    const local: Record<string, number> = {};
    for (const p of PARTIES) {
      const ab = areaBias[p.slug] ?? 1;
      const pb = provBias[p.slug] ?? 1;
      let v = (national[p.slug] ?? 0) * ab * pb;
      if (p.slug === leaderSlug) v *= 0.95 + 0.1 * Math.min(leaderMult, 1.4);
      v *= 0.97 + rng() * 0.06;
      local[p.slug] = v;
    }
    const normed = normalize(local);
    const ranked = Object.entries(normed).sort((a, b) => b[1] - a[1]);
    const winnerSlug = ranked[0][0];
    const winner = getPartyOrThrow(winnerSlug);
    return {
      provinceCode: prov.code,
      provinceName: prov.name,
      regionName: prov.regionName,
      winnerSlug,
      winnerName: winner.shortName,
      winnerColor: winner.color,
      percentage: round1(ranked[0][1]),
      swing: round1(ranked[0][1] - (national[winnerSlug] ?? 0)),
      turnout: round1(turnoutBase - 8 + rng() * 16),
      topParties: ranked.slice(0, 4).map(([slug, percentage]) => ({
        slug,
        percentage: round1(percentage),
        color: getPartyOrThrow(slug).color,
      })),
      partyShares: Object.fromEntries(
        ranked.map(([slug, percentage]) => [slug, round1(percentage)]),
      ),
    };
  });
}
