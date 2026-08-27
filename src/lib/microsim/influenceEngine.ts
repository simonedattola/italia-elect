/**
 * Shock ABM sul prior MRP (Fase 4 hybrid).
 * Gli shock sono marginali: il prior resta l'ancora; chaosMode amplifica.
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

function bump(prefs: Record<string, number>, slug: string, delta: number) {
  if (!(slug in prefs)) prefs[slug] = 0;
  prefs[slug] = Math.max(0, prefs[slug]! + delta);
}

/**
 * Applica shock contestuali + compatibilità sul prior statistico.
 */
export function applyInfluence(
  elector: ElectorProfile,
  factors: WeightedFactors[],
  candidate: MicrosimCandidate,
  scenario: ScenarioOverride,
  rng: Rng = Math.random,
): {
  partyVote: string;
  probability: number;
  preferences: Record<string, number>;
  compatibility: number;
} {
  const candidateParty = normalizePartySlug(candidate.partySlug);
  const preferences: Record<string, number> = { ...elector.partyAffinity };
  const conf = elector.statisticalConfidence ?? 0.5;

  for (const p of PARTIES) {
    if (preferences[p.slug] == null) preferences[p.slug] = 0.005;
  }

  // Scala degli shock: prior affidabile → shock più piccoli
  const shockScale = (0.35 + (1 - conf) * 0.65) * (scenario.chaosMode ? 1.8 : 1);

  // 1) Compatibilità candidato (shock non lineare)
  const compatibility = computeCompatibility(candidate, elector);
  if (compatibility < 0.3) {
    if (preferences[candidateParty] != null) {
      preferences[candidateParty]! *= 0.2 + compatibility;
    }
    for (const party of Object.keys(preferences)) {
      if (party !== candidateParty) {
        preferences[party]! += (1 - compatibility) * 0.08 * shockScale;
      }
    }
  } else if (compatibility > 0.7) {
    // Boost limitato: non deve far esplodere il prior (es. Meloni 28% → 35%)
    const boost = (0.04 + compatibility * 0.06) * shockScale;
    bump(preferences, candidateParty, boost * preferences[candidateParty]!);
    // Boost assoluto soft
    bump(preferences, candidateParty, boost * 0.04);
  } else {
    bump(preferences, candidateParty, compatibility * 0.03 * shockScale);
  }

  // 2) Fattori contestuali come shock marginali (max ~5% relativo tipico)
  for (const factor of factors) {
    const impact = Math.min(0.05, factor.weightedScore * 0.05) * shockScale;

    switch (factor.category) {
      case "economy": {
        if (factor.factorId.includes("unemployment")) {
          for (const party of OPPOSITION) bump(preferences, party, impact);
          for (const party of GOV_2024) bump(preferences, party, -impact * 0.6);
        } else if (
          factor.factorId.includes("gdp") ||
          factor.factorId.includes("investment")
        ) {
          for (const party of GOV_2024) bump(preferences, party, impact * 0.8);
        } else if (factor.factorId.includes("inflation")) {
          for (const party of OPPOSITION) bump(preferences, party, impact * 0.7);
        }
        break;
      }
      case "polls": {
        const slug = pollFactorToSlug(factor.factorId);
        if (slug) bump(preferences, slug, impact * 0.9);
        break;
      }
      case "social": {
        const slug = socialOrNewsParty(factor.factorId);
        const amp = impact * elector.socialInfluence;
        if (slug) bump(preferences, slug, amp);
        else if (factor.factorId.includes("candidate")) {
          bump(preferences, candidateParty, amp * 1.1);
        }
        break;
      }
      case "news": {
        const slug = socialOrNewsParty(factor.factorId);
        const amp = impact * elector.localCandidateKnowledge;
        if (slug) bump(preferences, slug, amp);
        else if (factor.factorId.includes("candidate")) {
          bump(preferences, candidateParty, amp * 1.2);
        }
        break;
      }
      case "historical": {
        // Hybrid: history già nel prior — shock residuo minimo
        const slug = historicalFactorToSlug(factor.factorId);
        if (slug) bump(preferences, slug, impact * 0.35);
        break;
      }
      default:
        break;
    }
  }

  // 3) Chaos
  if (scenario.chaosMode) {
    for (const party of Object.keys(preferences)) {
      preferences[party]! *= 1 + (rng() - 0.5) * 0.4;
    }
  }

  // 4) Override manuali
  if (scenario.partyVoteAdjustments) {
    for (const [party, adjustment] of Object.entries(
      scenario.partyVoteAdjustments,
    )) {
      bump(preferences, normalizePartySlug(party), adjustment / 100);
    }
  }

  renormalize(preferences);

  const r = rng();
  let cum = 0;
  for (const [party, prob] of Object.entries(preferences)) {
    cum += prob;
    if (r <= cum) {
      return { partyVote: party, probability: prob, preferences, compatibility };
    }
  }

  const firstParty = Object.keys(preferences)[0] ?? "fratelli-ditalia";
  return {
    partyVote: firstParty,
    probability: preferences[firstParty] ?? 0,
    preferences,
    compatibility,
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
