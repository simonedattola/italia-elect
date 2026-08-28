/**
 * Analisi programma elettorale — NLP rule-based (italiano).
 */
import { analyzeCandidateText, inferTextIdeology } from "@/lib/intelligence/candidateTextSignals";
import type { PartyDefinition } from "@/types/simulation";
import { clamp } from "@/lib/utils";

export interface ProgramProfile {
  ideology: number;
  themes: string[];
  credibility: number;
  coherence: number;
  impactScore: number;
  summary: string;
}

const THEME_PATTERNS: Array<{ id: string; label: string; re: RegExp }> = [
  { id: "economy", label: "Economia", re: /econom|lavoro|imprese|tasse|fisc|reddito|pension/i },
  { id: "security", label: "Sicurezza", re: /sicurezz|ordine|criminal|forze dell.?ordine|difesa/i },
  { id: "environment", label: "Ambiente", re: /ambient|clima|green|energia|rinnovabil|sostenib/i },
  { id: "health", label: "Sanità", re: /sanit|ospedal|medici|salute/i },
  { id: "education", label: "Istruzione", re: /scuola|universit|ricerca|istruzione/i },
  { id: "europe", label: "Europa", re: /europ|ue\b|bruxelles|europarlament/i },
  { id: "immigration", label: "Immigrazione", re: /immigraz|accoglienza|frontier|ius soli/i },
  { id: "rights", label: "Diritti", re: /diritt|libert|civili|parità|uguaglianza/i },
];

export class ProgramAnalyzer {
  analyze(text: string, party?: PartyDefinition): ProgramProfile {
    const blob = text.trim();
    const ideology = inferTextIdeology(blob.toLowerCase());
    const themes = THEME_PATTERNS.filter((t) => t.re.test(blob)).map((t) => t.label);

    let credibility = 50;
    if (blob.length > 120) credibility += 12;
    if (blob.length > 400) credibility += 8;
    if (/decreto|legge|riforma|piano|miliard|percento|\d+%/i.test(blob)) credibility += 10;
    if (/gratis per tutti|abolire tutto|in 30 giorni/i.test(blob)) credibility -= 15;

    let coherence = 55;
    if (party) {
      const signals = analyzeCandidateText(blob, party);
      coherence = clamp(100 - signals.ideologyGap * 85, 15, 95);
    }

    const impactScore = clamp(
      (credibility / 100) * 0.35 + (coherence / 100) * 0.35 + themes.length * 0.05 + 0.15,
      0.1,
      0.95,
    );

    const summary =
      themes.length > 0
        ? `Temi: ${themes.slice(0, 4).join(", ")}. Ideologia inferita ${ideology.toFixed(2)}.`
        : `Programma breve. Ideologia inferita ${ideology.toFixed(2)}.`;

    return {
      ideology,
      themes,
      credibility: clamp(credibility, 10, 95),
      coherence,
      impactScore,
      summary,
    };
  }
}

export const programAnalyzer = new ProgramAnalyzer();
