/**
 * Profilo candidato — Personal Impact ≠ Electoral Compatibility.
 */

import type { CandidateInput, CandidateProfile } from "@/types/simulation";
import type { RecognizedCandidate } from "@/types/intelligence";
import type { PublicFigureProfile } from "@/lib/intelligence/publicFigure/types";
import { recognizeCandidate } from "@/lib/intelligence/candidateRecognition";
import { identifyPublicFigureSync } from "@/lib/intelligence/publicFigure/engine";
import { getPartyOrThrow } from "@/lib/electoral/parties";
import { clamp } from "@/lib/utils";
import {
  computeElectoralCompatibility,
  computePersonalImpactScore,
  type CompatibilityBreakdown,
} from "@/lib/intelligence/electoralCompatibility";

function tokenizeIdeology(text: string): number {
  const t = text.toLowerCase();
  let score = 0;
  const left = [
    "sinistra", "progressist", "egualitar", "ambiental", "lgbt", "femminis",
    "redistribuz", "welfare", "antifasc", "lavoratori", "sindacal", "accoglienza",
  ];
  const right = [
    "conservator", "sovranist", "patriott", "sicurezza", "tradizion", "famiglia",
    "immigrazion", "ordine", "nazione", "identit", "liberismo fiscale", "flat tax",
  ];
  for (const w of left) if (t.includes(w)) score -= 0.12;
  for (const w of right) if (t.includes(w)) score += 0.12;
  return clamp(score, -1, 1);
}

function textDepth(description: string, program?: string): number {
  const len = description.length + (program?.length ?? 0);
  if (len < 80) return 25;
  if (len < 200) return 45;
  if (len < 500) return 60;
  return 72;
}

export function buildIntelligenceProfile(
  input: CandidateInput,
  recognized?: RecognizedCandidate,
  publicFigure?: PublicFigureProfile
): CandidateProfile & {
  recognition: RecognizedCandidate;
  personalBrandScore: number;
  personalImpactScore: number;
  compatibilityBreakdown?: CompatibilityBreakdown;
} {
  const rec =
    recognized ??
    recognizeCandidate(input.firstName, input.lastName, input.partySlug);
  const party = getPartyOrThrow(input.partySlug);

  // Se manca il profilo Entity Resolution, prova KB sync (test/engine legacy)
  const figure =
    publicFigure ??
    (rec.category !== "UNKNOWN"
      ? identifyPublicFigureSync(input.firstName, input.lastName)
      : undefined);
  const figureUsable = Boolean(
    figure &&
      figure.publicFigure &&
      !figure.needsConfirmation &&
      figure.confidence >= 70 &&
      figure.category !== "UNKNOWN"
  );

  const recognizedOk = publicFigure
    ? publicFigure.publicFigure &&
      !publicFigure.needsConfirmation &&
      publicFigure.confidence >= 70 &&
      rec.category !== "UNKNOWN"
    : figureUsable || rec.category !== "UNKNOWN";

  if (recognizedOk && (figureUsable || rec.category !== "UNKNOWN")) {
    const breakdown = computeElectoralCompatibility({
      party,
      partySlug: input.partySlug,
      figure: figureUsable ? figure : undefined,
      description: input.description,
      program: input.program,
      ideologyHint: figure?.ideologyHint,
    });

    // Testo utente può ridurre solo se esprime un segnale ideologico chiaro
    // e contraddice il partito — testo neutro NON deve abbassare un leader naturale.
    const textIdeology = tokenizeIdeology(`${input.description} ${input.program ?? ""}`);
    const textHasSignal = Math.abs(textIdeology) >= 0.2;
    const textGap = Math.abs(textIdeology - party.ideologyScore);
    let compatibility = breakdown.electoralCompatibilityScore;
    const naturalLeader = figure?.defaultPartySlug === input.partySlug;
    if (
      textHasSignal &&
      textGap > 0.55 &&
      input.description.length > 40 &&
      !breakdown.categoricalRejection &&
      !naturalLeader
    ) {
      compatibility = Math.min(compatibility, clamp(100 - textGap * 100, 0, 70));
    }

    const s = figure?.inferredScores;
    const personalImpact = breakdown.personalImpactScore;
    const profile: CandidateProfile = {
      notoriety: figure?.notorietyScore ?? rec.notoriety,
      credibility: breakdown.categoricalRejection
        ? Math.min(s?.credibility ?? 20, 15)
        : s?.credibility ?? 50,
      experience: s?.experience ?? 60,
      competence: s?.competence ?? 55,
      leadership: s?.leadership ?? rec.perceivedLeadership,
      communication: s?.communication ?? rec.electoralImpact.communication,
      popularity: breakdown.categoricalRejection
        ? Math.min(s?.popularity ?? 10, 8)
        : s?.popularity ?? 45,
      scandalRisk: breakdown.categoricalRejection
        ? 98
        : s?.scandalRisk ?? 30,
      mediaConsensus: s?.mediaConsensus ?? (figure?.mediaExposureScore ?? rec.mediaExposure) * 0.5,
      socialConsensus: breakdown.categoricalRejection
        ? 5
        : s?.socialConsensus ?? 45,
      undecidedAppeal: clamp(
        (s?.undecidedAppeal ?? 40) * (compatibility / 100),
        0,
        55
      ),
      mobilization: clamp(
        (s?.mobilization ?? rec.electoralImpact.mobilizeAbstainers) * (compatibility / 100),
        0,
        95
      ),
      partyCompatibility: compatibility,
      isPublicFigure: true,
      evidenceNotes: [
        ...rec.evidenceNotes,
        `Personal Impact Score: ${personalImpact}/100.`,
        `Electoral Compatibility: ${compatibility}/100.`,
        ...breakdown.notes,
      ],
      dataQuality: breakdown.categoricalRejection
        ? "high"
        : (s?.scandalRisk ?? 0) > 80
          ? "medium"
          : "high",
    };

    return {
      ...profile,
      recognition: { ...rec, partyCompatibility: compatibility },
      personalBrandScore: figure?.personalBrandScore ?? rec.notoriety,
      personalImpactScore: personalImpact,
      compatibilityBreakdown: { ...breakdown, electoralCompatibilityScore: compatibility },
    };
  }

  // Sconosciuto — solo dati inseriti
  const depth = textDepth(input.description, input.program);
  const hasProgram = Boolean(input.program && input.program.length > 50);
  const textCompat = computeElectoralCompatibility({
    party,
    partySlug: input.partySlug,
    description: input.description,
    program: input.program,
  });
  const compatibility = textCompat.electoralCompatibilityScore;

  const profile: CandidateProfile = {
    notoriety: clamp(10 + depth * 0.15, 5, 35),
    credibility: clamp(40 + depth * 0.25 + (hasProgram ? 8 : 0), 20, 75),
    experience: clamp(25 + depth * 0.2, 10, 60),
    competence: clamp(35 + depth * 0.3 + (hasProgram ? 8 : 0), 15, 78),
    leadership: clamp(28 + depth * 0.2, 15, 65),
    communication: clamp(35 + depth * 0.25, 20, 70),
    popularity: clamp(12 + depth * 0.15, 5, 40),
    scandalRisk: 12,
    mediaConsensus: clamp(15 + depth * 0.1, 8, 40),
    socialConsensus: clamp(15 + depth * 0.15, 8, 45),
    undecidedAppeal: clamp(25 + depth * 0.15, 10, 55),
    mobilization: clamp(18 + depth * 0.2, 10, 55),
    partyCompatibility: compatibility,
    isPublicFigure: false,
    evidenceNotes: [
      ...rec.evidenceNotes,
      `Qualità informativa del testo: ${depth < 40 ? "bassa" : depth < 60 ? "media" : "sufficiente"}.`,
      ...textCompat.notes,
    ],
    dataQuality: depth < 40 ? "insufficient" : depth < 55 ? "low" : "medium",
  };

  const personalImpact = computePersonalImpactScore({
    notoriety: profile.notoriety,
    mediaExposure: profile.mediaConsensus,
    personalBrand: clamp(profile.notoriety * 0.6 + profile.credibility * 0.2, 5, 22),
    communication: profile.communication,
    isPublicFigure: false,
  });

  return {
    ...profile,
    recognition: {
      ...rec,
      notoriety: profile.notoriety,
      mediaExposure: profile.mediaConsensus,
      perceivedLeadership: profile.leadership,
      partyCompatibility: compatibility,
      electoralImpact: {
        newVotes: profile.undecidedAppeal * (compatibility / 100),
        lostVotes: 100 - compatibility,
        mobilizeAbstainers: profile.mobilization * (compatibility / 100),
        communication: profile.communication,
      },
    },
    personalBrandScore: clamp(profile.notoriety * 0.6 + profile.credibility * 0.2, 5, 22),
    personalImpactScore: personalImpact,
    compatibilityBreakdown: textCompat,
  };
}

export interface CandidateDelta {
  multiplier: number;
  expectedPts: number;
  leakFactor: number;
  attractionPts: number;
  rejectionPts: number;
  personalImpactScore: number;
  categoricalRejection: boolean;
  sanityAdjusted: boolean;
}

/**
 * Impatto candidato: Personal Impact amplifica il segno della compatibilità.
 * Famoso + incompatibile → perdita FORTE (non compensazione).
 */
export function candidateElectoralDelta(
  profile: CandidateProfile,
  personalBrandScore?: number,
  personalImpactScore?: number,
  categoricalRejection?: boolean
): CandidateDelta {
  const impact =
    personalImpactScore ??
    (profile.isPublicFigure
      ? computePersonalImpactScore({
          notoriety: profile.notoriety,
          mediaExposure: profile.mediaConsensus,
          personalBrand: personalBrandScore ?? profile.notoriety,
          communication: profile.communication,
          isPublicFigure: true,
        })
      : Math.min(personalBrandScore ?? profile.notoriety, 22));

  const brand = profile.isPublicFigure
    ? (personalBrandScore ?? profile.notoriety)
    : Math.min(personalBrandScore ?? profile.notoriety, 22);

  const compat = profile.partyCompatibility / 100;
  const rejected =
    categoricalRejection ??
    profile.evidenceNotes.some((n) => /totalitari|nazifasc/i.test(n));

  // Leak fedeltà: può collassare a ~0 (non floor 0.12)
  const leakFactor = rejected
    ? 0.02
    : clamp(Math.pow(Math.max(compat, 0.01), 1.25), 0.02, 1);

  // Personal impact coerente → moltiplicatore positivo; altrimenti non aiuta
  const strengthIfAligned =
    brand * 0.18 +
    profile.credibility * 0.12 +
    profile.leadership * 0.12 +
    profile.communication * 0.1 +
    profile.popularity * 0.08 +
    profile.undecidedAppeal * 0.1 +
    profile.mobilization * 0.1 +
    profile.partyCompatibility * 0.2;

  const scandal = (profile.scandalRisk / 100) * 0.65;
  const centered = (strengthIfAligned - 48) / 100;

  let multiplier: number;
  if (rejected) {
    // Impatto personale ALTO aumenta il danno (attenzione tossica)
    const toxicity = 0.35 + (impact / 100) * 0.45;
    multiplier = clamp(0.12 + compat * 0.2 - toxicity * 0.2 - scandal * 0.3, 0.08, 0.45);
  } else if (profile.partyCompatibility < 25) {
    multiplier = clamp(0.3 + compat * 0.55 + centered * 0.25 - scandal, 0.15, 0.85);
  } else {
    const brandBoost = !profile.isPublicFigure
      ? -0.08
      : brand >= 70
        ? 0.12
        : brand >= 45
          ? 0.04
          : -0.05;
    multiplier = clamp(1 + centered * 1.15 + brandBoost - scandal, 0.25, 1.75);
  }

  // Effetto positivo: solo se compatibilità sufficiente
  const attractionPts =
    compat >= 0.45 && profile.isPublicFigure
      ? (profile.undecidedAppeal / 100) * 5 * compat * (impact / 100) +
        (brand >= 80 && compat >= 0.7 ? 1.5 * compat : 0)
      : compat >= 0.3
        ? (profile.undecidedAppeal / 100) * 1.5 * compat
        : 0;

  // Effetto negativo: perdita elettori storici / polarizzazione
  // Personal impact amplifica il rigetto (non la compensazione)
  const rejectionPts = rejected
    ? 10 + impact * 0.14 + (100 - profile.partyCompatibility) * 0.06
    : profile.partyCompatibility < 35
      ? (1 - compat) * (5 + impact * 0.07) + scandal * 3.5
      : scandal * 3;

  let expectedPts =
    (multiplier * leakFactor - 1) * (8 + Math.min(impact, 60) * 0.06) +
    attractionPts -
    rejectionPts;

  if (!profile.isPublicFigure) {
    expectedPts = clamp(expectedPts, -2.5, 2.2);
  } else if (rejected) {
    expectedPts = clamp(expectedPts, -28, -8);
  } else if (profile.partyCompatibility < 25) {
    expectedPts = clamp(expectedPts, -18, -2);
  }

  return {
    multiplier,
    expectedPts,
    leakFactor,
    attractionPts,
    rejectionPts,
    personalImpactScore: Math.round(impact),
    categoricalRejection: rejected,
    sanityAdjusted: false,
  };
}
