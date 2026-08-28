/**
 * Context Intelligence & Weighting Engine (Fase 2).
 * Heuristic dynamic weights by scenario + territory. ML replacement planned for Fase 4.
 */

import { getBaseline, listAvailableYears } from "../harvester/baseline";
import { readBes } from "../harvester/istat";
import { getPollsNear } from "../harvester/polls";
import type { NormalizedBesIndicator, NormalizedPoll } from "../harvester/types";
import { FACTORS as WEIGHT_FACTOR_SPECS, FACTOR_COUNT } from "../weights/factorRegistry";
import { FACTORS as LEGACY_FACTORS } from "./factorRegistry";
import { loadLatestSnapshot, collectFactors } from "../weights/factorCollector";
import {
  computeAggregatedWeights,
} from "../weights/dynamicWeights";
import { scenarioFromLegacy } from "../weights/categoryConfig";
import {
  normalizeConsumptionGrowth,
  normalizeGDP,
  normalizeIncomeIndex,
  normalizeInflation,
  normalizeInvestmentScore,
  normalizeUnemployment,
} from "./normalizers/economy";
import {
  normalizeHistoricalShare,
  normalizeSwing,
} from "./normalizers/historical";
import { normalizeCoverage, normalizeNewsTone } from "./normalizers/news";
import {
  normalizePollShare,
  weightedAveragePollShare,
} from "./normalizers/polls";
import { normalizeSentiment, normalizeVolume } from "./normalizers/social";
import type {
  ContextBundle,
  ContextDataBundle,
  FactorDefinition,
  GeoLevel,
  NewsSnapshot,
  ScenarioType,
  SocialSnapshot,
  TrendDirection,
  WeightedFactors,
} from "./types";

/** Alias partito → slug Italia Elect */
const PARTY_SLUGS: Record<string, string> = {
  pd: "partito-democratico",
  "partito-democratico": "partito-democratico",
  fdi: "fratelli-ditalia",
  "fratelli-ditalia": "fratelli-ditalia",
  m5s: "movimento-5-stelle",
  "movimento-5-stelle": "movimento-5-stelle",
  lega: "lega",
  fi: "forza-italia",
  "forza-italia": "forza-italia",
  av: "azione-iv",
  "azione-iv": "azione-iv",
  azione: "azione-iv",
};

function partySlug(input: string): string {
  const key = input.trim().toLowerCase();
  return PARTY_SLUGS[key] ?? key;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function trendFromDelta(delta: number, eps = 0.02): TrendDirection {
  if (delta > eps) return "up";
  if (delta < -eps) return "down";
  return "stable";
}

/**
 * Compatibility shim for Prompt 2 (`getISTATData`).
 * Uses Fase 1 `readBes` with empty → soft national-ish fallbacks embedded in populate.
 */
export async function getISTATData(
  geoCode: string,
): Promise<NormalizedBesIndicator[]> {
  return readBes(geoCode);
}

export class WeightsEngine {
  static VERSION = "2.0.0-145factors";

  /**
   * Calcola i pesi dinamici (145 fattori) per territorio e scenario.
   */
  async computeWeights(
    geoCode: string,
    timestamp: Date,
    candidateParty: string,
    scenarioType: string = "stability",
    customOverrides?: Record<string, number>,
    opts?: { renormalizeToUnitSum?: boolean },
  ): Promise<WeightedFactors[]> {
    const party = partySlug(candidateParty);
    const scenario = scenarioFromLegacy(scenarioType);
    let snapshot = await loadLatestSnapshot();
    if (!snapshot) {
      snapshot = await collectFactors();
    }

    const dynamicAgg = computeAggregatedWeights(snapshot, scenario);
    const data = await this.loadContextData(geoCode, timestamp, party);
    const populatedFactors = this.populateFactors(
      LEGACY_FACTORS,
      data,
      party,
    );

    let weightedFactors = this.calculateWeights(
      populatedFactors,
      scenarioType,
      party,
      data.historicalShares,
      dynamicAgg,
    );

    if (opts?.renormalizeToUnitSum) {
      const totalWeight = weightedFactors.reduce((sum, f) => sum + f.weight, 0);
      if (totalWeight > 0) {
        weightedFactors = weightedFactors.map((f) => {
          const weight = f.weight / totalWeight;
          return { ...f, weight, weightedScore: f.rawValue * weight };
        });
      }
    }

    if (customOverrides) {
      weightedFactors = weightedFactors.map((f) => {
        if (customOverrides[f.factorId] === undefined) return f;
        const weight = clamp01(customOverrides[f.factorId]!);
        return {
          ...f,
          weight,
          weightedScore: f.rawValue * weight,
        };
      });
    }

    return weightedFactors;
  }

  /**
   * Aggregato per categoria con formula dinamica su 145 fattori.
   */
  async computeAggregated(
    scenarioType: string = "stability",
  ): Promise<ReturnType<typeof computeAggregatedWeights>> {
    const scenario = scenarioFromLegacy(scenarioType);
    let snapshot = await loadLatestSnapshot();
    if (!snapshot) snapshot = await collectFactors();
    return computeAggregatedWeights(snapshot, scenario);
  }

  getFactorCount(): number {
    return FACTOR_COUNT;
  }

  /**
   * Build a full ContextBundle (factors + metadata) for UI / downstream phases.
   */
  async buildContextBundle(
    geoCode: string,
    timestamp: Date,
    candidateParty: string,
    scenarioType: ScenarioType = "stability",
    customOverrides?: Record<string, number>,
    geoLevel: GeoLevel = "comunale",
  ): Promise<ContextBundle> {
    const weights = await this.computeWeights(
      geoCode,
      timestamp,
      candidateParty,
      scenarioType,
      customOverrides,
    );
    const byId = new Map(weights.map((w) => [w.factorId, w]));
    const factors: FactorDefinition[] = WEIGHT_FACTOR_SPECS.map((spec) => {
      const w = byId.get(spec.id);
      return {
        id: spec.id,
        name: spec.name,
        category: spec.category as FactorDefinition["category"],
        source: spec.source,
        description: spec.description,
        rawValue: w?.rawValue ?? 0.5,
        weight: w?.weight ?? 0,
        confidence: 0.65,
        trend: "stable" as TrendDirection,
        trendMagnitude: Math.abs(w?.rawValue ?? 0.5 - 0.5),
      };
    });

    const topFactors = [...factors]
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 5);

    const confidenceScore =
      factors.reduce((s, f) => s + f.confidence, 0) / Math.max(1, factors.length);

    return {
      timestamp,
      geoLevel,
      geoCode,
      factors,
      scenarioType,
      metadata: {
        modelVersion: WeightsEngine.VERSION,
        confidenceScore,
        topFactors,
      },
    };
  }

  /**
   * Scenario + confidence heuristic (pre-ML).
   */
  private calculateWeights(
    factors: FactorDefinition[],
    scenarioType: string,
    candidateParty: string,
    historicalData: Record<string, number>,
    dynamicAgg?: ReturnType<typeof computeAggregatedWeights>,
  ): WeightedFactors[] {
    void candidateParty;
    void historicalData;
    const result: WeightedFactors[] = [];

    const catBoost = (cat: string): number => {
      if (!dynamicAgg) return 0;
      const row = dynamicAgg.categories.find((c) => c.category === cat);
      if (!row) return 0;
      return (row.adjustedShare - row.baseShare) / 100;
    };

    for (const factor of factors) {
      let baseWeight = 0.3;

      if (scenarioType === "crisis") {
        if (factor.category === "economy") baseWeight += 0.5;
        if (factor.id.includes("unemployment")) baseWeight += 0.3;
        if (factor.id.includes("sentiment")) baseWeight += 0.2;
      } else if (scenarioType === "growth") {
        if (factor.category === "polls") baseWeight += 0.4;
        if (factor.id.includes("gdp")) baseWeight += 0.3;
        if (factor.id.includes("investment")) baseWeight += 0.2;
      } else if (scenarioType === "election") {
        if (factor.category === "social") baseWeight += 0.3;
        if (factor.category === "news") baseWeight += 0.3;
        if (factor.id.includes("candidate")) baseWeight += 0.3;
      } else {
        if (factor.category === "historical") baseWeight += 0.4;
        if (factor.category === "demographic") baseWeight += 0.3;
      }

      // Modulazione da 145 fattori dinamici (formula senza IA)
      if (factor.category === "economy") baseWeight += catBoost("economy") * 2;
      if (factor.category === "social" || factor.category === "news") {
        baseWeight += catBoost("social_news") * 1.5;
      }

      if (factor.confidence < 0.5) baseWeight *= 0.7;
      if (factor.confidence < 0.3) baseWeight *= 0.4;

      const weight = clamp01(baseWeight);
      const rawValue = factor.rawValue ?? 0;
      result.push({
        factorId: factor.id,
        factorName: factor.name,
        rawValue,
        weight,
        weightedScore: rawValue * weight,
        category: factor.category,
      });
    }

    return result;
  }

  private async loadContextData(
    geoCode: string,
    timestamp: Date,
    candidatePartySlug: string,
  ): Promise<ContextDataBundle> {
    const year = timestamp.getFullYear();
    const { shares, usedYear, fallbackLevel } = await this.resolveHistorical(
      geoCode,
      year,
    );
    const istatData = await getISTATData(geoCode);
    const pollData = await this.getPollData(geoCode, timestamp);
    const socialData = await this.getSocialData(geoCode, timestamp, candidatePartySlug);
    const newsData = await this.getNewsData(geoCode, timestamp, candidatePartySlug);

    return {
      historicalShares: shares,
      historicalYear: usedYear,
      historicalFallbackLevel: fallbackLevel,
      bes: istatData.map((i) => ({
        indicatorId: i.indicatorId,
        indicatorName: i.indicatorLabel,
        value: i.value,
        year: i.year,
        territoryCode: i.territoryCode,
        territoryLevel: i.territoryLevel,
      })),
      polls: pollData.map((p) => ({
        date: p.publishedAt,
        institute: p.institute,
        sampleSize: p.sampleSize,
        shares: p.shares,
      })),
      social: socialData,
      news: newsData,
    };
  }

  /**
   * Fallback: nearest earlier year with data; empty → national-ish empty shares.
   */
  private async resolveHistorical(
    geoCode: string,
    year: number,
  ): Promise<{
    shares: Record<string, number>;
    usedYear: number | null;
    fallbackLevel: ContextDataBundle["historicalFallbackLevel"];
  }> {
    let shares = await getBaseline(geoCode, year);
    if (Object.keys(shares).length > 0) {
      return { shares, usedYear: year, fallbackLevel: "comune" };
    }

    const years = await listAvailableYears(geoCode);
    const earlier = years.filter((y) => y <= year).sort((a, b) => b - a);
    for (const y of earlier) {
      shares = await getBaseline(geoCode, y);
      if (Object.keys(shares).length > 0) {
        return { shares, usedYear: y, fallbackLevel: "comune" };
      }
    }
    const later = years.filter((y) => y > year).sort((a, b) => a - b);
    for (const y of later) {
      shares = await getBaseline(geoCode, y);
      if (Object.keys(shares).length > 0) {
        return { shares, usedYear: y, fallbackLevel: "comune" };
      }
    }

    // Soft national fallback averages (illustrative) when no local file exists
    return {
      shares: {
        "fratelli-ditalia": 26,
        "partito-democratico": 19,
        "movimento-5-stelle": 15,
        lega: 4.8,
        "forza-italia": 8,
        "azione-iv": 4,
      },
      usedYear: null,
      fallbackLevel: "nazionale",
    };
  }

  private async getPollData(
    _geoCode: string,
    timestamp: Date,
  ): Promise<NormalizedPoll[]> {
    // Polls are national in Fase 1; geoCode reserved for future territorial polls
    const near = await getPollsNear(timestamp.toISOString(), 60);
    if (near.length > 0) return near;
    // widen window
    return getPollsNear(timestamp.toISOString(), 365);
  }

  /**
   * Mock social snapshot — structure ready for real Twitter/X / Meta APIs.
   */
  private async getSocialData(
    geoCode: string,
    timestamp: Date,
    candidatePartySlug: string,
  ): Promise<SocialSnapshot> {
    const seed = hashSeed(`${geoCode}|${timestamp.toISOString().slice(0, 10)}|social`);
    const parties = [
      "partito-democratico",
      "fratelli-ditalia",
      "movimento-5-stelle",
      "lega",
      "forza-italia",
      "azione-iv",
    ];
    const byParty: SocialSnapshot["byParty"] = {};
    for (let i = 0; i < parties.length; i++) {
      const p = parties[i]!;
      const sentiment = ((seeded(seed + i) * 2 - 1) * 0.55) as number;
      const volume = 20 + seeded(seed + 10 + i) * 80;
      byParty[p] = {
        sentiment,
        volume,
        trend: trendFromDelta(sentiment),
      };
    }
    // Boost candidate party volume slightly
    if (byParty[candidatePartySlug]) {
      byParty[candidatePartySlug] = {
        ...byParty[candidatePartySlug]!,
        volume: Math.min(100, byParty[candidatePartySlug]!.volume * 1.25),
      };
    }
    const conversationVolume =
      Object.values(byParty).reduce((s, v) => s + v.volume, 0) / parties.length;

    return { mock: true, byParty, conversationVolume };
  }

  /**
   * Mock news snapshot — structure ready for Google News / GDELT ingest.
   */
  private async getNewsData(
    geoCode: string,
    timestamp: Date,
    candidatePartySlug: string,
  ): Promise<NewsSnapshot> {
    const seed = hashSeed(`${geoCode}|${timestamp.toISOString().slice(0, 10)}|news`);
    const parties = [
      "partito-democratico",
      "fratelli-ditalia",
      "movimento-5-stelle",
      "lega",
      "forza-italia",
      "azione-iv",
    ];
    const byParty: NewsSnapshot["byParty"] = {};
    let toneSum = 0;
    for (let i = 0; i < parties.length; i++) {
      const p = parties[i]!;
      const tone = seeded(seed + i) * 2 - 1;
      const coverageShare = 0.05 + seeded(seed + 20 + i) * 0.25;
      byParty[p] = {
        tone,
        coverageShare,
        trend: trendFromDelta(tone),
      };
      toneSum += tone;
    }
    if (byParty[candidatePartySlug]) {
      byParty[candidatePartySlug] = {
        ...byParty[candidatePartySlug]!,
        coverageShare: Math.min(
          0.45,
          byParty[candidatePartySlug]!.coverageShare * 1.3,
        ),
      };
    }
    return {
      mock: true,
      byParty,
      nationalTone: toneSum / parties.length,
    };
  }

  populateFactors(
    factors: FactorDefinition[],
    data: ContextDataBundle,
    candidatePartySlug: string,
  ): FactorDefinition[] {
    const unemployment = data.bes.find((b) => b.indicatorId === "03LAV008")?.value;
    const employment = data.bes.find((b) => b.indicatorId === "03LAV001")?.value;
    const lifeSat = data.bes.find((b) => b.indicatorId === "08SUB001")?.value;
    const lifeExp = data.bes.find((b) => b.indicatorId === "01SAL001")?.value;

    // Derived proxies when GDP/inflation series not yet harvested
    const gdpProxy =
      employment != null ? (employment - 60) / 5 : 0.4; // rough pp growth proxy
    const inflationProxy = unemployment != null ? Math.max(0, 12 - unemployment) * 0.35 : 2.2;
    const incomeIndex =
      lifeSat != null ? 70 + (lifeSat - 5) * 8 : 100;
    const consumptionGrowth =
      lifeSat != null ? (lifeSat - 6.5) * 1.5 : 0.5;
    const investmentScore =
      employment != null ? clamp01((employment - 50) / 30) * 100 : 55;

    const besConfidence =
      data.bes.length > 0
        ? data.bes[0]?.territoryLevel === "comune"
          ? 0.85
          : data.bes[0]?.territoryLevel === "regione"
            ? 0.65
            : 0.45
        : 0.25;

    const histConf =
      data.historicalFallbackLevel === "comune"
        ? 0.9
        : data.historicalFallbackLevel === "nazionale"
          ? 0.35
          : 0.55;

    const pollObs = (slug: string) =>
      data.polls.map((p) => {
        const daysAgo = Math.abs(
          (Date.now() - new Date(p.date).getTime()) / (86400000),
        );
        // relative to simulation timestamp is better — recompute if needed upstream
        return {
          sharePct: p.shares[slug] ?? 0,
          daysAgo: Number.isFinite(daysAgo) ? daysAgo : 30,
          sampleSize: p.sampleSize,
        };
      });

    const pollAvg = (slug: string) =>
      weightedAveragePollShare(pollObs(slug));

    const pollConf = data.polls.length >= 2 ? 0.75 : data.polls.length === 1 ? 0.55 : 0.25;

    const hist = data.historicalShares;
    const peak = Math.max(40, ...Object.values(hist), 1);

    return factors.map((factor) => {
      const next: FactorDefinition = { ...factor };

      switch (factor.id) {
        case "economy_gdp_growth": {
          next.rawValue = normalizeGDP(gdpProxy);
          next.confidence = besConfidence * 0.7; // derived
          next.trend = trendFromDelta(gdpProxy / 5);
          next.trendMagnitude = clamp01(Math.abs(gdpProxy) / 5);
          break;
        }
        case "economy_unemployment": {
          const u = unemployment ?? 9.5;
          next.rawValue = normalizeUnemployment(u);
          next.confidence = unemployment != null ? besConfidence : 0.3;
          next.trend = "stable";
          next.trendMagnitude = 0.1;
          break;
        }
        case "economy_inflation": {
          next.rawValue = normalizeInflation(inflationProxy);
          next.confidence = besConfidence * 0.5;
          next.trend = trendFromDelta(inflationProxy - 2);
          next.trendMagnitude = clamp01(Math.abs(inflationProxy - 2) / 5);
          break;
        }
        case "economy_income": {
          next.rawValue = normalizeIncomeIndex(incomeIndex);
          next.confidence = lifeSat != null ? besConfidence * 0.8 : 0.3;
          next.trend = "stable";
          next.trendMagnitude = 0.05;
          break;
        }
        case "economy_consumption": {
          next.rawValue = normalizeConsumptionGrowth(consumptionGrowth);
          next.confidence = lifeSat != null ? besConfidence * 0.7 : 0.25;
          next.trend = trendFromDelta(consumptionGrowth / 5);
          next.trendMagnitude = clamp01(Math.abs(consumptionGrowth) / 5);
          break;
        }
        case "economy_investment": {
          next.rawValue = normalizeInvestmentScore(investmentScore);
          next.confidence = employment != null ? besConfidence * 0.65 : 0.3;
          next.trend = "stable";
          next.trendMagnitude = 0.08;
          break;
        }
        case "polls_average_pd": {
          const avg = pollAvg("partito-democratico");
          next.rawValue = normalizePollShare(avg);
          next.confidence = pollConf;
          next.trend = "stable";
          next.trendMagnitude = 0.1;
          break;
        }
        case "polls_average_fdi": {
          const avg = pollAvg("fratelli-ditalia");
          next.rawValue = normalizePollShare(avg);
          next.confidence = pollConf;
          next.trend = "stable";
          next.trendMagnitude = 0.1;
          break;
        }
        case "polls_average_m5s": {
          next.rawValue = normalizePollShare(pollAvg("movimento-5-stelle"));
          next.confidence = pollConf;
          next.trend = "stable";
          next.trendMagnitude = 0.1;
          break;
        }
        case "polls_average_lega": {
          next.rawValue = normalizePollShare(pollAvg("lega"));
          next.confidence = pollConf;
          next.trend = "stable";
          next.trendMagnitude = 0.1;
          break;
        }
        case "polls_average_fi": {
          next.rawValue = normalizePollShare(pollAvg("forza-italia"));
          next.confidence = pollConf;
          next.trend = "stable";
          next.trendMagnitude = 0.1;
          break;
        }
        case "polls_average_av": {
          next.rawValue = normalizePollShare(pollAvg("azione-iv"));
          next.confidence = pollConf;
          next.trend = "stable";
          next.trendMagnitude = 0.1;
          break;
        }
        case "social_sentiment_pd": {
          const s = data.social.byParty["partito-democratico"];
          next.rawValue = normalizeSentiment(s?.sentiment ?? 0);
          next.confidence = 0.35; // mock
          next.trend = s?.trend ?? "stable";
          next.trendMagnitude = 0.2;
          break;
        }
        case "social_sentiment_fdi": {
          const s = data.social.byParty["fratelli-ditalia"];
          next.rawValue = normalizeSentiment(s?.sentiment ?? 0);
          next.confidence = 0.35;
          next.trend = s?.trend ?? "stable";
          next.trendMagnitude = 0.2;
          break;
        }
        case "social_volume_candidate": {
          const s = data.social.byParty[candidatePartySlug];
          next.rawValue = normalizeVolume(s?.volume ?? data.social.conversationVolume);
          next.confidence = 0.35;
          next.trend = s?.trend ?? "stable";
          next.trendMagnitude = 0.25;
          break;
        }
        case "social_sentiment_national": {
          const vals = Object.values(data.social.byParty).map((v) => v.sentiment);
          const avg =
            vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          next.rawValue = normalizeSentiment(avg);
          next.confidence = 0.3;
          next.trend = trendFromDelta(avg);
          next.trendMagnitude = clamp01(Math.abs(avg));
          break;
        }
        case "news_tone_pd": {
          const n = data.news.byParty["partito-democratico"];
          next.rawValue = normalizeNewsTone(n?.tone ?? 0);
          next.confidence = 0.35;
          next.trend = n?.trend ?? "stable";
          next.trendMagnitude = 0.2;
          break;
        }
        case "news_tone_fdi": {
          const n = data.news.byParty["fratelli-ditalia"];
          next.rawValue = normalizeNewsTone(n?.tone ?? 0);
          next.confidence = 0.35;
          next.trend = n?.trend ?? "stable";
          next.trendMagnitude = 0.2;
          break;
        }
        case "news_coverage_candidate": {
          const n = data.news.byParty[candidatePartySlug];
          next.rawValue = normalizeCoverage(n?.coverageShare ?? 0.1);
          next.confidence = 0.35;
          next.trend = n?.trend ?? "stable";
          next.trendMagnitude = 0.2;
          break;
        }
        case "news_tone_national": {
          next.rawValue = normalizeNewsTone(data.news.nationalTone);
          next.confidence = 0.3;
          next.trend = trendFromDelta(data.news.nationalTone);
          next.trendMagnitude = clamp01(Math.abs(data.news.nationalTone));
          break;
        }
        case "historical_last_share_pd": {
          next.rawValue = normalizeHistoricalShare(
            hist["partito-democratico"] ?? 0,
            peak,
          );
          next.confidence = histConf;
          next.trend = "stable";
          next.trendMagnitude = 0.05;
          break;
        }
        case "historical_last_share_fdi": {
          next.rawValue = normalizeHistoricalShare(
            hist["fratelli-ditalia"] ?? 0,
            peak,
          );
          next.confidence = histConf;
          next.trend = "stable";
          next.trendMagnitude = 0.05;
          break;
        }
        case "historical_last_share_m5s": {
          next.rawValue = normalizeHistoricalShare(
            hist["movimento-5-stelle"] ?? 0,
            peak,
          );
          next.confidence = histConf;
          next.trend = "stable";
          next.trendMagnitude = 0.05;
          break;
        }
        case "historical_comune_trend": {
          // Stability proxy: inverse of dispersion among top parties
          const top = Object.values(hist).sort((a, b) => b - a).slice(0, 4);
          const mean = top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
          const variance =
            top.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, top.length);
          const swing = Math.sqrt(variance);
          // High concentration → more "stable" local tendency → higher raw
          next.rawValue = clamp01(1 - normalizeSwing(swing));
          next.confidence = histConf;
          next.trend = "stable";
          next.trendMagnitude = normalizeSwing(swing);
          break;
        }
        case "demographic_avg_age": {
          // Life expectancy as soft age-structure proxy (higher LE → older-leaning)
          const ageProxy = lifeExp != null ? (lifeExp - 78) / 10 : 0.5;
          next.rawValue = clamp01(ageProxy);
          next.confidence = lifeExp != null ? besConfidence * 0.5 : 0.25;
          next.trend = "stable";
          next.trendMagnitude = 0.05;
          break;
        }
        case "demographic_education": {
          // No direct BES education in seed — derive mild proxy from life satisfaction
          next.rawValue = lifeSat != null ? clamp01((lifeSat - 5) / 5) : 0.45;
          next.confidence = 0.3;
          next.trend = "stable";
          next.trendMagnitude = 0.05;
          break;
        }
        case "demographic_density": {
          // Capoluoghi / aree metropolitane note → densità alta (proxy finché manca BES densità)
          const metroCodes = new Set(["ITE4", "ITC4", "ITF3", "ITF4", "ITH3"]);
          const territory = data.bes[0]?.territoryCode ?? "";
          next.rawValue = metroCodes.has(territory) ? 0.82 : 0.45;
          next.confidence = 0.4;
          next.trend = "stable";
          next.trendMagnitude = 0.02;
          break;
        }
        default:
          next.rawValue = next.rawValue ?? 0.5;
          next.confidence = Math.max(0.2, next.confidence);
      }

      return next;
    });
  }
}

/** Deterministic 0..1 from integer seed */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
