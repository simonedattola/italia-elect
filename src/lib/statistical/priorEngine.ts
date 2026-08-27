/**
 * Motore statistico leggero (MRP-style prior).
 * Prior di voto per cella demografica = baseline comunale × tilt demografico × trend sondaggi.
 */

import { getBaseline, listAvailableYears } from "../harvester/baseline";
import { getPollsNear } from "../harvester/polls";
import type { NormalizedPoll } from "../harvester/types";
import { PARTIES } from "../electoral/parties";
import { normalizePartySlug } from "../microsim/compatibility";

export type AgeGroup = "18-30" | "31-50" | "51-70" | "70+";
export type Gender = "M" | "F";
export type Education = "bassa" | "media" | "alta";
export type Income = "basso" | "medio" | "alto";
export type Zone = "urbano" | "suburbano" | "rurale";

export interface DemographicCell {
  ageGroup: AgeGroup | string;
  gender: Gender;
  education: Education;
  income: Income;
  zone: Zone;
}

export interface StatisticalPrior {
  cell: DemographicCell;
  partyProbabilities: Record<string, number>;
  confidence: number;
}

export interface PriorContext {
  comuneId: string;
  targetDate: Date;
  historical: Record<string, number>; // % 0..100
  pollTrend: Record<string, number>; // shift in pp vs historical national mix
  pollCount: number;
}

/** Moltiplicatori demografici (euristici, ancorati a letteratura/exit poll IT). */
const AGE_ADJ: Record<string, Record<string, number>> = {
  "18-30": {
    "fratelli-ditalia": 0.88,
    "partito-democratico": 0.92,
    "movimento-5-stelle": 1.28,
    avss: 1.22,
    "azione-iv": 1.05,
    "forza-italia": 0.7,
    lega: 0.85,
  },
  "31-50": {
    "fratelli-ditalia": 1.0,
    "partito-democratico": 1.0,
    "movimento-5-stelle": 1.05,
    lega: 1.0,
  },
  "51-70": {
    "fratelli-ditalia": 1.06,
    "partito-democratico": 1.04,
    "forza-italia": 1.12,
    "movimento-5-stelle": 0.88,
    lega: 1.05,
  },
  "70+": {
    "fratelli-ditalia": 1.12,
    "partito-democratico": 1.15,
    "forza-italia": 1.28,
    "movimento-5-stelle": 0.68,
    lega: 1.08,
    avss: 0.75,
  },
};

const EDU_ADJ: Record<string, Record<string, number>> = {
  bassa: {
    "fratelli-ditalia": 1.08,
    lega: 1.1,
    "movimento-5-stelle": 1.06,
    "azione-iv": 0.75,
    "piu-europa": 0.7,
  },
  media: {
    "fratelli-ditalia": 1.02,
    "partito-democratico": 1.0,
  },
  alta: {
    "partito-democratico": 1.12,
    "azione-iv": 1.2,
    "piu-europa": 1.25,
    avss: 1.1,
    "fratelli-ditalia": 0.9,
    lega: 0.85,
  },
};

const INCOME_ADJ: Record<string, Record<string, number>> = {
  basso: {
    "movimento-5-stelle": 1.15,
    avss: 1.08,
    "forza-italia": 0.85,
  },
  medio: {},
  alto: {
    "azione-iv": 1.15,
    "forza-italia": 1.12,
    "piu-europa": 1.1,
    "movimento-5-stelle": 0.85,
  },
};

const ZONE_ADJ: Record<string, Record<string, number>> = {
  urbano: {
    "partito-democratico": 1.08,
    "azione-iv": 1.1,
    "piu-europa": 1.08,
    lega: 0.88,
  },
  suburbano: {
    "fratelli-ditalia": 1.04,
    lega: 1.05,
  },
  rurale: {
    lega: 1.18,
    "fratelli-ditalia": 1.08,
    "forza-italia": 1.05,
    "azione-iv": 0.8,
    "piu-europa": 0.75,
  },
};

const GENDER_ADJ: Record<string, Record<string, number>> = {
  F: {
    "partito-democratico": 1.04,
    avss: 1.06,
    "fratelli-ditalia": 0.97,
  },
  M: {
    "fratelli-ditalia": 1.03,
    lega: 1.04,
  },
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function cellKey(cell: DemographicCell): string {
  return `${cell.ageGroup}|${cell.gender}|${cell.education}|${cell.income}|${cell.zone}`;
}

export async function loadHistoricalShares(
  comuneId: string,
  preferredYear = 2022,
): Promise<Record<string, number>> {
  let shares = await getBaseline(comuneId, preferredYear);
  if (Object.keys(shares).length > 0) return shares;
  const years = await listAvailableYears(comuneId);
  for (const y of [...years].sort((a, b) => b - a)) {
    shares = await getBaseline(comuneId, y);
    if (Object.keys(shares).length > 0) return shares;
  }
  return {
    "fratelli-ditalia": 26,
    "partito-democratico": 19.1,
    "movimento-5-stelle": 15.4,
    lega: 8.8,
    "forza-italia": 8.1,
    "azione-iv": 7.8,
    avss: 3.6,
    "piu-europa": 2.8,
    italexit: 1.9,
  };
}

/**
 * Media ponderata sondaggi → share %; trend = poll − baseline nazionale soft.
 */
export function aggregatePolls(
  polls: NormalizedPoll[],
): Record<string, number> {
  if (polls.length === 0) return {};
  const acc: Record<string, number> = {};
  let wSum = 0;
  for (const p of polls) {
    const daysAgo = Math.max(
      0,
      (Date.now() - new Date(p.publishedAt).getTime()) / 86400000,
    );
    // Prefer caller-relative days when used via PriorContext
    const w =
      Math.max(0.2, 1 - daysAgo / 60) *
      Math.min(1.5, Math.sqrt(Math.max(1, p.sampleSize)) / 40);
    wSum += w;
    for (const [slug, pct] of Object.entries(p.shares)) {
      const key = normalizePartySlug(slug);
      acc[key] = (acc[key] ?? 0) + pct * w;
    }
  }
  if (wSum <= 0) return {};
  for (const k of Object.keys(acc)) acc[k] = acc[k]! / wSum;
  return acc;
}

export function aggregatePollsRelative(
  polls: NormalizedPoll[],
  targetDate: Date,
): Record<string, number> {
  if (polls.length === 0) return {};
  const target = targetDate.getTime();
  const acc: Record<string, number> = {};
  let wSum = 0;
  for (const p of polls) {
    const daysAgo = Math.abs(target - new Date(p.publishedAt).getTime()) / 86400000;
    const w =
      Math.max(0.15, 1 - daysAgo / 45) *
      Math.min(1.5, Math.sqrt(Math.max(1, p.sampleSize)) / 40);
    wSum += w;
    for (const [slug, pct] of Object.entries(p.shares)) {
      const key = normalizePartySlug(slug);
      acc[key] = (acc[key] ?? 0) + pct * w;
    }
  }
  if (wSum <= 0) return {};
  for (const k of Object.keys(acc)) acc[k] = acc[k]! / wSum;
  return acc;
}

/** Baseline nazionale soft 2022 per calcolare lo shift dei sondaggi. */
const NATIONAL_2022: Record<string, number> = {
  "fratelli-ditalia": 26.0,
  "partito-democratico": 19.1,
  "movimento-5-stelle": 15.4,
  lega: 8.8,
  "forza-italia": 8.1,
  "azione-iv": 7.8,
  avss: 3.6,
  "piu-europa": 2.8,
  italexit: 1.9,
};

export async function createPriorContext(
  comuneId: string,
  targetDate: Date,
): Promise<PriorContext> {
  const historical = await loadHistoricalShares(comuneId, 2022);
  let polls = await getPollsNear(targetDate.toISOString(), 45);
  if (polls.length === 0) {
    polls = await getPollsNear(targetDate.toISOString(), 365);
  }
  const pollShares = aggregatePollsRelative(polls, targetDate);
  const pollTrend: Record<string, number> = {};
  for (const p of PARTIES) {
    const poll = pollShares[p.slug];
    const nat = NATIONAL_2022[p.slug] ?? 0;
    if (poll != null) {
      // shift in punti percentuali rispetto al mix nazionale 2022
      pollTrend[p.slug] = poll - nat;
    } else {
      pollTrend[p.slug] = 0;
    }
  }
  return {
    comuneId,
    targetDate,
    historical,
    pollTrend,
    pollCount: polls.length,
  };
}

function multiplierFor(
  table: Record<string, Record<string, number>>,
  dim: string,
  party: string,
): number {
  return table[dim]?.[party] ?? 1;
}

/**
 * Applica prior sincrono dato un contesto già caricato (performante in batch).
 */
export function applyPriorFromContext(
  ctx: PriorContext,
  cell: DemographicCell,
): StatisticalPrior {
  const prior: Record<string, number> = {};
  let total = 0;

  for (const party of PARTIES) {
    const slug = party.slug;
    let adjusted = (ctx.historical[slug] ?? 0) / 100;

    adjusted *= multiplierFor(AGE_ADJ, cell.ageGroup, slug);
    adjusted *= multiplierFor(EDU_ADJ, cell.education, slug);
    adjusted *= multiplierFor(INCOME_ADJ, cell.income, slug);
    adjusted *= multiplierFor(ZONE_ADJ, cell.zone, slug);
    adjusted *= multiplierFor(GENDER_ADJ, cell.gender, slug);

    // Trend sondaggi: max ±4pp sul prior (ancoraggio MRP)
    const shift = ctx.pollTrend[slug] ?? 0;
    adjusted += (shift / 100) * 0.55;

    prior[slug] = Math.max(0.0005, adjusted);
    total += prior[slug];
  }

  if (total > 0) {
    for (const k of Object.keys(prior)) prior[k] = prior[k]! / total;
  }

  const histN = Object.keys(ctx.historical).length;
  const confidence = clamp01(
    0.45 + histN * 0.04 + Math.min(0.2, ctx.pollCount * 0.04),
  );

  return { cell, partyProbabilities: prior, confidence };
}

/**
 * API pubblica Prompt 4 — prior per singola cella.
 */
export async function computeStatisticalPrior(
  comuneId: string,
  cell: DemographicCell,
  targetDate: Date,
): Promise<StatisticalPrior> {
  const ctx = await createPriorContext(comuneId, targetDate);
  return applyPriorFromContext(ctx, cell);
}

/**
 * Cache in-memory per celle ripetute nello stesso run.
 */
export function createPriorCache(ctx: PriorContext) {
  const cache = new Map<string, StatisticalPrior>();
  return {
    get(cell: DemographicCell): StatisticalPrior {
      const key = cellKey(cell);
      let hit = cache.get(key);
      if (!hit) {
        hit = applyPriorFromContext(ctx, cell);
        cache.set(key, hit);
      }
      return hit;
    },
    size: () => cache.size,
  };
}
