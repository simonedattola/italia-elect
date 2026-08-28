import type { DigitalAgent } from "../agents/types";
import { computeDynamicBaseline } from "../electoral/dynamicBaseline";
import { PARTIES } from "../electoral/parties";
import { computeAgentCandidateCompatibility } from "../compatibility/compatibilityEngine";
import { agentVoteIntent, runMonteCarlo } from "./monteCarlo";

export interface NationalVotingResult {
  votingIntent: Record<string, number>;
  rawVotingIntent: Record<string, number>;
  confidenceLow: Record<string, number>;
  confidenceHigh: Record<string, number>;
  turnoutPct: number;
  virtualPopulation: number;
  sampleSize: number;
  computedAt: string;
}

export interface VotingEngineOptions {
  candidate?: {
    firstName: string;
    lastName: string;
    partySlug: string;
    description?: string;
    program?: string;
  };
  monteCarloIterations?: number;
  seed?: number;
  baselineOverride?: Record<string, number>;
  monteCarloNoise?: number;
  anchorStrength?: number;
}

/**
 * Simula intenzioni di voto nazionali da campione agenti scalato a 60M.
 */
function baselineShareSum(baseline: Record<string, number>): number {
  return Object.values(baseline).reduce((a, b) => a + b, 0) || 100;
}

/** Converte % sul campione modellato in % nazionale (ministeriale). */
function toNationalShares(
  modeled: Record<string, number>,
  baselineSum: number,
): Record<string, number> {
  const scale = baselineSum / 100;
  const out: Record<string, number> = {};
  for (const [party, pct] of Object.entries(modeled)) {
    out[party] = pct * scale;
  }
  return out;
}

export function runNationalVoting(
  agents: DigitalAgent[],
  opts: VotingEngineOptions = {},
): NationalVotingResult {
  const baseline = opts.baselineOverride ?? computeDynamicBaseline();
  const baselineSum = baselineShareSum(baseline);
  const voteCounts: Record<string, number> = {};
  let totalWeight = 0;

  for (const p of PARTIES) voteCounts[p.slug] = 0;

  for (const agent of agents) {
    let compat: number | undefined;
    if (opts.candidate) {
      compat = computeAgentCandidateCompatibility(agent, opts.candidate).score;
    }
    const party = agentVoteIntent(
      agent,
      baseline,
      opts.candidate?.partySlug,
      compat,
      opts.anchorStrength ?? 0.75,
    );
    const w = agent.virtualWeight;
    voteCounts[party] = (voteCounts[party] ?? 0) + w;
    totalWeight += w;
  }

  const modeledIntent: Record<string, number> = {};
  for (const [party, count] of Object.entries(voteCounts)) {
    modeledIntent[party] = (count / totalWeight) * 100;
  }

  const mc = runMonteCarlo(
    modeledIntent,
    opts.monteCarloIterations ?? 10_000,
    opts.seed ?? 42,
    opts.monteCarloNoise ?? 0.04,
  );

  return {
    votingIntent: toNationalShares(mc.mean, baselineSum),
    rawVotingIntent: toNationalShares(modeledIntent, baselineSum),
    confidenceLow: toNationalShares(mc.low, baselineSum),
    confidenceHigh: toNationalShares(mc.high, baselineSum),
    turnoutPct: 62.5,
    virtualPopulation: agents[0]?.virtualWeight
      ? agents.length * agents[0].virtualWeight
      : 60_000_000,
    sampleSize: agents.length,
    computedAt: new Date().toISOString(),
  };
}
