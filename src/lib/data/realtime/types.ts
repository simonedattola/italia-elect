export interface EconomyData {
  index: number;
  gdpGrowth: number;
  unemployment: number;
  inflation: number;
  sources: string[];
  asOf: string;
}

export interface PollData {
  shares: Record<string, number>;
  institutes: string[];
  asOf: string;
  sources: string[];
  windowDays: number;
}

export interface ElectionData {
  structural: Record<string, number>;
  components: {
    europee2024: Record<string, number>;
    politiche2022: Record<string, number>;
    regionali2023: Record<string, number>;
  };
  weights: { europee2024: number; politiche2022: number; regionali2023: number };
}

export interface SocialUsageData {
  byAgeBand: Record<string, Record<string, number>>;
  sources: string[];
}

export interface BaselineSnapshot {
  shares: Record<string, number>;
  structural: Record<string, number>;
  pollCorrection: Record<string, number>;
  methodology: string;
  asOf: string;
  targets: { lega: number; futuroNazionale: number };
}
