export * from "./types";
export { FACTORS, getFactorById, factorsByCategory } from "./factorRegistry";
export { WeightsEngine, getISTATData } from "./weightsEngine";

export {
  normalizeGDP,
  normalizeUnemployment,
  normalizeInflation,
  normalizeIncomeIndex,
  normalizeConsumptionGrowth,
  normalizeInvestmentScore,
} from "./normalizers/economy";
export {
  normalizePollShare,
  weightedAveragePollShare,
} from "./normalizers/polls";
export { normalizeSentiment, normalizeVolume } from "./normalizers/social";
export { normalizeNewsTone, normalizeCoverage } from "./normalizers/news";
export {
  normalizeHistoricalShare,
  normalizeTurnout,
  normalizeSwing,
} from "./normalizers/historical";
