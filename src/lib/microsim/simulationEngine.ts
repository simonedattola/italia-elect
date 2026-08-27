/**
 * Monte Carlo micro-simulazione — Fase 4 hybrid MRP+ABM.
 */

import type { PartyResult } from "../../types/simulation";
import { allocateRosatellum } from "../electoral/rosatellum";
import { allocateChamberSeats } from "../simulation/seats";
import { getParty } from "../electoral/parties";
import {
  buildDemographics,
  createRng,
  generateElectors,
} from "./electorGenerator";
import { applyInfluence } from "./influenceEngine";
import { normalizePartySlug } from "./compatibility";
import type { ComuneInput, ComuneResult, Rng } from "./types";

export const MICROSIM_VERSION = "4.0.0-hybrid";

/**
 * Seggi locali semplificati (pool proporzionale) — legacy comune-level.
 */
export function computeSeats(
  partyPercentages: Record<string, number>,
  localSeatPool: number,
): Record<string, number> {
  const results: PartyResult[] = Object.entries(partyPercentages).map(
    ([slug, percentage]) => {
      const p = getParty(slug);
      return {
        partySlug: slug,
        partyName: p?.name ?? slug,
        shortName: p?.shortName ?? slug,
        color: p?.color ?? "#666",
        percentage,
        percentageLow: percentage,
        percentageHigh: percentage,
        swing: 0,
        seatsChamber: 0,
        seatsSenate: 0,
      };
    },
  );

  const allocation = allocateChamberSeats(results);
  const nationalTotal = allocation.total || 400;
  const scale = localSeatPool / nationalTotal;
  const scaled: Record<string, number> = {};
  let assigned = 0;
  const entries = Object.entries(allocation.byParty).map(([slug, seats]) => ({
    slug,
    exact: seats * scale,
  }));
  for (const e of entries) {
    scaled[e.slug] = Math.floor(e.exact);
    assigned += scaled[e.slug]!;
  }
  const remainders = entries
    .map((e) => ({ slug: e.slug, rem: e.exact - Math.floor(e.exact) }))
    .sort((a, b) => b.rem - a.rem);
  let i = 0;
  while (assigned < localSeatPool && remainders.length > 0) {
    const slug = remainders[i % remainders.length]!.slug;
    scaled[slug] = (scaled[slug] ?? 0) + 1;
    assigned++;
    i++;
  }
  return scaled;
}

export async function simulateComune(
  input: ComuneInput,
): Promise<ComuneResult> {
  const startTime = performance.now();
  const seed = input.scenario.seed ?? Math.floor(Math.random() * 1_000_000);
  const rng = createRng(seed);
  const sampleSize = input.sampleSize ?? 1000;
  const mode = input.mode ?? "hybrid";
  const targetDate = input.targetDate ?? new Date("2022-09-25");

  const candidate = {
    ...input.candidate,
    partySlug: normalizePartySlug(input.candidate.partySlug),
  };

  const demo = await buildDemographics(input.comuneId);
  const electors = await generateElectors(input.comuneId, sampleSize, {
    rng,
    mode,
    targetDate,
  });

  const voteCounts: Record<string, number> = {};
  const votes: string[] = [];

  for (const elector of electors) {
    const result = applyInfluence(
      elector,
      input.weights,
      candidate,
      input.scenario,
      rng,
    );
    votes.push(result.partyVote);
    voteCounts[result.partyVote] = (voteCounts[result.partyVote] ?? 0) + 1;
  }

  const totalVotes = votes.length || 1;
  const partyPercentages: Record<string, number> = {};
  for (const [party, count] of Object.entries(voteCounts)) {
    partyPercentages[party] = (count / totalVotes) * 100;
  }

  const localSeatPool = Math.max(
    1,
    Math.round((demo.electorate / 50_000_000) * 400),
  );
  // Comune: pool locale; a livello nazionale usare allocateRosatellum
  const seats = computeSeats(partyPercentages, localSeatPool);

  const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0]?.[0] ?? "";
  const winnerVotes = sorted[0]?.[1] ?? 0;
  const secondVotes = sorted[1]?.[1] ?? 0;
  const winnerMargin = ((winnerVotes - secondVotes) / totalVotes) * 100;

  const confidenceInterval = computeConfidenceInterval(
    votes,
    200,
    createRng(seed + 7),
  );

  const factorsImpact = input.weights
    .map((w) => ({
      factorId: w.factorId,
      impact: Number((w.weightedScore * 0.5).toFixed(4)),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 12);

  return {
    comuneId: input.comuneId,
    comuneName: demo.comuneName,
    regione: demo.regione,
    province: demo.provinceCode,
    totalVoters: demo.electorate,
    simulatedVoters: totalVotes,
    partyVotes: partyPercentages,
    seats,
    winner,
    winnerMargin,
    confidenceInterval,
    factorsImpact,
    metadata: {
      simulationTime: performance.now() - startTime,
      seed,
      modelVersion: `${MICROSIM_VERSION}:${mode}`,
    },
  };
}

/**
 * Simula comune e applica Rosatellum nazionale sulle share risultanti (proxy).
 */
export async function simulateComuneWithRosatellum(input: ComuneInput) {
  const comune = await simulateComune(input);
  const rosa = allocateRosatellum({
    nationalShares: comune.partyVotes,
    seed: comune.metadata.seed,
  });
  return { comune, rosatellum: rosa };
}

export function computeConfidenceInterval(
  votes: string[],
  iterations: number,
  rng: Rng,
): Record<string, [number, number]> {
  const n = votes.length;
  if (n === 0) return {};

  const parties = [...new Set(votes)];
  const samples: Record<string, number[]> = {};
  for (const p of parties) samples[p] = [];

  for (let i = 0; i < iterations; i++) {
    const counts: Record<string, number> = {};
    for (let j = 0; j < n; j++) {
      const v = votes[Math.floor(rng() * n)]!;
      counts[v] = (counts[v] ?? 0) + 1;
    }
    for (const p of parties) {
      samples[p]!.push(((counts[p] ?? 0) / n) * 100);
    }
  }

  const out: Record<string, [number, number]> = {};
  for (const p of parties) {
    const arr = samples[p]!.sort((a, b) => a - b);
    const lo = arr[Math.floor(0.025 * arr.length)] ?? 0;
    const hi =
      arr[Math.min(arr.length - 1, Math.floor(0.975 * arr.length))] ?? 0;
    out[p] = [Number(lo.toFixed(2)), Number(hi.toFixed(2))];
  }
  return out;
}
