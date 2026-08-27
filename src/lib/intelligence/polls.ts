/**
 * Poll Aggregator — media ponderata di sondaggi pubblici recenti.
 * Non usa mai un singolo sondaggio: pesa istituto, sample, freschezza, affidabilità.
 */

import type { PollAggregate } from "@/types/intelligence";
import { PARTIES } from "@/lib/electoral/parties";
import { clamp } from "@/lib/utils";

export interface RawPoll {
  institute: string;
  publishedAt: string; // ISO
  sampleSize?: number;
  methodology?: string;
  reliability?: number;
  shares: Record<string, number>;
  leaderTrust?: Record<string, number>;
  sourceUrl?: string;
}

/** Sondaggi di riferimento incorporati (ordine di grandezza post-2024/2025, illustrativi) */
export const EMBEDDED_POLLS: RawPoll[] = [
  {
    institute: "SWG",
    publishedAt: "2026-07-20",
    sampleSize: 1500,
    methodology: "CATI/CAWI",
    reliability: 0.82,
    shares: {
      "fratelli-ditalia": 28.2,
      "partito-democratico": 22.5,
      "movimento-5-stelle": 11.8,
      "forza-italia": 9.2,
      lega: 8.5,
      avss: 6.5,
      "azione-iv": 3.1,
      "piu-europa": 2.9,
      italexit: 1.2,
    },
    leaderTrust: { "Giorgia Meloni": 42, "Elly Schlein": 28, "Giuseppe Conte": 31 },
    sourceUrl: "https://www.swg.it/",
  },
  {
    institute: "YouTrend / AGI",
    publishedAt: "2026-07-12",
    sampleSize: 1000,
    methodology: "CAWI",
    reliability: 0.78,
    shares: {
      "fratelli-ditalia": 27.5,
      "partito-democratico": 23.0,
      "movimento-5-stelle": 12.2,
      "forza-italia": 8.8,
      lega: 8.2,
      avss: 6.8,
      "azione-iv": 3.4,
      "piu-europa": 3.0,
      italexit: 1.4,
    },
    sourceUrl: "https://www.youtrend.it/",
  },
  {
    institute: "Ipsos",
    publishedAt: "2026-06-28",
    sampleSize: 1200,
    methodology: "misto",
    reliability: 0.85,
    shares: {
      "fratelli-ditalia": 28.8,
      "partito-democratico": 21.8,
      "movimento-5-stelle": 11.0,
      "forza-italia": 9.5,
      lega: 8.8,
      avss: 6.2,
      "azione-iv": 3.0,
      "piu-europa": 2.7,
      italexit: 1.1,
    },
    leaderTrust: { "Giorgia Meloni": 44, "Elly Schlein": 27 },
    sourceUrl: "https://www.ipsos.com/it-it",
  },
  {
    institute: "EMG",
    publishedAt: "2026-06-15",
    sampleSize: 1000,
    methodology: "CATI",
    reliability: 0.75,
    shares: {
      "fratelli-ditalia": 29.0,
      "partito-democratico": 21.2,
      "movimento-5-stelle": 12.5,
      "forza-italia": 9.0,
      lega: 9.1,
      avss: 5.9,
      "azione-iv": 2.8,
      "piu-europa": 2.5,
      italexit: 1.5,
    },
    sourceUrl: "https://www.emg.it/",
  },
  {
    institute: "Termometro Politico",
    publishedAt: "2026-07-25",
    sampleSize: 4800,
    methodology: "online",
    reliability: 0.62,
    shares: {
      "fratelli-ditalia": 27.0,
      "partito-democratico": 23.5,
      "movimento-5-stelle": 12.0,
      "forza-italia": 8.5,
      lega: 8.0,
      avss: 7.0,
      "azione-iv": 3.5,
      "piu-europa": 3.2,
      italexit: 1.3,
    },
    sourceUrl: "https://www.termometropolitico.it/",
  },
];

function pollWeight(p: RawPoll, now = Date.now()): number {
  const ageDays = Math.max(
    0,
    (now - new Date(p.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const freshness = Math.exp(-ageDays / 45); // half-life ~31 giorni
  const sample = Math.sqrt(Math.min(p.sampleSize ?? 800, 5000) / 1000);
  const rel = p.reliability ?? 0.7;
  return Math.max(0.05, freshness * sample * rel);
}

export function aggregatePolls(
  polls: RawPoll[] = EMBEDDED_POLLS,
  now = Date.now()
): PollAggregate {
  const active = polls.filter((p) => Object.keys(p.shares).length > 0);
  if (active.length === 0) {
    return {
      asOf: new Date(now).toISOString(),
      shares: {},
      sampleWeightedReliability: 0,
      pollCount: 0,
      institutes: [],
      weeklyDelta: {},
      leaderTrust: {},
      sources: [],
    };
  }

  const weights = active.map((p) => pollWeight(p, now));
  const wSum = weights.reduce((a, b) => a + b, 0);

  const shares: Record<string, number> = {};
  for (const party of PARTIES) {
    let acc = 0;
    active.forEach((p, i) => {
      acc += (p.shares[party.slug] ?? 0) * weights[i];
    });
    shares[party.slug] = acc / wSum;
  }

  // Normalizza a ~100 (lascia spazio ad "altri")
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(shares)) {
    shares[k] = (shares[k] / sum) * Math.min(sum, 100);
  }

  // Delta vs sondaggi più vecchi (>21 giorni)
  const recent = active.filter(
    (p) => now - new Date(p.publishedAt).getTime() < 21 * 86400000
  );
  const older = active.filter(
    (p) => now - new Date(p.publishedAt).getTime() >= 21 * 86400000
  );
  const weeklyDelta: Record<string, number> = {};
  if (recent.length && older.length) {
    const rAgg = aggregatePolls(recent, now).shares;
    const oAgg = aggregatePolls(older, now).shares;
    for (const party of PARTIES) {
      weeklyDelta[party.slug] = (rAgg[party.slug] ?? 0) - (oAgg[party.slug] ?? 0);
    }
  }

  const leaderTrust: Record<string, number> = {};
  let ltW = 0;
  for (let i = 0; i < active.length; i++) {
    const lt = active[i].leaderTrust;
    if (!lt) continue;
    ltW += weights[i];
    for (const [name, score] of Object.entries(lt)) {
      leaderTrust[name] = (leaderTrust[name] ?? 0) + score * weights[i];
    }
  }
  if (ltW > 0) {
    for (const k of Object.keys(leaderTrust)) leaderTrust[k] /= ltW;
  }

  const reliability =
    active.reduce((a, p, i) => a + (p.reliability ?? 0.7) * weights[i], 0) / wSum;

  return {
    asOf: new Date(now).toISOString(),
    shares,
    sampleWeightedReliability: clamp(reliability, 0, 1),
    pollCount: active.length,
    institutes: [...new Set(active.map((p) => p.institute))],
    weeklyDelta,
    leaderTrust,
    sources: active.map((p) => ({
      institute: p.institute,
      publishedAt: p.publishedAt,
      reliability: p.reliability ?? 0.7,
    })),
  };
}

/**
 * Corregge la baseline storica con i sondaggi (Bayesian blend).
 * Più i sondaggi sono affidabili e freschi, più pesano.
 */
export function blendBaselineWithPolls(
  historical: Record<string, number>,
  polls: PollAggregate,
  pollWeightCap = 0.55
): Record<string, number> {
  const w = clamp(polls.sampleWeightedReliability * pollWeightCap * Math.min(1, polls.pollCount / 3), 0.15, pollWeightCap);
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(historical), ...Object.keys(polls.shares)]);
  for (const k of keys) {
    const h = historical[k] ?? 0;
    const p = polls.shares[k] ?? h;
    out[k] = h * (1 - w) + p * w;
  }
  // renormalize
  const sum = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(out)) out[k] = (out[k] / sum) * 100;
  return out;
}
