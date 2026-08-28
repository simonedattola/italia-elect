/**
 * Riconoscimento candidato — integra Wikipedia/Wikidata via motore esistente.
 */
import { resolveCandidateForSimulation } from "@/lib/simulation/resolveCandidate";
import { buildIntelligenceProfile, candidateElectoralDelta } from "@/lib/intelligence/candidateProfile";
import { getPartyOrThrow } from "@/lib/electoral/parties";
import { programAnalyzer } from "./ProgramAnalyzer";
import type { CandidateGameProfile, GameCandidateInput, GamePartyChoice } from "./types";
import { clamp } from "@/lib/utils";
import type { CoalitionFamily, IdeologySpectrum, PartyDefinition } from "@/types/simulation";

export function customPartyDefinition(party: GamePartyChoice): PartyDefinition {
  const score = party.ideologyScore ?? 0;
  let ideology: IdeologySpectrum = "CENTER";
  if (score <= -0.55) ideology = "FAR_LEFT";
  else if (score <= -0.2) ideology = "LEFT";
  else if (score <= -0.05) ideology = "CENTER_LEFT";
  else if (score >= 0.55) ideology = "FAR_RIGHT";
  else if (score >= 0.2) ideology = "RIGHT";
  else if (score >= 0.05) ideology = "CENTER_RIGHT";

  let coalitionFamily: CoalitionFamily = "ALTRO";
  if (score <= -0.15) coalitionFamily = "SINISTRA";
  else if (score >= 0.15) coalitionFamily = "DESTRA";
  else coalitionFamily = "CENTRO";

  return {
    slug: party.slug,
    name: party.name,
    shortName: party.name.slice(0, 6),
    color: party.color,
    ideology,
    ideologyScore: score,
    coalitionFamily,
    isCustom: true,
  };
}

function ideologyLabel(score: number): string {
  if (score >= 0.55) return "Destra";
  if (score >= 0.2) return "Centro-destra";
  if (score <= -0.55) return "Sinistra";
  if (score <= -0.2) return "Centro-sinistra";
  return "Centro";
}

export class CandidateRecognizer {
  async recognize(
    candidate: GameCandidateInput,
    party: GamePartyChoice,
    program?: string,
  ): Promise<CandidateGameProfile> {
    const description =
      candidate.description?.trim() ||
      `${candidate.firstName} ${candidate.lastName}, candidato per ${party.name}.`;
    const resolved = await resolveCandidateForSimulation({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      partySlug: party.slug,
      description,
      program,
    });

    const profile = buildIntelligenceProfile(
      {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        partySlug: party.slug,
        description,
        program,
      },
      resolved.recognitionForEngine,
      resolved.publicFigureForEngine,
    );

    const naturalLeader =
      resolved.publicFigureForEngine?.defaultPartySlug === party.slug;
    const delta = candidateElectoralDelta(
      profile,
      undefined,
      profile.personalImpactScore,
      undefined,
      { naturalPartyLeader: naturalLeader },
    );

    const prog =
      program && program.length > 20
        ? programAnalyzer.analyze(
            program,
            party.isCustom ? customPartyDefinition(party) : getPartyOrThrow(party.slug),
          )
        : null;

    const ideology =
      prog?.ideology ??
      (profile.partyCompatibility / 100) * (party.ideologyScore ?? 0) * 0.5 +
        (party.ideologyScore ?? 0) * 0.5;

    return {
      name: `${candidate.firstName} ${candidate.lastName}`,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      partySlug: party.slug,
      popularity: clamp(profile.notoriety, 5, 98),
      compatibility: profile.partyCompatibility,
      ideology: clamp(ideology, -1, 1),
      leadership: profile.leadership,
      mobilization: profile.mobilization,
      credibility: prog?.credibility ?? profile.credibility,
      isPublicFigure: profile.isPublicFigure,
      positionLabel: ideologyLabel(ideology),
      programSummary: prog?.summary ?? "Nessun programma dettagliato.",
      vicePresidentEffect: 0,
      expectedSwingPts: delta.expectedPts,
    };
  }
}

export const candidateRecognizer = new CandidateRecognizer();
