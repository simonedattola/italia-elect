/**
 * Bridge: Public Figure Recognition Engine → RecognizedCandidate (legacy shape).
 * Il modello elettorale usa il profilo solo dopo riconoscimento affidabile.
 * Compatibilità = Electoral Compatibility (non Personal Impact).
 */

import type { RecognizedCandidate, PublicFigureCategory } from "@/types/intelligence";
import type {
  IdentifyContext,
  PublicFigureProfile,
} from "@/lib/intelligence/publicFigure/types";
import {
  identifyPublicFigure,
  identifyPublicFigureSync,
  normalizePersonKey,
} from "@/lib/intelligence/publicFigure/engine";
import { findCuratedFigure } from "@/lib/intelligence/publicFigure/knowledgeBase";
import { getPartyOrThrow } from "@/lib/electoral/parties";
import { clamp } from "@/lib/utils";
import {
  computeElectoralCompatibility,
  computePersonalImpactScore,
} from "@/lib/intelligence/electoralCompatibility";

export type { KnowledgeRecord } from "./candidateRecognitionTypes";
export { PUBLIC_KNOWLEDGE } from "./candidateRecognitionTypes";

function toRecognized(
  figure: PublicFigureProfile,
  partySlug: string,
  description?: string,
  program?: string,
): RecognizedCandidate {
  const party = getPartyOrThrow(partySlug);
  const usable = figure.publicFigure && !figure.needsConfirmation && figure.confidence >= 70;

  const compat = computeElectoralCompatibility({
    party,
    partySlug,
    figure: usable ? figure : undefined,
    description,
    program,
    ideologyHint: figure.ideologyHint,
  });

  // Sconosciuto: compatibilità solo da testo (passata dopo in buildIntelligenceProfile);
  // qui usiamo un baseline neutro-basso se non usable
  const partyCompatibility = usable
    ? compat.electoralCompatibilityScore
    : clamp(45, 0, 98);

  const personalImpact = usable
    ? compat.personalImpactScore
    : computePersonalImpactScore({
        notoriety: Math.min(figure.notorietyScore, 20),
        mediaExposure: Math.min(figure.mediaExposureScore, 15),
        personalBrand: Math.min(figure.personalBrandScore, 22),
        isPublicFigure: false,
      });

  const brand = usable ? figure.personalBrandScore : Math.min(figure.personalBrandScore, 22);

  // Impatto elettorale: notorietà alta + compat bassa → lostVotes alti, newVotes bassi
  const electoralImpact = usable
    ? {
        newVotes: clamp(
          personalImpact * 0.15 * (partyCompatibility / 100) +
            (figure.inferredScores?.undecidedAppeal ?? 30) * 0.2 * (partyCompatibility / 100),
          0,
          95
        ),
        lostVotes: clamp(
          (100 - partyCompatibility) * 0.7 +
            (figure.inferredScores?.scandalRisk ?? 20) * 0.2 +
            (compat.categoricalRejection ? 40 : 0) +
            personalImpact * 0.15 * (1 - partyCompatibility / 100),
          0,
          100
        ),
        mobilizeAbstainers: clamp(
          ((figure.inferredScores?.mobilization ?? 30) * 0.5 + brand * 0.2) *
            (partyCompatibility / 100),
          0,
          95
        ),
        communication: figure.inferredScores?.communication ?? 40,
      }
    : {
        newVotes: 12,
        lostVotes: 35,
        mobilizeAbstainers: 15,
        communication: 30,
      };

  const evidenceNotes = !usable
    ? [
        figure.message,
        figure.needsConfirmation
          ? "Entity resolution: conferma richiesta (confidenza < 70)."
          : "Figura pubblica: NO (non determinata).",
        "Notorietà: bassa / non verificata per il modello elettorale.",
        "Impatto candidato: limitato ai dati inseriti manualmente.",
        ...(figure.candidateOptions ?? []).slice(0, 3).map(
          (o) => `Omonimo possibile: ${o.label} — ${o.description} (${o.confidence}%)`
        ),
      ]
    : [
        figure.message,
        `Figura pubblica: SÌ (${figure.category === "NATIONAL_PUBLIC" ? "nazionale" : "locale"} · ${figure.roleCategory}).`,
        `Canonical: ${figure.canonicalName}.`,
        `Identità: ${figure.identity}.`,
        `Confidenza entity resolution: ${figure.confidence}/100.`,
        figure.biography,
        ...figure.politicalHistory.slice(0, 4).map((h) => `Storia politica: ${h}`),
        ...figure.associatedParties.slice(0, 4).map((p) => `Partito associato: ${p}`),
        `Personal Impact Score: ${personalImpact}/100 (notorietà/media/brand — NON è compatibilità).`,
        `Electoral Compatibility Score: ${partyCompatibility}/100 con ${party.shortName}.`,
        ...compat.notes,
        `Notorietà: ${figure.notorietyScore}/100.`,
        `Esposizione media: ${figure.mediaExposureScore}/100.`,
        `Polarizzazione: ${figure.polarizationScore}/100.`,
        `Personal Brand Score: ${brand}/100.`,
        "Punteggi = inferenze modellistiche su informazioni pubbliche, non fatti certificati.",
        ...figure.controversies.verifiedFacts.map((f) => `Fatto: ${f}`),
        ...figure.controversies.proceedings.map((f) => `Procedimento (da verificare): ${f}`),
        ...figure.controversies.finalConvictions.map((f) => `Sentenza/provvedimento: ${f}`),
        ...figure.controversies.accusations.map((f) => `Accusa (non fatto accertato): ${f}`),
        ...figure.controversies.publicOpinions.map((f) => `Opinione pubblica: ${f}`),
      ];

  return {
    firstName: figure.firstName,
    lastName: figure.lastName,
    category: (usable ? figure.category : "UNKNOWN") as PublicFigureCategory,
    normalizedKey: figure.normalizedKey,
    biography: figure.biography,
    career: [...figure.positions, ...figure.politicalHistory].join("; "),
    sources: figure.sources.map((s) => ({
      title: s.title,
      url: s.url,
      type: s.type,
    })),
    notoriety: usable ? figure.notorietyScore : Math.min(figure.notorietyScore, 20),
    mediaExposure: usable ? figure.mediaExposureScore : Math.min(figure.mediaExposureScore, 15),
    perceivedLeadership: usable
      ? figure.inferredScores?.leadership ?? 50
      : 20,
    partyCompatibility,
    electoralImpact,
    controversyNotes: figure.controversies,
    evidenceNotes,
    reliability: !usable
      ? 0.3
      : figure.recognitionMethod === "knowledge_base"
        ? 0.92
        : clamp(figure.confidence / 100, 0.55, 0.9),
    fromCache: figure.fromCache,
    aliasesRejected: [],
  };
}

/** Sync: knowledge base + unknown (no network). Usato nei test/engine fallback. */
export function recognizeCandidate(
  firstName: string,
  lastName: string,
  partySlug: string
): RecognizedCandidate {
  const figure = identifyPublicFigureSync(firstName, lastName);
  return toRecognized(figure, partySlug);
}

export type RecognizeAsyncResult = RecognizedCandidate & {
  publicFigure: PublicFigureProfile;
};

/** Async: cache → KB → Wikidata/Wikipedia/DBpedia → sintesi. */
export async function recognizeCandidateAsync(
  firstName: string,
  lastName: string,
  partySlug: string,
  ctx?: Omit<IdentifyContext, "partySlug">
): Promise<RecognizeAsyncResult> {
  const figure = await identifyPublicFigure(firstName, lastName, {
    ...ctx,
    partySlug,
  });
  return {
    ...toRecognized(figure, partySlug, ctx?.description, ctx?.program),
    publicFigure: figure,
  };
}

export function getKnowledgeRecord(firstName: string, lastName: string) {
  return findCuratedFigure(firstName, lastName);
}

export { normalizePersonKey };
