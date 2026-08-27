/**
 * Applica fattori contestuali (Fase 2) + compatibilità non lineare al singolo elettore.
 */

import type { WeightedFactors } from "../context/types";
import { PARTIES } from "../electoral/parties";
import { computeCompatibility, normalizePartySlug } from "./compatibility";
import type {
  ElectorProfile,
  MicrosimCandidate,
  Rng,
  ScenarioOverride,
} from "./types";

const GOV_2024 = new Set([
  "fratelli-ditalia",
  "lega",
  "forza-italia",
]);

const OPPOSITION = new Set([
  "partito-democratico",
  "movimento-5-stelle",
  "avss",
  "azione-iv",
  "piu-europa",
]);

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function renormalize(prefs: Record<string, number>) {
  const total = Object.values(prefs).reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const even = 1 / Math.max(1, Object.keys(prefs).length);
    for (const k of Object.keys(prefs)) prefs[k] = even;
    return;
  }
  for (const k of Object.keys(prefs)) prefs[k] = prefs[k]! / total;
}

function bump(
  prefs: Record<string, number>,
  slug: string,
  delta: number,
) {
  if (!(slug in prefs)) prefs[slug] = 0;
  prefs[slug] = Math.max(0, prefs[slug]! + delta);
}

/**
 * Applica i fattori contestuali a un elettore, restituendo il voto modificato.
 */
export function applyInfluence(
  elector: ElectorProfile,
  factors: WeightedFactors[],
  candidate: MicrosimCandidate,
  scenario: ScenarioOverride,
  rng: Rng = Math.random,
): { partyVote: string; probability: number; preferences: Record<string, number> } {
  const candidateParty = normalizePartySlug(candidate.partySlug);
  const preferences: Record<string, number> = { ...elector.partyAffinity };

  // Assicura tutte le chiavi PARTIES
  for (const p of PARTIES) {
    if (preferences[p.slug] == null) preferences[p.slug] = 0.01;
  }

  for (const factor of factors) {
    const impact = factor.weightedScore; // raw * weight, tipicamente piccolo
    const raw = factor.rawValue;
    const w = factor.weight;

    switch (factor.category) {
      case "economy": {
        if (factor.factorId.includes("unemployment")) {
          // raw alto = disoccupazione alta (distress) → opposizione
          const intensity = impact * 0.35;
          for (const party of OPPOSITION) bump(preferences, party, intensity * 0.08);
          for (const party of GOV_2024) bump(preferences, party, -intensity * 0.05);
        } else if (factor.factorId.includes("gdp") || factor.factorId.includes("investment")) {
          // crescita/investimenti alti → governo
          const intensity = impact * 0.25;
          for (const party of GOV_2024) bump(preferences, party, intensity * 0.06);
        } else if (factor.factorId.includes("inflation")) {
          for (const party of OPPOSITION) bump(preferences, party, impact * 0.04);
        } else {
          // reddito/consumi: status quo bias leggero
          for (const party of GOV_2024) bump(preferences, party, impact * 0.02);
        }
        break;
      }
      case "polls": {
        // Bandwagon: fattore polls_* punta a un partito
        const slug = pollFactorToSlug(factor.factorId);
        if (slug) bump(preferences, slug, impact * 0.12);
        break;
      }
      case "social": {
        const slug = socialOrNewsParty(factor.factorId);
        const amp = impact * 0.1 * elector.socialInfluence;
        if (slug) bump(preferences, slug, amp);
        else if (factor.factorId.includes("national")) {
          // sentiment nazionale positivo → partiti in vantaggio nei polls mock
          bump(preferences, "fratelli-ditalia", amp * 0.5);
          bump(preferences, "partito-democratico", amp * 0.35);
        } else if (factor.factorId.includes("candidate")) {
          bump(preferences, candidateParty, amp * 1.2);
        }
        break;
      }
      case "news": {
        const slug = socialOrNewsParty(factor.factorId);
        const amp = impact * 0.08 * elector.localCandidateKnowledge;
        if (slug) bump(preferences, slug, amp);
        else if (factor.factorId.includes("candidate")) {
          bump(preferences, candidateParty, amp * 1.3);
        } else if (factor.factorId.includes("national")) {
          bump(preferences, candidateParty, amp * 0.4);
        }
        break;
      }
      case "historical": {
        const slug = historicalFactorToSlug(factor.factorId);
        if (slug) bump(preferences, slug, impact * 0.15);
        else if (factor.factorId.includes("comune_trend")) {
          // stabilità → rafforza previousVote
          if (elector.previousVote) {
            bump(preferences, elector.previousVote, w * raw * 0.08);
          }
        }
        break;
      }
      case "demographic": {
        // già incorporato in affinity generation; effetto residuo soft
        if (factor.factorId.includes("education") && elector.education === "alta") {
          bump(preferences, "partito-democratico", impact * 0.03);
          bump(preferences, "azione-iv", impact * 0.02);
        }
        break;
      }
      default:
        break;
    }
  }

  // Compatibilità non lineare candidato
  const compatibility = computeCompatibility(candidate, elector);
  if (compatibility < 0.3) {
    if (preferences[candidateParty] != null) {
      preferences[candidateParty]! *= 0.2;
    }
    for (const party of Object.keys(preferences)) {
      if (party !== candidateParty) {
        preferences[party]! += (1 - compatibility) * 0.04;
      }
    }
  } else if (compatibility > 0.7) {
    if (preferences[candidateParty] != null) {
      preferences[candidateParty]! *= 1 + 0.35 * compatibility;
    } else {
      preferences[candidateParty] = 0.15 * compatibility;
    }
  } else {
    // fascia media: boost proporzionale
    bump(preferences, candidateParty, compatibility * 0.06);
  }

  // Scenario overrides
  if (scenario.partyVoteAdjustments) {
    for (const [party, adjustment] of Object.entries(scenario.partyVoteAdjustments)) {
      const slug = normalizePartySlug(party);
      bump(preferences, slug, adjustment / 100);
    }
  }

  renormalize(preferences);

  const r = rng();
  let cum = 0;
  for (const [party, prob] of Object.entries(preferences)) {
    cum += prob;
    if (r <= cum) {
      return { partyVote: party, probability: prob, preferences };
    }
  }

  const firstParty = Object.keys(preferences)[0] ?? "fratelli-ditalia";
  return {
    partyVote: firstParty,
    probability: preferences[firstParty] ?? 0,
    preferences,
  };
}

function pollFactorToSlug(factorId: string): string | null {
  if (factorId.includes("_pd")) return "partito-democratico";
  if (factorId.includes("_fdi")) return "fratelli-ditalia";
  if (factorId.includes("_m5s")) return "movimento-5-stelle";
  if (factorId.includes("_lega")) return "lega";
  if (factorId.includes("_fi")) return "forza-italia";
  if (factorId.includes("_av")) return "azione-iv";
  return null;
}

function socialOrNewsParty(factorId: string): string | null {
  return pollFactorToSlug(factorId);
}

function historicalFactorToSlug(factorId: string): string | null {
  if (factorId.includes("_pd")) return "partito-democratico";
  if (factorId.includes("_fdi")) return "fratelli-ditalia";
  if (factorId.includes("_m5s")) return "movimento-5-stelle";
  return null;
}

export { clamp01 };
