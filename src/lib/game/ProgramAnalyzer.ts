/**
 * Analisi programma elettorale — delega all'analisi campagna unificata.
 */
import { analyzeCampaignText, type CampaignTextAnalysis } from "./CampaignTextAnalyzer";
import type { PartyDefinition } from "@/types/simulation";

import { getPartyOrThrow } from "@/lib/electoral/parties";

export type ProgramProfile = CampaignTextAnalysis & { summary: string };

export class ProgramAnalyzer {
  analyze(text: string, party?: PartyDefinition, description = ""): ProgramProfile {
    const partyDef = party ?? getPartyOrThrow("partito-democratico");
    const result = analyzeCampaignText(description, text, partyDef);
    return { ...result, summary: result.summary };
  }
}

export const programAnalyzer = new ProgramAnalyzer();
