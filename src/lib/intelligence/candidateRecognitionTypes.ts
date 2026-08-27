/**
 * Tipi legacy KnowledgeRecord — mantenuti per seed/compatibilità.
 */
import type { RecognizedCandidate, PublicFigureCategory } from "@/types/intelligence";

export interface KnowledgeRecord {
  firstName: string;
  lastName: string;
  aliases?: string[];
  category: PublicFigureCategory;
  biography: string;
  career: string;
  sources: { title: string; url?: string; type: string }[];
  notoriety: number;
  mediaExposure: number;
  perceivedLeadership: number;
  defaultPartySlug?: string;
  ideologyHint?: number;
  electoralImpact: RecognizedCandidate["electoralImpact"];
  controversyNotes: RecognizedCandidate["controversyNotes"];
  profileDefaults: {
    credibility: number;
    experience: number;
    competence: number;
    leadership: number;
    communication: number;
    popularity: number;
    scandalRisk: number;
    mediaConsensus: number;
    socialConsensus: number;
    undecidedAppeal: number;
    mobilization: number;
  };
}

/** @deprecated usare CURATED_PUBLIC_FIGURES */
export const PUBLIC_KNOWLEDGE: KnowledgeRecord[] = [];
