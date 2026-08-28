/**
 * Riconoscimento candidato — Wikipedia/Wikidata + analisi descrizione/programma.
 */
import { resolveCandidateForSimulation } from "@/lib/simulation/resolveCandidate";
import { buildIntelligenceProfile, candidateElectoralDelta } from "@/lib/intelligence/candidateProfile";
import { analyzeCampaignText } from "./CampaignTextAnalyzer";
import { proxyPartySlugForRecognition, resolveGameParty } from "./partyUtils";
import { parseCandidateName } from "./parseCandidateName";
import { swingFromVpProfile } from "./vpEffectFormula";
import type { CandidateGameProfile, GameCandidateInput, GamePartyChoice } from "./types";
import { clamp } from "@/lib/utils";

function ideologyLabel(score: number): string {
  if (score >= 0.55) return "Destra";
  if (score >= 0.2) return "Centro-destra";
  if (score <= -0.55) return "Sinistra";
  if (score <= -0.2) return "Centro-sinistra";
  return "Centro";
}

function recognitionNote(
  isPublic: boolean,
  figureName?: string,
  method?: string,
): string {
  if (!isPublic) return "Candidato non riconosciuto — profilo da descrizione e programma.";
  const parts = ["Figura pubblica riconosciuta"];
  if (figureName) parts.push(figureName);
  if (method && method !== "none") parts.push(`fonte: ${method.replace(/_/g, " ")}`);
  return parts.join(" · ");
}

export class CandidateRecognizer {
  async recognize(
    candidate: GameCandidateInput,
    party: GamePartyChoice,
    program?: string,
    vicePresident?: GameCandidateInput,
  ): Promise<CandidateGameProfile> {
    const parsed = parseCandidateName(
      `${candidate.firstName} ${candidate.lastName}`.trim(),
    );
    const normalizedCandidate: GameCandidateInput = {
      ...candidate,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
    };

    const partyDef = resolveGameParty(party);
    const prog = program?.trim() ?? "";
    const userDescription = normalizedCandidate.description?.trim() ?? "";
    const description =
      userDescription ||
      (prog.length > 30
        ? `Candidato per ${party.name}. Programma: ${prog.slice(0, 120)}…`
        : `${normalizedCandidate.firstName} ${normalizedCandidate.lastName}, candidato per ${party.name}.`);

    const recognitionSlug = party.isCustom
      ? proxyPartySlugForRecognition(party.ideologyScore ?? 0)
      : party.slug;

    const resolved = await resolveCandidateForSimulation({
      firstName: normalizedCandidate.firstName,
      lastName: normalizedCandidate.lastName,
      partySlug: recognitionSlug,
      description,
      program: prog || undefined,
    });

    const profile = buildIntelligenceProfile(
      {
        firstName: normalizedCandidate.firstName,
        lastName: normalizedCandidate.lastName,
        partySlug: partyDef.slug,
        description: userDescription,
        program: prog,
      },
      resolved.recognitionForEngine,
      resolved.publicFigureForEngine,
      partyDef,
    );

    const fig = resolved.publicFigureForEngine;
    const naturalLeader =
      !party.isCustom && fig?.defaultPartySlug === party.slug;
    const delta = candidateElectoralDelta(
      profile,
      undefined,
      profile.personalImpactScore,
      undefined,
      { naturalPartyLeader: naturalLeader },
    );

    const campaign = analyzeCampaignText(description, prog, partyDef);
    const hasUserText = userDescription.length > 25 || prog.length > 40;

    let compatibility = profile.partyCompatibility;
    let textSwingPts = campaign.textSwingPts;
    let campaignImpact = campaign.impactScore;
    let credibility = clamp(
      profile.credibility * 0.45 + campaign.credibility * 0.55,
      10,
      95,
    );
    let mobilization = profile.mobilization;

    if (hasUserText) {
      if (campaign.hasReliableIdeology && campaign.depth >= 40) {
        const textWeight = clamp(campaign.depth / 100, 0.35, 0.75);
        if (campaign.coherence >= 60 && campaign.ideology * partyDef.ideologyScore >= 0) {
          compatibility = clamp(compatibility + campaign.textSwingPts * 1.2, 0, 98);
        } else if (campaign.coherence < 45) {
          compatibility = clamp(compatibility + campaign.textSwingPts * 1.5, 0, 98);
        }
        compatibility = Math.round(
          compatibility * (1 - textWeight * 0.15) +
            (compatibility + campaign.textSwingPts * 2) * (textWeight * 0.15),
        );
      }
      mobilization = clamp(profile.mobilization + campaign.textSwingPts * 0.8, 0, 95);
    } else if (profile.isPublicFigure) {
      textSwingPts = 0;
      campaignImpact = clamp(campaign.impactScore * 0.35 + 0.25, 0.2, 0.55);
      credibility = profile.credibility;
    }

    const ideology = hasUserText && campaign.hasReliableIdeology
      ? campaign.ideology
      : fig?.ideologyHint ?? campaign.ideology;

    const expectedSwingPts = clamp(
      delta.expectedPts + textSwingPts,
      -22,
      12,
    );

    let vpEffect = 0;
    if (vicePresident?.firstName?.trim()) {
      const vpParsed = parseCandidateName(
        `${vicePresident.firstName} ${vicePresident.lastName}`.trim(),
      );
      const vpProfile = await this.recognize(
        { ...vicePresident, firstName: vpParsed.firstName, lastName: vpParsed.lastName },
        party,
        vicePresident.program,
      );
      vpEffect = swingFromVpProfile(
        vpProfile.compatibility,
        vpProfile.popularity,
        compatibility,
        vpProfile.isPublicFigure,
      );
    }

    return {
      name: `${normalizedCandidate.firstName} ${normalizedCandidate.lastName}`,
      firstName: normalizedCandidate.firstName,
      lastName: normalizedCandidate.lastName,
      partySlug: party.slug,
      popularity: clamp(profile.notoriety, 5, 98),
      compatibility: clamp(Math.round(compatibility * 10) / 10, 0, 98),
      ideology: clamp(ideology, -1, 1),
      leadership: profile.leadership,
      mobilization,
      credibility,
      isPublicFigure: profile.isPublicFigure,
      positionLabel: ideologyLabel(ideology),
      programSummary: hasUserText
        ? campaign.summary
        : profile.isPublicFigure
          ? `Profilo da dati pubblici${fig?.canonicalName ? ` · ${fig.canonicalName}` : ""}.`
          : campaign.summary,
      themes: campaign.themes,
      textDepth: campaign.depth,
      textSwingPts,
      campaignImpact,
      recognitionNote: recognitionNote(
        profile.isPublicFigure,
        fig?.canonicalName,
        fig?.recognitionMethod,
      ),
      vicePresidentEffect: vpEffect,
      expectedSwingPts,
    };
  }
}

export const candidateRecognizer = new CandidateRecognizer();

// Re-export per compatibilità
export { customPartyDefinition } from "./partyUtils";
