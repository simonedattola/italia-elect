import { getParty } from "../electoral/parties";
import type { DigitalAgent } from "../agents/types";
import { analyzeCandidate } from "./candidateAnalyzer";
import { matchHistoricalFigure } from "./historicalFigures";
import { descriptionElectoralModifier } from "@/lib/intelligence/candidateTextSignals";
import { clamp } from "@/lib/utils";

export interface CompatibilityResult {
  score: number;
  breakdown: {
    ideology: number;
    historical: number;
    reputation: number;
    statements: number;
    affinity: number;
  };
  categoricalRejection: boolean;
  source: "historical_db" | "computed";
}

export type CompatibilityAgent = Pick<
  DigitalAgent,
  "age" | "education" | "zone" | "votingHistory" | "weights"
>;

/**
 * Compatibilità multi-dimensionale agente ↔ candidato.
 */
export function computeAgentCandidateCompatibility(
  agent: CompatibilityAgent,
  candidate: {
    firstName: string;
    lastName: string;
    partySlug: string;
    description?: string;
    program?: string;
  },
): CompatibilityResult {
  const party = getParty(candidate.partySlug);
  const analysis = analyzeCandidate(candidate);
  const hist = matchHistoricalFigure(candidate.firstName, candidate.lastName);
  const descLen = (candidate.description ?? "").trim().length;

  if (hist && hist.partyCompatibility[party?.slug ?? candidate.partySlug]) {
    let score = hist.partyCompatibility[party?.slug ?? candidate.partySlug]!;
    if (descLen >= 15 && party) {
      const modifier = descriptionElectoralModifier(
        candidate.description ?? "",
        party,
        candidate.program,
      );
      score = clamp(score * modifier, 0, 1);
    }
    return {
      score,
      breakdown: {
        ideology: analysis.ideologyScore,
        historical: score,
        reputation: analysis.reputation,
        statements: analysis.statementsScore,
        affinity: analysis.affinityScore,
      },
      categoricalRejection: score < 0.08,
      source: "historical_db",
    };
  }

  const partyIdeo = party?.ideologyScore ?? 0;
  let ideologyAlign = 0.5;
  if (agent.age < 30 && partyIdeo < 0) ideologyAlign += 0.15;
  if (agent.age > 64 && partyIdeo > 0.2) ideologyAlign += 0.12;
  if (agent.education === "alta" && Math.abs(partyIdeo) < 0.35) ideologyAlign += 0.1;
  if (agent.zone === "rurale" && partyIdeo > 0.2) ideologyAlign += 0.08;

  const histVote =
    agent.votingHistory.politiche2022 === party?.slug ? 0.85 : 0.35;

  const ideology = (ideologyAlign * 0.4 + (partyIdeo + 1) / 2 * 0.6) * 0.4;
  const historical = (analysis.historicalScore * 0.5 + histVote * 0.5) * 0.25;
  const reputation = analysis.reputation * 0.2;
  const statements = analysis.statementsScore * 0.1;
  const affinity = analysis.affinityScore * 0.05;

  const score = Math.max(0, Math.min(1, ideology + historical + reputation + statements + affinity));

  return {
    score,
    breakdown: { ideology, historical, reputation, statements, affinity },
    categoricalRejection: score < 0.08,
    source: "computed",
  };
}

export function applyCompatibilityToVote(
  basePartyProb: number,
  compatibility: number,
): number {
  if (compatibility > 0.7) return basePartyProb * (1 + (compatibility - 0.7) * 0.8);
  if (compatibility < 0.3) return basePartyProb * (1 - (0.3 - compatibility) * 1.2);
  return basePartyProb;
}
