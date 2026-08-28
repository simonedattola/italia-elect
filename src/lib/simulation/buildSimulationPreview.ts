/**
 * Anteprima candidato — usa lo stesso motore di runSimulation (seed fisso per stabilità UI).
 */
import type { CandidateInput } from "@/types/simulation";
import type { EngineInput } from "./engine";
import { runSimulation } from "./engine";

export const PREVIEW_MONTE_CARLO_SEED = 424242;
export const PREVIEW_MONTE_CARLO_RUNS = 3000;

export interface SimulationPreviewResult {
  partyCompatibility: number;
  personalImpactScore: number;
  expectedPts: number;
  notoriety: number;
  isPublicFigure: boolean;
  contextBaselinePct: number;
  projectedLeaderPct: number;
  projectedLeaderLow: number;
  projectedLeaderHigh: number;
  swing: number;
  projectedShares: Record<string, number>;
  evidenceNote: string | null;
  defaultPartySlug: string | null;
  categoricalRejection: boolean;
  matchesSimulationEngine: true;
}

export function buildSimulationPreview(
  input: Omit<EngineInput, "seed" | "runs">,
): SimulationPreviewResult {
  const output = runSimulation({
    ...input,
    seed: PREVIEW_MONTE_CARLO_SEED,
    runs: PREVIEW_MONTE_CARLO_RUNS,
  });

  const leaderSlug = input.candidate.partySlug;
  const leaderResult = output.nationalResults.find((r) => r.partySlug === leaderSlug);
  const profile = output.profile as {
    personalImpactScore?: number;
    compatibilityBreakdown?: { categoricalRejection?: boolean };
  };
  const candidateFactor = output.influenceFactors.find((f) => f.id === "candidate");

  const projectedShares: Record<string, number> = {};
  for (const r of output.nationalResults) {
    projectedShares[r.partySlug] = r.percentage;
  }

  return {
    partyCompatibility: output.profile.partyCompatibility,
    personalImpactScore:
      profile.personalImpactScore ?? output.profile.notoriety,
    expectedPts: candidateFactor?.effectPts ?? leaderResult?.swing ?? 0,
    notoriety: output.profile.notoriety,
    isPublicFigure: output.profile.isPublicFigure,
    contextBaselinePct:
      output.context.contextAdjustedBaseline[leaderSlug] ?? 0,
    projectedLeaderPct: leaderResult?.percentage ?? 0,
    projectedLeaderLow: leaderResult?.percentageLow ?? 0,
    projectedLeaderHigh: leaderResult?.percentageHigh ?? 0,
    swing: leaderResult?.swing ?? 0,
    projectedShares,
    evidenceNote: output.profile.evidenceNotes[0] ?? null,
    defaultPartySlug: input.publicFigure?.defaultPartySlug ?? null,
    categoricalRejection: Boolean(profile.compatibilityBreakdown?.categoricalRejection),
    matchesSimulationEngine: true,
  };
}

export function candidateInputFromForm(opts: {
  firstName: string;
  lastName: string;
  partySlug: string;
  description: string;
  program?: string;
}): CandidateInput {
  return {
    firstName: opts.firstName.trim(),
    lastName: opts.lastName.trim(),
    partySlug: opts.partySlug,
    description: opts.description.trim(),
    program: opts.program?.trim() || undefined,
  };
}
