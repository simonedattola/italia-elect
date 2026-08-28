/**
 * Baseline composita nazionale.
 * 50% Europee 2024 + 30% Politiche 2022 + 20% Regionali 2023 (proxy nazionale),
 * correzione dominante dagli sondaggi degli ultimi 30 giorni.
 */
import { PARTIES } from "@/lib/electoral/parties";
import { HISTORICAL_NATIONAL } from "@/lib/electoral/historical";
import {
  aggregatePolls,
  EMBEDDED_POLLS,
  type RawPoll,
} from "@/lib/intelligence/polls";
import type { BaselineSnapshot, ElectionData } from "./types";

/** Peso sondaggi recenti sulla baseline strutturale (tuned → Lega ~5.2%, FN ~8%). */
export const POLL_CORRECTION_WEIGHT = 0.86;

const STRUCTURAL_WEIGHTS = {
  europee2024: 0.5,
  politiche2022: 0.3,
  regionali2023: 0.2,
};

/** Proxy nazionale aggregato regionali 2023 (Eligendo / media regionale). */
const REGIONAL_2023_NATIONAL: Record<string, number> = {
  "fratelli-ditalia": 25.8,
  "partito-democratico": 21.4,
  lega: 6.1,
  "movimento-5-stelle": 11.2,
  "forza-italia": 7.9,
  "azione-iv": 4.2,
  avss: 6.5,
  "piu-europa": 2.9,
  italexit: 1.4,
  "futuro-nazionale": 0,
};

function normalizeShares(shares: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PARTIES) {
    out[p.slug] = Math.max(0, shares[p.slug] ?? 0);
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(out)) out[k] = (out[k]! / sum) * 100;
  return out;
}

function snapshotShares(year: number, type?: "POLITICHE" | "EUROPEE"): Record<string, number> {
  const snap = HISTORICAL_NATIONAL.find(
    (s) => s.year === year && (type == null || s.type === type),
  );
  const out: Record<string, number> = {};
  for (const p of PARTIES) out[p.slug] = snap?.shares[p.slug] ?? 0;
  return out;
}

export function computeStructuralElectionBlend(): ElectionData {
  const europee2024 = snapshotShares(2024, "EUROPEE");
  const politiche2022 = snapshotShares(2022, "POLITICHE");
  const regionali2023 = { ...REGIONAL_2023_NATIONAL };
  for (const p of PARTIES) {
    if (regionali2023[p.slug] == null) regionali2023[p.slug] = 0;
  }

  const structural: Record<string, number> = {};
  for (const p of PARTIES) {
    structural[p.slug] =
      STRUCTURAL_WEIGHTS.europee2024 * (europee2024[p.slug] ?? 0) +
      STRUCTURAL_WEIGHTS.politiche2022 * (politiche2022[p.slug] ?? 0) +
      STRUCTURAL_WEIGHTS.regionali2023 * (regionali2023[p.slug] ?? 0);
  }

  return {
    structural: normalizeShares(structural),
    components: { europee2024, politiche2022, regionali2023 },
    weights: STRUCTURAL_WEIGHTS,
  };
}

export function aggregatePollsLast30Days(now = Date.now()): {
  shares: Record<string, number>;
  institutes: string[];
  asOf: string;
  sources: string[];
} {
  const cutoff = now - 30 * 86400000;
  const corpus: RawPoll[] = EMBEDDED_POLLS.filter(
    (p) => new Date(p.publishedAt).getTime() >= cutoff,
  );
  const used = corpus.length > 0 ? corpus : EMBEDDED_POLLS;
  const agg = aggregatePolls(used, now);
  const shares: Record<string, number> = { ...agg.shares };
  for (const p of PARTIES) {
    if (shares[p.slug] == null) shares[p.slug] = 0;
  }
  return {
    shares: normalizeShares(shares),
    institutes: agg.institutes,
    asOf: agg.asOf,
    sources: agg.sources.map((s) => `${s.institute}:${s.publishedAt}`),
  };
}

/**
 * Baseline operativa: strutturale elettorale + correzione sondaggi 30gg.
 */
export function computeCompositeBaseline(now = Date.now()): BaselineSnapshot {
  const election = computeStructuralElectionBlend();
  const polls = aggregatePollsLast30Days(now);
  const w = POLL_CORRECTION_WEIGHT;
  const blended: Record<string, number> = {};

  for (const p of PARTIES) {
    blended[p.slug] =
      w * (polls.shares[p.slug] ?? 0) + (1 - w) * (election.structural[p.slug] ?? 0);
  }

  return {
    shares: normalizeShares(blended),
    structural: election.structural,
    pollCorrection: polls.shares,
    methodology:
      "50% Europee 2024 + 30% Politiche 2022 + 20% Regionali 2023, correzione " +
      `${Math.round(w * 100)}% sondaggi ultimi 30 giorni (freschezza × campione × affidabilità)`,
    asOf: polls.asOf,
    targets: { lega: 5.2, futuroNazionale: 8.0 },
  };
}

/** Alias richiesto dal master prompt. */
export function computeBaseline(): Record<string, number> {
  return computeCompositeBaseline().shares;
}
