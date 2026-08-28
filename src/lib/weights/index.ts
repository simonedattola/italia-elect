export * from "./types";
export { FACTORS, FACTOR_COUNT, getFactorById, factorsByCategory } from "./factorRegistry";
export {
  computeDynamicWeights,
  computeAggregatedWeights,
  computeFactorDynamicWeight,
  normalizeFactorValue,
  aggregateCategoryWeights,
} from "./dynamicWeights";
export {
  aggregateByCategory,
  getTopFactors,
  compareScenarios,
  categoryWeightDelta,
  validateFactorCoverage,
} from "./weightAggregator";
export {
  CATEGORY_LABELS,
  CATEGORY_SCENARIO_WEIGHTS,
  scenarioFromLegacy,
} from "./categoryConfig";
export {
  collectFactors,
  saveDailySnapshot,
  loadLatestSnapshot,
  refreshDailyFactors,
  getWeightsLastUpdated,
} from "./factorCollector";
