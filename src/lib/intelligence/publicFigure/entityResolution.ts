/**
 * Entity Resolution — scoring omonimi e confidenza.
 */

import type { RoleCategory } from "./types";
import { CONFIDENCE_AUTO_THRESHOLD } from "./types";

export interface ResolutionSignals {
  label: string;
  description: string;
  firstName: string;
  lastName: string;
  isItalian: boolean;
  isPoliticianLike: boolean;
  isEntrepreneur: boolean;
  isMedia: boolean;
  hasItWiki: boolean;
  partyLabels: string[];
  occupations: string[];
  positions: string[];
  userPartySlug?: string;
  userDescription?: string;
  /** Bonus se ID confermato dall'utente */
  confirmed?: boolean;
}

const PARTY_KEYWORDS: Record<string, string[]> = {
  "fratelli-ditalia": ["fratelli d'italia", "fdi", "alleanza nazionale"],
  "lega": ["lega", "lega nord", "lega per salvini"],
  "forza-italia": ["forza italia", "pdl", "popolo della libertà"],
  "partito-democratico": ["partito democratico", "pd", "democratici"],
  "movimento-5-stelle": ["movimento 5 stelle", "m5s", "cinque stelle"],
  "azione-iv": ["azione", "italia viva", "calenda", "renzi"],
  "avanti": ["avanti", "+europa", "radicali"],
  "sinistra-italiana-verdi": ["sinistra italiana", "verdi", "avs", "alliance"],
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameMatchScore(
  label: string,
  firstName: string,
  lastName: string
): number {
  const L = norm(label);
  const full = norm(`${firstName} ${lastName}`);
  const rev = norm(`${lastName} ${firstName}`);
  if (L === full || L === rev) return 40;
  if (L.startsWith(full + " ") || L.endsWith(" " + full)) return 34;
  const parts = L.split(" ");
  const fn = norm(firstName);
  const ln = norm(lastName);
  if (parts.includes(fn) && parts.includes(ln)) return 28;
  if (parts.includes(ln) && L.includes(fn.slice(0, 3))) return 18;
  return 0;
}

export function inferRoleCategory(signals: {
  isPoliticianLike: boolean;
  isEntrepreneur: boolean;
  isMedia: boolean;
  isLocalHint?: boolean;
  description: string;
}): RoleCategory {
  if (signals.isPoliticianLike) return "politician";
  if (signals.isEntrepreneur) return "entrepreneur";
  if (signals.isMedia) return "media";
  if (
    signals.isLocalHint ||
    /sindac|consigliere|assessore|regionale|provinciale/i.test(signals.description)
  ) {
    return "local_public_figure";
  }
  if (/politic|imprenditor|giornalist|conduttor|attore|cantant/i.test(signals.description)) {
    return "other";
  }
  return "other";
}

/**
 * Confidenza 0–100. Sotto CONFIDENCE_AUTO_THRESHOLD → conferma utente.
 */
export function scoreEntityConfidence(s: ResolutionSignals): number {
  if (s.confirmed) return 98;

  let score = nameMatchScore(s.label, s.firstName, s.lastName);
  if (score === 0) return 0;

  if (s.isItalian) score += 18;
  if (s.hasItWiki) score += 10;
  if (s.isPoliticianLike) score += 14;
  else if (s.isEntrepreneur || s.isMedia) score += 10;

  if (s.positions.length > 0) score += Math.min(8, s.positions.length * 2);
  if (s.occupations.length > 0) score += 4;

  // Allineamento partito utente ↔ partiti associati
  if (s.userPartySlug) {
    const keys = PARTY_KEYWORDS[s.userPartySlug] ?? [];
    const blob = norm(
      [...s.partyLabels, s.description, ...s.occupations].join(" ")
    );
    if (keys.some((k) => blob.includes(norm(k)))) score += 12;
  }

  // Descrizione utente
  if (s.userDescription && s.userDescription.length > 20) {
    const ud = norm(s.userDescription);
    const tokens = [
      ...s.partyLabels.map(norm),
      ...s.positions.map(norm),
      ...norm(s.description).split(" ").filter((t) => t.length > 5),
    ];
    let hits = 0;
    for (const t of tokens) {
      if (t.length > 4 && ud.includes(t)) hits++;
    }
    score += Math.min(10, hits * 2);
  }

  // Penalità: persona trovata ma settore lontano dalla politica (sim elettorale)
  if (
    !s.isPoliticianLike &&
    !s.isEntrepreneur &&
    !s.isMedia &&
    /criminal|assass|omicid|rapin/i.test(s.description)
  ) {
    score -= 8;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function shouldAutoAssign(
  confidence: number,
  threshold = CONFIDENCE_AUTO_THRESHOLD
): boolean {
  return confidence >= threshold;
}

export function confirmationPromptFor(
  options: { label: string; description: string; confidence: number }[]
): string {
  if (!options.length) {
    return "Non è stato possibile identificare con certezza questa persona. Vuoi procedere come candidato sconosciuto?";
  }
  const top = options[0];
  return `Intendi questa persona? «${top.label}» — ${top.description || "senza descrizione"} (confidenza ${top.confidence}%).`;
}

/** Figura pubblica elettoralmente rilevante */
export function isElectoralPublicFigure(
  role: RoleCategory,
  confidence: number,
  autoAssigned: boolean
): boolean {
  if (!autoAssigned) return false;
  if (confidence < CONFIDENCE_AUTO_THRESHOLD) return false;
  return (
    role === "politician" ||
    role === "entrepreneur" ||
    role === "media" ||
    role === "local_public_figure"
  );
}
