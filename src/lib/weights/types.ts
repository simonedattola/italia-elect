export type WeightCategory =
  | "economy"
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

export type ScenarioMode = "base" | "crisis" | "election";

export type VoteEffect =
  | "government_penalty"
  | "government_bonus"
  | "right_bonus"
  | "left_bonus"
  | "opposition_bonus"
  | "polarizing"
  | "neutral";

export interface FactorSpec {
  id: string;
  index: number;
  name: string;
  category: WeightCategory;
  source: string;
  description: string;
  format: string;
  historicalMean: number;
  historicalStdDev: number;
  voteEffect: VoteEffect;
}

export interface DailyFactorSnapshot {
  date: string;
  collectedAt: string;
  factors: Record<string, number>;
  sources: string[];
}

export interface ComputedFactorWeight {
  factorId: string;
  factorName: string;
  category: WeightCategory;
  rawValue: number;
  baseline: number;
  dynamicWeight: number;
  weight: number;
  weightedScore: number;
  correction: number;
}

export interface CategoryWeightSummary {
  category: WeightCategory;
  label: string;
  baseShare: number;
  adjustedShare: number;
  factorCount: number;
}

export interface AggregatedWeights {
  scenario: ScenarioMode;
  computedAt: string;
  snapshotDate: string;
  factors: ComputedFactorWeight[];
  categories: CategoryWeightSummary[];
  totalWeight: number;
}
