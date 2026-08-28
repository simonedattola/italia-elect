/**
 * Facade unificata per dati operativi (sondaggi, elezioni, economia, social).
 * Tutte le pipeline UI/simulazione devono preferire questa classe.
 */
import { computeEconomicSentiment, EMBEDDED_ECONOMY } from "@/lib/intelligence/economicModel";
import { analyzeEvents } from "@/lib/intelligence/newsAnalysis";
import {
  computeCompositeBaseline,
  computeStructuralElectionBlend,
  aggregatePollsLast30Days,
} from "./BaselineComposita";
import type {
  BaselineSnapshot,
  EconomyData,
  PollData,
  ElectionData,
  SocialUsageData,
} from "./types";

/** Penetrazione social per fascia (AGCOM 2024 — proxy). */
const AGCOM_USAGE: SocialUsageData["byAgeBand"] = {
  "18-24": { x: 0.25, facebook: 0.4, instagram: 0.7, tiktok: 0.6, reddit: 0.15 },
  "25-34": { x: 0.35, facebook: 0.5, instagram: 0.65, tiktok: 0.45, reddit: 0.2 },
  "35-44": { x: 0.2, facebook: 0.55, instagram: 0.5, tiktok: 0.25, reddit: 0.1 },
  "45-54": { x: 0.1, facebook: 0.6, instagram: 0.35, tiktok: 0.1, reddit: 0.05 },
  "55-64": { x: 0.05, facebook: 0.55, instagram: 0.2, tiktok: 0.03, reddit: 0.02 },
  "65+": { x: 0.01, facebook: 0.3, instagram: 0.08, tiktok: 0, reddit: 0 },
};

export class RealTimeDataFetcher {
  async fetchISTAT(): Promise<EconomyData> {
    const economy = computeEconomicSentiment();
    return {
      index: economy.index,
      gdpGrowth: EMBEDDED_ECONOMY.gdpGrowth ?? 0.7,
      unemployment: EMBEDDED_ECONOMY.unemployment ?? 6.8,
      inflation: EMBEDDED_ECONOMY.inflation ?? 1.9,
      sources: economy.sources,
      asOf: EMBEDDED_ECONOMY.asOf,
    };
  }

  async fetchSondaggi(windowDays = 30): Promise<PollData> {
    const polls = aggregatePollsLast30Days();
    return {
      shares: polls.shares,
      institutes: polls.institutes,
      asOf: polls.asOf,
      sources: polls.sources,
      windowDays,
    };
  }

  async fetchEligendo(): Promise<ElectionData> {
    return computeStructuralElectionBlend();
  }

  async fetchSocial(): Promise<SocialUsageData> {
    return {
      byAgeBand: AGCOM_USAGE,
      sources: ["AGCOM 2024 (penetrazione per fascia d'età)"],
    };
  }

  async fetchBaseline(): Promise<BaselineSnapshot> {
    return computeCompositeBaseline();
  }

  async fetchEventsSummary(): Promise<{ netPartyShocks: Record<string, number>; sources: string[] }> {
    const events = analyzeEvents();
    return { netPartyShocks: events.netPartyShocks, sources: events.sources };
  }
}

export const realtimeDataFetcher = new RealTimeDataFetcher();
