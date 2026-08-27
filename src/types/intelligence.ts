/**
 * Tipi condivisi del Context Intelligence / Public Figure system.
 */

export type PublicFigureCategory = "NATIONAL_PUBLIC" | "LOCAL_PUBLIC" | "UNKNOWN";

export type ScenarioRegime =
  | "economic_crisis"
  | "political_crisis"
  | "stable"
  | "international_tension"
  | "mixed";

export interface DynamicWeights {
  historical: number;
  polls: number;
  economy: number;
  events: number;
  social: number;
  candidate: number;
  partyIdentity: number;
  territorialLoyalty: number;
  regime: ScenarioRegime;
  rationale: string[];
}

export interface PollAggregate {
  asOf: string;
  shares: Record<string, number>;
  sampleWeightedReliability: number;
  pollCount: number;
  institutes: string[];
  weeklyDelta: Record<string, number>;
  leaderTrust: Record<string, number>;
  sources: { institute: string; publishedAt: string; reliability: number }[];
}

export interface EconomicSentiment {
  asOf: string;
  index: number; // -1 (crisi) … +1 (espansione)
  gdpGrowth: number | null;
  inflation: number | null;
  unemployment: number | null;
  realWageGrowth: number | null;
  costOfLivingIndex: number | null;
  spreadBtpBund: number | null;
  consumerConfidence: number | null;
  governmentPenalty: number; // 0-1 pressione sul governo uscente
  protestBoost: number;
  abstentionBoost: number;
  sources: string[];
}

export interface EventImpact {
  id: string;
  title: string;
  intensity: number;
  remainingStrength: number; // decay temporale
  favoredParties: string[];
  penalizedParties: string[];
  electorateShare: number;
  themes: string[];
}

export interface EventAnalysis {
  events: EventImpact[];
  netPartyShocks: Record<string, number>; // punti percentuali attesi
  dominantThemes: string[];
  sources: string[];
}

export interface SocialMomentum {
  asOf: string;
  available: boolean;
  scoreByParty: Record<string, number>; // -1 … +1
  scoreByCandidate: number; // -1 … +1 per il leader simulato
  volumeIndex: number;
  polarization: number;
  note: string;
  sources: string[];
}

export interface VoterSegmentImpact {
  segment: string;
  attraction: number; // -1 … +1 verso partito leader
  loss: number;
  mobilization: number;
}

export interface InfluenceFactor {
  id: string;
  label: string;
  effectPts: number; // impatto stimato sul partito leader in punti %
  weight: number;
  detail: string;
  polarity: "positive" | "negative" | "neutral";
}

export interface SimulationScenarios {
  mean: Record<string, number>;
  best: Record<string, number>; // p90 per leader
  worst: Record<string, number>; // p10 per leader
  leaderBest: number;
  leaderWorst: number;
  leaderMean: number;
  /** Snapshot Scenario Editor (Fase 5) */
  uiScenario?: import("@/types/scenario").UiScenarioConfig;
  /** Analisi ironica per modalità Amici */
  funAnalysis?: string;
}

export interface ContextBundle {
  weights: DynamicWeights;
  polls: PollAggregate;
  economy: EconomicSentiment;
  events: EventAnalysis;
  social: SocialMomentum;
  segments: VoterSegmentImpact[];
  influenceFactors: InfluenceFactor[];
  pollCorrectedBaseline: Record<string, number>;
  contextAdjustedBaseline: Record<string, number>;
  reliability: number;
  lastUpdated: string;
  sources: string[];
  disclaimer: string;
}

export interface RecognizedCandidate {
  firstName: string;
  lastName: string;
  category: PublicFigureCategory;
  normalizedKey: string;
  biography?: string;
  career?: string;
  sources: { title: string; url?: string; type: string }[];
  notoriety: number;
  mediaExposure: number;
  perceivedLeadership: number;
  partyCompatibility: number;
  electoralImpact: {
    newVotes: number;
    lostVotes: number;
    mobilizeAbstainers: number;
    communication: number;
  };
  controversyNotes: {
    verifiedFacts: string[];
    proceedings: string[];
    finalConvictions: string[];
    accusations: string[];
    publicOpinions: string[];
  };
  evidenceNotes: string[];
  reliability: number;
  fromCache: boolean;
  aliasesRejected: string[];
}
