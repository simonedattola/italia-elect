export type IdeologySpectrum =
  | "FAR_LEFT"
  | "LEFT"
  | "CENTER_LEFT"
  | "CENTER"
  | "CENTER_RIGHT"
  | "RIGHT"
  | "FAR_RIGHT";

export type CoalitionFamily =
  | "CENTROSINISTRA"
  | "CENTRODESTRA"
  | "CENTRO"
  | "SINISTRA"
  | "DESTRA"
  | "ALTRO";

export interface PartyDefinition {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  ideology: IdeologySpectrum;
  ideologyScore: number; // -1 … +1
  coalitionFamily: CoalitionFamily;
  foundedYear?: number;
}

export interface CandidateInput {
  firstName: string;
  lastName: string;
  partySlug: string;
  description: string;
  program?: string;
  photoUrl?: string;
}

/** Dimensioni del profilo candidato (0–100). Inferenze, non fatti certi. */
export interface CandidateProfile {
  notoriety: number;
  credibility: number;
  experience: number;
  competence: number;
  leadership: number;
  communication: number;
  popularity: number;
  scandalRisk: number;
  mediaConsensus: number;
  socialConsensus: number;
  undecidedAppeal: number;
  mobilization: number;
  /** Coerenza con il partito scelto 0–100 */
  partyCompatibility: number;
  /** Flag: figura pubblica riconosciuta */
  isPublicFigure: boolean;
  /** Fatti verificabili vs inferenze */
  evidenceNotes: string[];
  dataQuality: "high" | "medium" | "low" | "insufficient";
}

export interface PartyResult {
  partySlug: string;
  partyName: string;
  shortName: string;
  color: string;
  percentage: number;
  percentageLow: number;
  percentageHigh: number;
  votes?: number;
  swing: number; // vs baseline storica
  seatsChamber: number;
  seatsSenate: number;
}

export interface ProvinceResult {
  provinceCode: string;
  provinceName: string;
  regionName: string;
  winnerSlug: string;
  winnerName: string;
  winnerColor: string;
  percentage: number;
  swing: number;
  turnout: number;
  topParties: { slug: string; percentage: number; color: string }[];
}

export interface SeatAllocation {
  total: number;
  byParty: Record<string, number>;
  majorityThreshold: number;
}

export interface CoalitionResult {
  family: CoalitionFamily;
  name: string;
  parties: string[];
  percentage: number;
  seatsChamber: number;
  seatsSenate: number;
  hasMajorityChamber: boolean;
  hasMajoritySenate: boolean;
}

export interface SimulationOutput {
  nationalResults: PartyResult[];
  chamberSeats: SeatAllocation;
  senateSeats: SeatAllocation;
  coalitions: CoalitionResult[];
  provincialMap: ProvinceResult[];
  winProbability: number;
  confidenceLow: number;
  confidenceHigh: number;
  modelMeta: ModelMeta;
  analysis?: string;
  influenceFactors?: import("@/types/intelligence").InfluenceFactor[];
  scenarios?: import("@/types/intelligence").SimulationScenarios;
  contextSummary?: {
    regime: string;
    reliability: number;
    lastUpdated: string;
    sources: string[];
    disclaimer: string;
    weights: Record<string, number>;
  };
}

export interface ModelMeta {
  version: string;
  method: string[];
  monteCarloRuns: number;
  seed: number;
  variables: string[];
  dataSources: string[];
  disclaimer: string;
  candidateDataQuality: CandidateProfile["dataQuality"];
  generatedAt: string;
}

export interface ComparisonResult {
  simulationIds: string[];
  winnerId: string | null;
  candidates: {
    id: string;
    name: string;
    partySlug: string;
    winProbability: number;
    nationalShare: number;
    provincesWon: number;
  }[];
  provinceDiffs: {
    provinceCode: string;
    winners: Record<string, string>;
  }[];
}
