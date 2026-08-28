/**
 * Analisi unificata descrizione + programma elettorale (cuore del gioco).
 */
import {
  analyzeCandidateText,
  hasReliableTextIdeology,
  inferTextIdeology,
} from "@/lib/intelligence/candidateTextSignals";
import type { PartyDefinition } from "@/types/simulation";
import { clamp } from "@/lib/utils";

export interface CampaignTextAnalysis {
  ideology: number;
  themes: string[];
  credibility: number;
  coherence: number;
  impactScore: number;
  textSwingPts: number;
  depth: number;
  summary: string;
  hasReliableIdeology: boolean;
}

const THEME_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "Economia", re: /econom|lavoro|imprese|tasse|fisc|reddito|pension|flat tax/i },
  { label: "Sicurezza", re: /sicurezz|ordine|criminal|forze dell.?ordine|difesa|confine/i },
  { label: "Ambiente", re: /ambient|clima|green|energia|rinnovabil|sostenib|ecologic/i },
  { label: "Sanità", re: /sanit|ospedal|medici|salute|ssn/i },
  { label: "Istruzione", re: /scuola|universit|ricerca|istruzione|merito/i },
  { label: "Europa", re: /europ|ue\b|bruxelles|europarlament|eurozona/i },
  { label: "Immigrazione", re: /immigraz|accoglienza|frontier|ius soli|espuls/i },
  { label: "Diritti", re: /diritt|libert|civili|parità|uguaglianza|lgbt/i },
  { label: "Welfare", re: /welfare|assistenz|reddito di cittadinanza|minimo vital/i },
  { label: "Sovranità", re: /sovran|patriott|nazion|identit|indipendenz/i },
];

function extractThemes(blob: string): string[] {
  return THEME_PATTERNS.filter((t) => t.re.test(blob)).map((t) => t.label);
}

function scoreCredibility(description: string, program: string): number {
  const blob = `${description} ${program}`.trim();
  let score = 42;
  if (description.length > 60) score += 10;
  if (program.length > 80) score += 12;
  if (program.length > 250) score += 8;
  if (/decreto|legge|riforma|piano|miliard|percento|\d+%/i.test(blob)) score += 12;
  if (/gratis per tutti|abolire tutto|in 30 giorni|zero tasse per tutti/i.test(blob)) score -= 18;
  if (/corruzion|inchiesta|condannat|scandal/i.test(blob)) score -= 15;
  return clamp(score, 12, 92);
}

function computeTextSwing(
  signals: ReturnType<typeof analyzeCandidateText>,
  coherence: number,
  credibility: number,
): number {
  if (signals.depth < 20) return 0;

  const w = Math.max(signals.textWeight, 0.35);
  let swing = 0;

  if (signals.ideologyGap < 0.2) {
    swing += (1 - signals.ideologyGap) * 5.5 * w;
    swing += (coherence / 100) * 2.5 * w;
  } else if (signals.ideologyGap > 0.28) {
    swing -= signals.ideologyGap * 10 * w;
    if (signals.depth >= 40) swing -= 2.8 * w;
  }

  swing += (credibility - 50) / 100 * 2.5 * w;
  swing += signals.mobilizationDelta / 100 * 1.8;
  swing -= signals.scandalDelta / 100 * 4;

  return clamp(swing, -14, 9);
}

export function analyzeCampaignText(
  description: string,
  program: string,
  party: PartyDefinition,
): CampaignTextAnalysis {
  const desc = description.trim();
  const prog = program.trim();
  const combined = `${desc}\n${prog}`.trim();
  const signals = analyzeCandidateText(desc, party, prog);

  const descIdeo = desc.length > 15 ? inferTextIdeology(desc.toLowerCase()) : 0;
  const progIdeo = prog.length > 15 ? inferTextIdeology(prog.toLowerCase()) : 0;
  const ideology =
    prog.length > 40
      ? progIdeo * 0.65 + descIdeo * 0.35
      : prog.length > 15
        ? progIdeo * 0.5 + descIdeo * 0.5
        : descIdeo || signals.ideology;

  const themes = extractThemes(combined);
  const credibility = scoreCredibility(desc, prog);
  let coherence =
    combined.length > 20
      ? clamp(100 - signals.ideologyGap * 88, 12, 96)
      : 50;

  if (desc.length > 30 && prog.length > 50) {
    const descProgGap = Math.abs(descIdeo - progIdeo);
    if (descProgGap > 0.35) {
      coherence = clamp(coherence - descProgGap * 35, 10, coherence);
    } else if (descProgGap < 0.15) {
      coherence = clamp(coherence + 8, coherence, 96);
    }
  }

  const impactScore = clamp(
    (credibility / 100) * 0.3 +
      (coherence / 100) * 0.32 +
      Math.min(themes.length, 6) * 0.06 +
      (signals.depth / 100) * 0.22 +
      0.08,
    0.12,
    0.96,
  );

  const textSwingPts = computeTextSwing(signals, coherence, credibility);
  const reliable = hasReliableTextIdeology(signals) || prog.length > 50;

  const summaryParts: string[] = [];
  if (themes.length) summaryParts.push(`Temi: ${themes.slice(0, 5).join(", ")}`);
  if (reliable) summaryParts.push(`Posizione ${ideology.toFixed(2)}`);
  if (signals.ideologyGap < 0.22 && signals.depth > 35) {
    summaryParts.push("Coerente con il partito");
  } else if (signals.ideologyGap > 0.45 && signals.depth > 35) {
    summaryParts.push("Tensione ideologica col partito");
  }
  if (desc.length > 30 && prog.length > 50) {
    const descProgGap = Math.abs(descIdeo - progIdeo);
    if (descProgGap > 0.35) {
      summaryParts.push("Tensione tra descrizione e programma");
    }
  }
  if (textSwingPts > 1) summaryParts.push(`boost testuale +${textSwingPts.toFixed(1)}pp`);
  else if (textSwingPts < -1) summaryParts.push(`penalità testuale ${textSwingPts.toFixed(1)}pp`);

  return {
    ideology: clamp(ideology, -1, 1),
    themes,
    credibility,
    coherence,
    impactScore,
    textSwingPts,
    depth: signals.depth,
    summary: summaryParts.length ? summaryParts.join(" · ") : "Testo breve o assente.",
    hasReliableIdeology: reliable,
  };
}
