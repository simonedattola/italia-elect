export type FactorCategory =
  | "economy"
  | "polls"
  | "social"
  | "news"
  | "historical"
  | "demographic"
  | "security"
  | "health"
  | "education"
  | "environment"
  | "geopolitics"
  | "politics"
  | "taxes"
  | "weather"
  | "sports"
  | "social_news"
  | "demography";

export type ScenarioType =
  | "crisis"
  | "stability"
  | "growth"
  | "election"
  | "custom";

export type GeoLevel =
  | "nazionale"
  | "regionale"
  | "provinciale"
  | "comunale";

export type TrendDirection = "up" | "down" | "stable";

export interface FactorDefinition {
  id: string;
  name: string;
  category: FactorCategory;
  description: string;
  source: string;
  rawValue: number | null;
  weight: number;
  confidence: number;
  trend: TrendDirection;
  trendMagnitude: number;
}

export interface ContextBundle {
  timestamp: Date;
  geoLevel: GeoLevel;
  geoCode: string;
  factors: FactorDefinition[];
  scenarioType: ScenarioType;
  metadata: {
    modelVersion: string;
    confidenceScore: number;
    topFactors: FactorDefinition[];
  };
}

export interface WeightedFactors {
  factorId: string;
  factorName: string;
  rawValue: number;
  weight: number;
  weightedScore: number;
  category: FactorCategory | string;
}

export interface ContextDataBundle {
  historicalShares: Record<string, number>;
  historicalYear: number | null;
  historicalFallbackLevel: "comune" | "provincia" | "regione" | "nazionale" | null;
  bes: Array<{
    indicatorId: string;
    indicatorName: string;
    value: number | null;
    year: number | null;
    territoryCode: string;
    territoryLevel: string;
  }>;
  polls: Array<{
    date: string;
    institute: string;
    sampleSize: number | null;
    shares: Record<string, number>;
  }>;
  social: SocialSnapshot;
  news: NewsSnapshot;
}

export interface SocialSnapshot {
  mock: true;
  byParty: Record<
    string,
    { sentiment: number; volume: number; trend: TrendDirection }
  >;
  conversationVolume: number;
}

export interface NewsSnapshot {
  mock: true;
  byParty: Record<
    string,
    { tone: number; coverageShare: number; trend: TrendDirection }
  >;
  nationalTone: number;
}
