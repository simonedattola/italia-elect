/**
 * Compatibilità elettorale non lineare.
 *
 * Distingue:
 * - Personal Impact Score (notorietà / media / brand)
 * - Electoral Compatibility Score (solo accettazione da parte della base)
 *
 * Red flag → moltiplicatori (non medie additive).
 */

import type { PartyDefinition } from "@/types/simulation";
import type { PublicFigureProfile } from "@/lib/intelligence/publicFigure/types";
import { clamp } from "@/lib/utils";

export interface CompatibilityBreakdown {
  personalImpactScore: number;
  electoralCompatibilityScore: number;
  ideologicalCompatibility: number; // 0–1
  historicalCoherence: number; // 0–1
  electorateAcceptance: number; // 0–1
  redFlags: string[];
  inferredIdeology: number; // -1 … +1
  categoricalRejection: boolean;
  notes: string[];
}

const TOTALITARIAN_RE = /nazionalsocial|nazista|\bnazi\b|hitler|fascis|dittator|olocausto|holocaust|shoah|genocid|Führer|fuhrer|partito nazionale fascista|nsdap/i;

const FAR_RIGHT_RE =
  /estrema destra|neofasc|sovranist.*radicale|supremac|razzist|antisemit/i;
const RIGHT_RE =
  /conservator|sovranist|patriott|destra|centrodestra|forza italia|lega|fratelli d.?italia|alleanza nazionale|pdl/i;
const LEFT_RE =
  /sinistra|progressist|socialist|comunist|ambiental|lgbt|femminis|antifasc|partito democratico|sinistra italiana|verdi|welfare|lavoratori|sindacal/i;
const CENTER_RE = /liberale|europeist|riformist|tecnocrat|moderato|centrist/i;

/** Inferisce asse ideologico da biografia/storia/partiti (quando manca ideologyHint). */
export function inferIdeologyAxis(texts: string[]): number {
  const blob = texts.filter(Boolean).join(" \n ");
  if (!blob.trim()) return 0;

  if (TOTALITARIAN_RE.test(blob)) return 0.98;
  if (FAR_RIGHT_RE.test(blob)) return 0.85;

  let score = 0;
  let hits = 0;
  if (RIGHT_RE.test(blob)) {
    score += 0.55;
    hits++;
  }
  if (LEFT_RE.test(blob)) {
    score -= 0.5;
    hits++;
  }
  if (CENTER_RE.test(blob)) {
    score += 0.05;
    hits++;
  }
  if (!hits) return 0;
  return clamp(score / Math.max(hits, 1), -1, 1);
}

function ideologyDistanceToCompat(gap: number): number {
  // Gap piccolo → alta compat; gap alto → collasso non lineare (non additivo)
  if (gap >= 1.2) return 0.02;
  if (gap >= 1.0) return 0.14;
  if (gap >= 0.85) return 0.22;
  if (gap >= 0.65) return 0.38;
  if (gap >= 0.45) return 0.52;
  if (gap >= 0.3) return 0.68;
  if (gap >= 0.15) return 0.84;
  return 0.95;
}

function collectText(figure?: PublicFigureProfile, description?: string, program?: string) {
  return [
    figure?.biography ?? "",
    ...(figure?.politicalHistory ?? []),
    ...(figure?.associatedParties ?? []),
    ...(figure?.partyHistory ?? []),
    ...(figure?.positions ?? []),
    ...(figure?.occupations ?? []),
    description ?? "",
    program ?? "",
  ];
}

function detectRedFlags(opts: {
  texts: string[];
  party: PartyDefinition;
  ideologyGap: number;
  defaultPartySlug?: string;
  partySlug: string;
}): string[] {
  const flags: string[] = [];
  const blob = opts.texts.join(" \n ");
  const partyLeftish = opts.party.ideologyScore <= -0.15;
  const partyDemocratic = true; // tutti i partiti nel simulatore sono democratici contemporanei

  if (TOTALITARIAN_RE.test(blob) && partyDemocratic) {
    flags.push(
      "Figura storicamente totalitaria/nazifascista incompatibile con un partito democratico contemporaneo"
    );
  }
  if (TOTALITARIAN_RE.test(blob) && partyLeftish) {
    flags.push("Ideologia e storia incompatibili con l'elettorato di centrosinistra/sinistra");
  }
  if (opts.ideologyGap >= 1.0) {
    flags.push("Distanza ideologica estrema rispetto al partito selezionato");
  }
  if (
    opts.defaultPartySlug &&
    opts.defaultPartySlug !== opts.partySlug &&
    opts.ideologyGap >= 0.55
  ) {
    flags.push("Storia politica associata a un partito/coalizione opposta");
  }
  if (/antifasc/i.test(blob) && opts.party.ideologyScore > 0.5) {
    flags.push("Posizionamento antifascista incompatibile con il partito selezionato");
  }
  return flags;
}

export function computePersonalImpactScore(opts: {
  notoriety: number;
  mediaExposure: number;
  personalBrand: number;
  communication?: number;
  isPublicFigure: boolean;
}): number {
  if (!opts.isPublicFigure) {
    return clamp(opts.notoriety * 0.5 + opts.mediaExposure * 0.2, 5, 25);
  }
  return clamp(
    opts.notoriety * 0.4 +
      opts.mediaExposure * 0.25 +
      opts.personalBrand * 0.25 +
      (opts.communication ?? 50) * 0.1,
    0,
    100
  );
}

/**
 * Electoral Compatibility Score (0–100), moltiplicativo.
 * Può essere 0. La notorietà NON entra in questa formula.
 */
export function computeElectoralCompatibility(opts: {
  party: PartyDefinition;
  partySlug: string;
  figure?: PublicFigureProfile;
  description?: string;
  program?: string;
  /** Se noto a priori (KB) */
  ideologyHint?: number;
}): CompatibilityBreakdown {
  const texts = collectText(opts.figure, opts.description, opts.program);
  const inferred =
    opts.ideologyHint ??
    opts.figure?.ideologyHint ??
    inferIdeologyAxis(texts);

  const gap = Math.abs(inferred - opts.party.ideologyScore);
  const redFlags = detectRedFlags({
    texts,
    party: opts.party,
    ideologyGap: gap,
    defaultPartySlug: opts.figure?.defaultPartySlug,
    partySlug: opts.partySlug,
  });

  const categoricalRejection = redFlags.some((f) =>
    /totalitari|nazifasc/i.test(f)
  );

  let ideological = ideologyDistanceToCompat(gap);
  let historical = 1;
  let acceptance = 1;

  // Coerenza storica con partiti associati / default party
  const associated = [
    ...(opts.figure?.associatedParties ?? []),
    ...(opts.figure?.partyHistory ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (opts.figure?.defaultPartySlug === opts.partySlug) {
    historical = 1;
  } else if (opts.figure?.defaultPartySlug) {
    // Partito "naturale" diverso (democratico vs democratico: basso ma non zero)
    historical = gap >= 0.85 ? 0.12 : gap >= 0.65 ? 0.28 : gap >= 0.45 ? 0.45 : 0.65;
  }

  if (associated) {
    const partyName = opts.party.name.toLowerCase();
    const short = opts.party.shortName.toLowerCase();
    if (associated.includes(partyName) || associated.includes(short)) {
      historical = Math.max(historical, 0.9);
    } else if (
      /nazionalsocial|fascist|nsdap|partito nazionale fascista/.test(associated) &&
      opts.partySlug !== "italexit"
    ) {
      historical = 0;
    }
  }

  // Accettazione base: crolla con gap + scandal/polarization percepita
  const polar = opts.figure?.polarizationScore ?? opts.figure?.inferredScores?.polarization ?? 50;
  const scandal = opts.figure?.inferredScores?.scandalRisk ?? 30;
  acceptance = clamp(1 - gap * 0.55 - (polar / 100) * 0.15 - (scandal / 100) * 0.1, 0, 1);

  // Red flags moltiplicativi (il rifiuto categorico azzera tutto)
  if (categoricalRejection) {
    ideological = 0;
    historical = 0;
    acceptance = 0;
  } else if (redFlags.length > 0) {
    const penalty = Math.pow(0.55, Math.min(redFlags.length, 3));
    ideological *= penalty;
    historical *= Math.sqrt(penalty);
    acceptance *= penalty;
  }

  // Prodotto non lineare — la notorietà NON entra qui
  let score = ideological * historical * acceptance * 100;
  if (categoricalRejection) {
    score = 0;
  } else {
    // Soft floor per incompatibilità democratiche (bassa, non necessariamente zero)
    const softFloor = gap >= 1.0 ? 5 : gap >= 0.7 ? 9 : gap >= 0.5 ? 14 : 0;
    score = clamp(Math.max(score, softFloor), 0, 98);
  }

  // Match partito naturale → boost (dopo i flag; non salva un nazista)
  if (!categoricalRejection && opts.figure?.defaultPartySlug === opts.partySlug) {
    score = Math.max(score, 88);
    ideological = Math.max(ideological, 0.9);
    historical = 1;
    acceptance = Math.max(acceptance, 0.9);
  }

  const notes: string[] = [
    `Ideologia inferita: ${inferred.toFixed(2)} (partito: ${opts.party.ideologyScore.toFixed(2)}, gap ${gap.toFixed(2)}).`,
    `Compatibilità ideologica × storia × accettazione = ${(ideological * 100).toFixed(0)}% × ${(historical * 100).toFixed(0)}% × ${(acceptance * 100).toFixed(0)}%.`,
    ...redFlags.map((f) => `Red flag: ${f}`),
  ];

  const personalImpact = computePersonalImpactScore({
    notoriety: opts.figure?.notorietyScore ?? opts.figure?.publicRecognition ?? 15,
    mediaExposure: opts.figure?.mediaExposureScore ?? opts.figure?.mediaExposure ?? 10,
    personalBrand: opts.figure?.personalBrandScore ?? 15,
    communication: opts.figure?.inferredScores?.communication,
    isPublicFigure: Boolean(opts.figure?.publicFigure),
  });

  return {
    personalImpactScore: Math.round(personalImpact),
    electoralCompatibilityScore: Math.round(score * 10) / 10,
    ideologicalCompatibility: ideological,
    historicalCoherence: historical,
    electorateAcceptance: acceptance,
    redFlags,
    inferredIdeology: inferred,
    categoricalRejection,
    notes,
  };
}
