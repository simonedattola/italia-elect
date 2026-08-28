/**
 * Trend Forecaster — proietta il voto nel tempo usando prior MRP + shock ABM a ogni step.
 */

import { WeightsEngine } from "../context/weightsEngine";
import { allocateRosatellum } from "../electoral/rosatellum";
import { createRng, generateElectors } from "../microsim/electorGenerator";
import { applyInfluence } from "../microsim/influenceEngine";
import { normalizePartySlug } from "../microsim/compatibility";
import type {
  MicrosimCandidate,
  ScenarioOverride,
} from "../microsim/types";

export interface ForecastStep {
  date: Date;
  label: string;
  nationalVotes: Record<string, number>;
  chamberSeats: Record<string, number>;
  topParty: string;
}

export interface ForecastResult {
  steps: ForecastStep[];
  modelVersion: string;
  elapsedMs: number;
}

export interface ForecastInput {
  comuneId: string;
  candidate: MicrosimCandidate;
  scenario?: ScenarioOverride;
  /** Date target da proiettare (ordinate) */
  horizonDates: Date[];
  sampleSize?: number;
  seed?: number;
}

/**
 * Per ogni data: ricalcola prior (sondaggi cambiano) → genera affinità → applica shock → aggrega.
 * Usa un solo comune come proxy nazionale (Roma) o il comune passato.
 */
export async function forecastTrend(
  input: ForecastInput,
): Promise<ForecastResult> {
  const start = performance.now();
  const seed = input.seed ?? input.scenario?.seed ?? 42;
  const sampleSize = input.sampleSize ?? 800;
  const weightsEngine = new WeightsEngine();
  const candidate = {
    ...input.candidate,
    partySlug: normalizePartySlug(input.candidate.partySlug),
  };
  const scenario: ScenarioOverride = input.scenario ?? {};

  const steps: ForecastStep[] = [];

  for (let i = 0; i < input.horizonDates.length; i++) {
    const date = input.horizonDates[i]!;
    const rng = createRng(seed + i * 997);
    const weights = await weightsEngine.computeWeights(
      input.comuneId,
      date,
      candidate.partySlug,
      String(scenario.scenarioType ?? "stability"),
    );

    // Prior già applicato in generateElectors(mode=hybrid, targetDate)
    const electors = await generateElectors(input.comuneId, sampleSize, {
      rng,
      targetDate: date,
      mode: "hybrid",
    });

    const counts: Record<string, number> = {};
    for (const e of electors) {
      const { partyVote } = applyInfluence(
        e,
        weights,
        candidate,
        scenario,
        rng,
      );
      counts[partyVote] = (counts[partyVote] ?? 0) + 1;
    }
    const n = electors.length || 1;
    const nationalVotes: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) {
      nationalVotes[k] = (v / n) * 100;
    }

    const rosa = allocateRosatellum({
      nationalShares: nationalVotes,
      seed: seed + i,
    });

    const topParty =
      Object.entries(nationalVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    steps.push({
      date,
      label: date.toISOString().slice(0, 10),
      nationalVotes,
      chamberSeats: rosa.chamber.byParty,
      topParty,
    });
  }

  return {
    steps,
    modelVersion: "4.0.0-forecaster",
    elapsedMs: performance.now() - start,
  };
}
