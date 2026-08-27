export * from "./types";
export {
  generateElectors,
  createRng,
  sampleFromDistribution,
  buildDemographics,
  resolveBaselineShares,
  getComuneDemographics,
} from "./electorGenerator";
export { applyInfluence } from "./influenceEngine";
export {
  simulateComune,
  computeSeats,
  computeConfidenceInterval,
  MICROSIM_VERSION,
} from "./simulationEngine";
export {
  aggregateResults,
  computeCoalitions,
  computeWinProbability,
} from "./aggregator";
export {
  computeCompatibility,
  normalizePartySlug,
} from "./compatibility";
