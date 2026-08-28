import type { GamePartyChoice } from "./types";
import type { CoalitionFamily, IdeologySpectrum, PartyDefinition } from "@/types/simulation";
import { PARTIES } from "@/lib/electoral/parties";

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

export function resolveGameParty(party: GamePartyChoice): PartyDefinition {
  if (party.isCustom) return customPartyDefinition(party);
  return PARTIES.find((p) => p.slug === party.slug) ?? customPartyDefinition(party);
}

/** Slug partito reale più vicino — per pipeline Wikipedia/KB con partiti custom. */
export function proxyPartySlugForRecognition(ideologyScore = 0): string {
  let best = PARTIES[0]!;
  let gap = Infinity;
  for (const p of PARTIES) {
    const d = Math.abs(p.ideologyScore - ideologyScore);
    if (d < gap) {
      gap = d;
      best = p;
    }
  }
  return best.slug;
}
