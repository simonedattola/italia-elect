/**
 * Segnali da descrizione e programma inseriti dall'utente.
 * Influenzano compatibilità e dimensioni del profilo nel motore.
 */
import type { CandidateProfile } from "@/types/simulation";
import type { PartyDefinition } from "@/types/simulation";
import { clamp } from "@/lib/utils";
import { computeElectoralCompatibility } from "./electoralCompatibility";
import type { PublicFigureProfile } from "@/lib/intelligence/publicFigure/types";

const LEFT_RE =
  /sinistra|progressist|egualitar|ambiental|lgbt|femminis|redistribuz|welfare|antifasc|lavoratori|sindacal|accoglienza|europeist|proeurop|europro|democratico/i;
const PROGRESSIVE_LEFT_RE =
  /diritti|libert[aà]|europa|europea|europei|democratica|democratici|clima|climatico|giovani|scuola|ricerca|innovazione|opportunit|generazione|inclusione|sostenib|green|parit[aà]|uguaglianza|moderna|giusta/i;
const RIGHT_RE =
  /conservator|sovranist|patriott|sicurezza|tradizion|famiglia|immigrazion|ordine|nazione|identit|flat tax|destra|nazionalist/i;
const CENTER_RE = /liberale|moderato|centrist|riformist|tecnocrat/i;
const SCANDAL_RE =
  /corruzion|inchiesta|condannat|scandal|indagat|processo|mazzette|tangent/i;
const COMM_PLUS_RE =
  /carismatic|communicativ|orator|tiktok|influencer|social media|televisione/i;
const COMM_MINUS_RE = /tecnico|burocratic|silenzios|introvert/i;
const PROGRAM_RE =
  /programma|piano|riforma|legge|decreto|manifesto|agenda|punti programmatici/i;
const MOBILIZE_RE =
  /mobilita|in piazza|raduno|movimento|gente|popolo|rivoluzione|risorgimento/i;
const EXPERIENCE_RE =
  /ministro|sindaco|parlament|europarlament|generale|manager|ceo|imprenditor/i;

export function textDepth(description: string, program?: string): number {
  const len = description.length + (program?.length ?? 0);
  if (len < 40) return 20;
  if (len < 80) return 35;
  if (len < 200) return 52;
  if (len < 500) return 68;
  return 82;
}

export function inferTextIdeology(blob: string): number {
  let score = 0;
  let hits = 0;
  if (LEFT_RE.test(blob)) {
    score -= 0.55;
    hits++;
  }
  const progressiveHits = blob.match(new RegExp(PROGRESSIVE_LEFT_RE.source, "gi"))?.length ?? 0;
  if (progressiveHits >= 4) {
    score -= 0.42;
    hits++;
  } else if (progressiveHits >= 2) {
    score -= 0.32;
    hits++;
  } else if (progressiveHits >= 1) {
    score -= 0.22;
    hits++;
  }
  if (RIGHT_RE.test(blob)) {
    score += 0.55;
    hits++;
  }
  if (CENTER_RE.test(blob)) {
    score += 0.08;
    hits++;
  }
  if (!hits) return 0;
  return clamp(score / hits, -1, 1);
}

/** Testo utente con segnale ideologico affidabile (non generico/vuoto). */
export function hasReliableTextIdeology(signals: TextSignalAnalysis): boolean {
  return signals.depth >= 50 || Math.abs(signals.ideology) > 0.08;
}

export interface TextSignalAnalysis {
  depth: number;
  ideology: number;
  ideologyGap: number;
  textWeight: number;
  scandalDelta: number;
  communicationDelta: number;
  competenceDelta: number;
  credibilityDelta: number;
  leadershipDelta: number;
  mobilizationDelta: number;
  undecidedDelta: number;
  popularityDelta: number;
}

export function analyzeCandidateText(
  description: string,
  party: PartyDefinition,
  program?: string,
): TextSignalAnalysis {
  const blob = `${description} ${program ?? ""}`.toLowerCase();
  const depth = textDepth(description, program);
  const ideology = inferTextIdeology(blob);
  const ideologyGap = Math.abs(ideology - party.ideologyScore);
  const textWeight = clamp((depth - 10) / 90, 0.22, 0.62);

  let scandalDelta = 0;
  if (SCANDAL_RE.test(blob)) scandalDelta += 22;

  let communicationDelta = 0;
  if (COMM_PLUS_RE.test(blob)) communicationDelta += 14;
  if (COMM_MINUS_RE.test(blob)) communicationDelta -= 10;

  let competenceDelta = 0;
  if (program && program.length > 80) competenceDelta += 10;
  if (PROGRAM_RE.test(blob)) competenceDelta += 8;

  let credibilityDelta = depth > 55 ? 8 : depth > 30 ? 4 : 0;
  const leadershipDelta = EXPERIENCE_RE.test(blob) ? 10 : 0;
  let mobilizationDelta = MOBILIZE_RE.test(blob) ? 12 : 0;
  let undecidedDelta = depth > 45 ? 6 : 0;
  const popularityDelta = COMM_PLUS_RE.test(blob) ? 6 : 0;

  // Coerenza ideologica esplicita nel testo
  if (ideologyGap < 0.25 && depth > 35) {
    undecidedDelta += 8;
    mobilizationDelta += 6;
    credibilityDelta += 5;
  } else if (ideologyGap > 0.55 && depth > 35) {
    credibilityDelta -= 12;
    mobilizationDelta -= 8;
    undecidedDelta -= 10;
  }

  return {
    depth,
    ideology,
    ideologyGap,
    textWeight,
    scandalDelta,
    communicationDelta,
    competenceDelta,
    credibilityDelta,
    leadershipDelta,
    mobilizationDelta,
    undecidedDelta,
    popularityDelta,
  };
}

export function blendCompatibilityWithUserText(opts: {
  baseCompatibility: number;
  textCompatibility: number;
  signals: TextSignalAnalysis;
  naturalLeader: boolean;
}): number {
  const { baseCompatibility, textCompatibility, signals, naturalLeader } = opts;
  const w = signals.textWeight;
  let blended = baseCompatibility * (1 - w) + textCompatibility * w;
  const reliableIdeology = hasReliableTextIdeology(signals);

  if (reliableIdeology && signals.depth > 25 && signals.ideologyGap > 0.45) {
    const penalty = signals.ideologyGap * 38 * w;
    blended -= penalty;
    if (naturalLeader && signals.ideologyGap > 0.6) {
      blended = Math.min(blended, baseCompatibility * 0.72);
    }
  }

  if (reliableIdeology && signals.depth > 40 && signals.ideologyGap < 0.22) {
    blended += (1 - signals.ideologyGap) * 14 * w;
  }

  if (naturalLeader && signals.ideologyGap < 0.25 && signals.depth > 30) {
    blended = Math.max(blended, Math.min(96, baseCompatibility + 4));
  }

  return clamp(Math.round(blended * 10) / 10, 0, 98);
}

/** Moltiplicatore 0.2–1.15 da descrizione utente vs ideologia partito (agenti / sfida). */
export function descriptionElectoralModifier(
  description: string,
  party: PartyDefinition,
  program?: string,
): number {
  if (!description.trim() || description.trim().length < 15) return 1;
  const signals = analyzeCandidateText(description, party, program);
  const align = 1 - signals.ideologyGap;
  return clamp(
    0.35 + align * 0.55 + (signals.depth / 100) * 0.22,
    0.2,
    1.15,
  );
}

export function applyTextSignalsToProfile(
  profile: CandidateProfile,
  signals: TextSignalAnalysis,
): CandidateProfile {
  if (signals.depth < 25) return profile;

  const w = signals.textWeight;
  const scale = (delta: number) => delta * w;

  return {
    ...profile,
    credibility: clamp(profile.credibility + scale(signals.credibilityDelta), 5, 95),
    competence: clamp(profile.competence + scale(signals.competenceDelta), 5, 95),
    leadership: clamp(profile.leadership + scale(signals.leadershipDelta), 5, 95),
    communication: clamp(profile.communication + scale(signals.communicationDelta), 5, 95),
    popularity: clamp(profile.popularity + scale(signals.popularityDelta), 5, 95),
    scandalRisk: clamp(profile.scandalRisk + scale(signals.scandalDelta), 0, 98),
    undecidedAppeal: clamp(
      profile.undecidedAppeal + scale(signals.undecidedDelta),
      0,
      90,
    ),
    mobilization: clamp(profile.mobilization + scale(signals.mobilizationDelta), 0, 95),
    evidenceNotes: [
      ...profile.evidenceNotes,
      `Testo utente (${signals.depth}% profondità, peso ${(w * 100).toFixed(0)}%): ideologia inferita ${signals.ideology.toFixed(2)} vs partito ${signals.ideologyGap.toFixed(2)} gap.`,
    ],
  };
}

/** Applica descrizione/programma al profilo (compatibilità + dimensioni). */
export function enrichProfileWithCandidateText(
  profile: CandidateProfile,
  input: { description: string; program?: string; partySlug: string },
  party: PartyDefinition,
  figure?: PublicFigureProfile,
): CandidateProfile & { partyCompatibility: number } {
  const signals = analyzeCandidateText(input.description, party, input.program);
  const reliableIdeology = hasReliableTextIdeology(signals);
  const manifestoOnly = reliableIdeology && signals.depth >= 50;
  const textCompat = computeElectoralCompatibility({
    party,
    partySlug: input.partySlug,
    figure: manifestoOnly ? undefined : figure?.publicFigure ? figure : undefined,
    description: input.description,
    program: input.program,
    ideologyHint: reliableIdeology ? signals.ideology : figure?.ideologyHint,
  });

  const naturalLeader = figure?.defaultPartySlug === input.partySlug;
  if (naturalLeader && signals.depth < 32) {
    signals.textWeight *= 0.45;
  } else if (naturalLeader && signals.depth >= 45) {
    signals.textWeight = Math.min(signals.textWeight * 1.2, 0.78);
  }
  if (manifestoOnly && signals.ideologyGap > 0.35) {
    signals.textWeight = Math.min(0.88, signals.textWeight + 0.18);
  }

  let compatibility = blendCompatibilityWithUserText({
    baseCompatibility: profile.partyCompatibility,
    textCompatibility: textCompat.electoralCompatibilityScore,
    signals,
    naturalLeader,
  });

  if (
    manifestoOnly &&
    naturalLeader &&
    signals.ideologyGap > 0.35 &&
    textCompat.electoralCompatibilityScore < profile.partyCompatibility - 8
  ) {
    compatibility = Math.min(
      compatibility,
      Math.round(textCompat.electoralCompatibilityScore * 0.92 + profile.partyCompatibility * 0.04),
    );
  }

  let enriched = applyTextSignalsToProfile(
    { ...profile, partyCompatibility: compatibility },
    signals,
  );

  // Ricalcola appeal legati alla compatibilità aggiornata
  const compatRatio = compatibility / 100;
  enriched = {
    ...enriched,
    partyCompatibility: compatibility,
    undecidedAppeal: clamp(enriched.undecidedAppeal * (0.65 + compatRatio * 0.45), 0, 90),
    mobilization: clamp(enriched.mobilization * (0.6 + compatRatio * 0.5), 0, 95),
    socialConsensus: clamp(
      enriched.socialConsensus + scaleSocial(signals, compatRatio),
      0,
      95,
    ),
  };

  return enriched;
}

function scaleSocial(signals: TextSignalAnalysis, compatRatio: number): number {
  if (signals.ideologyGap < 0.3) return 6 * signals.textWeight * compatRatio;
  if (signals.ideologyGap > 0.55) return -10 * signals.textWeight;
  return 0;
}
