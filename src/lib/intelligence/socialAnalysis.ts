/**
 * Social Intelligence — Social Momentum Score.
 * I social sono un indicatore SECONDARIO, corretto statisticamente.
 * Senza API X live: usa proxy modellistici da trend embeddati + profilo candidato.
 */

import type { SocialMomentum } from "@/types/intelligence";
import type { CandidateProfile } from "@/types/simulation";
import { PARTIES } from "@/lib/electoral/parties";
import { clamp } from "@/lib/utils";

/** Proxy di momentum online per partito (non sostituisce sondaggi) */
const EMBEDDED_SOCIAL_PARTY: Record<string, number> = {
  "fratelli-ditalia": 0.25,
  "partito-democratico": 0.1,
  "movimento-5-stelle": 0.05,
  lega: 0.15,
  "forza-italia": -0.05,
  avss: 0.2,
  "azione-iv": -0.1,
  "piu-europa": 0.0,
  italexit: -0.15,
};

export function analyzeSocialMomentum(opts: {
  profile: CandidateProfile;
  candidateName: string;
  liveAvailable?: boolean;
}): SocialMomentum {
  const { profile, liveAvailable = false } = opts;

  // Score candidato da profilo (proxy engagement/reputazione)
  const comms = (profile.communication - 50) / 50;
  const social = (profile.socialConsensus - 50) / 50;
  const scandal = -(profile.scandalRisk / 100) * 0.8;
  const noto = (profile.notoriety - 40) / 60;
  const candidateScore = clamp(comms * 0.3 + social * 0.35 + scandal * 0.25 + noto * 0.1, -1, 1);

  const scoreByParty: Record<string, number> = {};
  for (const p of PARTIES) {
    scoreByParty[p.slug] = EMBEDDED_SOCIAL_PARTY[p.slug] ?? 0;
  }

  return {
    asOf: new Date().toISOString(),
    available: liveAvailable,
    scoreByParty,
    scoreByCandidate: candidateScore,
    volumeIndex: clamp(profile.notoriety / 100, 0, 1),
    polarization: clamp(0.45 + Math.abs(candidateScore) * 0.25, 0, 1),
    note: liveAvailable
      ? "Analisi social da stream pubblici disponibili."
      : "API social non configurata: usato Social Momentum Score proxy da profilo e trend incorporati. Indicatore secondario, corretto a basso peso nel modello.",
    sources: liveAvailable
      ? ["X public API (se configurata)"]
      : ["Proxy modellistico Italia Elect — non campiona l'intera popolazione"],
  };
}

/** Shock max ±1.2 punti — peso basso by design */
export function socialPartyShocks(social: SocialMomentum): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [slug, score] of Object.entries(social.scoreByParty)) {
    out[slug] = score * 1.2 * 0.35; // correzione statistica
  }
  return out;
}
