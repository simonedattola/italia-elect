/**
 * Compatibilità elettore ↔ candidato (layer micro-sim).
 * Integra la logica non lineare di src/lib/intelligence/electoralCompatibility.ts
 * con tratti socio-demografici dell'elettore.
 */

import { getParty } from "../electoral/parties";
import {
  computeElectoralCompatibility,
  inferIdeologyAxis,
} from "../intelligence/electoralCompatibility";
import type { ElectorProfile, MicrosimCandidate } from "./types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Compatibilità 0..1 tra profilo elettore e candidato/partito.
 * Usa computeElectoralCompatibility (scala 0–100) + tilt demografico.
 */
export function computeCompatibility(
  candidate: MicrosimCandidate,
  elector: ElectorProfile,
): number {
  const party = getParty(normalizePartySlug(candidate.partySlug));
  if (!party) return 0.35;

  const base = computeElectoralCompatibility({
    party,
    partySlug: party.slug,
    description: candidate.description ?? candidate.name,
    program: candidate.program,
    ideologyHint:
      candidate.profile?.partyCompatibility != null
        ? party.ideologyScore *
          (candidate.profile.partyCompatibility / 100)
        : undefined,
  });

  let score = base.electoralCompatibilityScore / 100;

  if (base.categoricalRejection) {
    return 0;
  }

  // Tilt demografico (debole): età/istruzione/occupazione vs asse partito
  const ideo = party.ideologyScore;
  let demo = 0.5;

  if (elector.age >= 65) demo += ideo > 0.2 ? 0.12 : ideo < -0.2 ? -0.08 : 0.02;
  else if (elector.age <= 30) demo += ideo < -0.15 ? 0.1 : ideo > 0.4 ? -0.06 : 0.04;

  if (elector.education === "alta") demo += Math.abs(ideo) < 0.35 ? 0.06 : -0.02;
  if (elector.education === "bassa") demo += ideo > 0.3 ? 0.05 : ideo < -0.3 ? -0.04 : 0;

  if (elector.occupation === "disoccupato") demo += ideo < 0 ? 0.08 : -0.04;
  if (elector.occupation === "pensionato") demo += ideo > 0.15 ? 0.06 : -0.03;
  if (elector.occupation === "libero_professionista") {
    demo += Math.abs(ideo) < 0.4 ? 0.05 : 0;
  }

  if (elector.zone === "urbano") demo += ideo < 0 ? 0.05 : -0.03;
  if (elector.zone === "rurale") demo += ideo > 0.2 ? 0.06 : -0.03;

  // Affinità storica verso il partito del candidato
  const hist = elector.partyAffinity[party.slug] ?? 0;
  demo = clamp01(demo * 0.55 + hist * 0.45);

  // Profilo candidato (se presente): partyCompatibility / scandalRisk
  if (candidate.profile?.partyCompatibility != null) {
    score *= 0.55 + (candidate.profile.partyCompatibility / 100) * 0.45;
  }
  if (candidate.profile?.scandalRisk != null && candidate.profile.scandalRisk > 60) {
    score *= 1 - (candidate.profile.scandalRisk - 60) / 200;
  }

  // Conoscenza locale amplifica l'effetto compatibilità
  const knowledge = 0.7 + elector.localCandidateKnowledge * 0.3;
  const blended = clamp01(score * 0.65 + demo * 0.35) * knowledge;

  // Inferenza testuale aggiuntiva (coerenza descrizione ↔ partito)
  const inferred = inferIdeologyAxis([
    candidate.description ?? "",
    candidate.program ?? "",
    candidate.name,
  ]);
  const gap = Math.abs(inferred - party.ideologyScore);
  if (gap > 0.85 && (candidate.description || candidate.program)) {
    return clamp01(blended * 0.35);
  }

  return clamp01(blended);
}

/** Alias corti → slug canonici Italia Elect */
export function normalizePartySlug(input: string): string {
  const key = input.trim().toLowerCase();
  const map: Record<string, string> = {
    fdi: "fratelli-ditalia",
    "fratelli-ditalia": "fratelli-ditalia",
    pd: "partito-democratico",
    "partito-democratico": "partito-democratico",
    m5s: "movimento-5-stelle",
    "movimento-5-stelle": "movimento-5-stelle",
    lega: "lega",
    fi: "forza-italia",
    "forza-italia": "forza-italia",
    av: "azione-iv",
    "azione-iv": "azione-iv",
    azione: "azione-iv",
    avs: "avss",
    avss: "avss",
    "piu-europa": "piu-europa",
    italexit: "italexit",
  };
  return map[key] ?? key;
}
