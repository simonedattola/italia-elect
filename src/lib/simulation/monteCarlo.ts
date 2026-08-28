import type { DigitalAgent } from "../agents/types";
import { createRng } from "../microsim/electorGenerator";

export interface MonteCarloResult {
  mean: Record<string, number>;
  low: Record<string, number>;
  high: Record<string, number>;
  iterations: number;
}

/**
 * Monte Carlo su distribuzione di voti (10k iterazioni default).
 */
export function runMonteCarlo(
  partyVotes: Record<string, number>,
  iterations = 10_000,
  seed = 42,
  noiseScale = 0.04,
): MonteCarloResult {
  const rng = createRng(seed);
  const parties = Object.keys(partyVotes);
  const samples: Record<string, number[]> = {};
  for (const p of parties) samples[p] = [];

  for (let i = 0; i < iterations; i++) {
    const draw: Record<string, number> = {};
    let sum = 0;
    for (const p of parties) {
      const base = partyVotes[p] ?? 0;
      const noise = (rng() - 0.5) * 2 * noiseScale * base;
      draw[p] = Math.max(0.1, base + noise);
      sum += draw[p]!;
    }
    for (const p of parties) {
      samples[p]!.push((draw[p]! / sum) * 100);
    }
  }

  const mean: Record<string, number> = {};
  const low: Record<string, number> = {};
  const high: Record<string, number> = {};

  for (const p of parties) {
    const arr = samples[p]!.sort((a, b) => a - b);
    const n = arr.length;
    mean[p] = arr.reduce((a, b) => a + b, 0) / n;
    low[p] = arr[Math.floor(n * 0.025)] ?? mean[p]!;
    high[p] = arr[Math.floor(n * 0.975)] ?? mean[p]!;
  }

  return { mean, low, high, iterations };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Converte percentuali ministeriali (possono non sommare a 100) in probabilità normalizzate. */
function baselineToPrefs(baseline: Record<string, number>): Record<string, number> {
  const total = Object.values(baseline).reduce((a, b) => a + b, 0) || 100;
  const prefs: Record<string, number> = {};
  for (const [party, pct] of Object.entries(baseline)) {
    prefs[party] = pct / total;
  }
  return prefs;
}

export function agentVoteIntent(
  agent: DigitalAgent,
  baseline: Record<string, number>,
  candidateParty?: string,
  compatibilityScore?: number,
  anchorStrength = 0.75,
): string {
  const rng = createRng(hashSeed(agent.id));
  const prefs = baselineToPrefs(baseline);

  const hist = agent.votingHistory.politiche2022;
  if (hist && prefs[hist] != null) {
    prefs[hist] = prefs[hist]! * 1.15;
  }

  prefs["fratelli-ditalia"] =
    (prefs["fratelli-ditalia"] ?? 0) * (1 + agent.weights.politics * 0.05);
  prefs["partito-democratico"] =
    (prefs["partito-democratico"] ?? 0) * (1 + agent.weights.social * 0.04);
  prefs["lega"] = (prefs["lega"] ?? 0) * (1 + agent.weights.security * 0.06);

  if (candidateParty && compatibilityScore != null) {
    const cp = candidateParty;
    if (compatibilityScore > 0.7) prefs[cp] = (prefs[cp] ?? 0) * (1 + (compatibilityScore - 0.7) * 0.5);
    if (compatibilityScore < 0.3) prefs[cp] = (prefs[cp] ?? 0) * (1 - (0.3 - compatibilityScore) * 0.6);
  }

  // Ancoraggio alla baseline storica
  const baselinePrefs = baselineToPrefs(baseline);
  for (const party of new Set([...Object.keys(prefs), ...Object.keys(baselinePrefs)])) {
    const adj = prefs[party] ?? 0;
    const base = baselinePrefs[party] ?? 0;
    prefs[party] = base * anchorStrength + adj * (1 - anchorStrength);
  }

  const sum = Object.values(prefs).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(prefs)) prefs[k] = prefs[k]! / sum;

  const r = rng();
  let cum = 0;
  for (const [party, prob] of Object.entries(prefs)) {
    cum += prob;
    if (r <= cum) return party;
  }
  return Object.keys(prefs)[0] ?? "fratelli-ditalia";
}
