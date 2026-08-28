import type { ScenarioType, WeightedFactors } from "../context/types";
import type { CandidateProfile } from "../../types/simulation";

export type Gender = "M" | "F";
export type EducationLevel = "bassa" | "media" | "alta";
export type IncomeLevel = "basso" | "medio" | "alto";
export type Occupation =
  | "operaio"
  | "impiegato"
  | "libero_professionista"
  | "studente"
  | "pensionato"
  | "disoccupato";
export type ZoneType = "urbano" | "suburbano" | "rurale";

export interface ElectorProfile {
  id: string;
  age: number;
  gender: Gender;
  education: EducationLevel;
  income: IncomeLevel;
  occupation: Occupation;
  zone: ZoneType;
  province: string;
  comuneId: string;
  previousVote: string | null;
  socialInfluence: number;
  localCandidateKnowledge: number;
  /** Prior MRP (o affinity ABM puro) — probabilità somma ≈ 1 */
  partyAffinity: Record<string, number>;
  /** Affidabilità del prior statistico 0..1 (hybrid) */
  statisticalConfidence?: number;
}

/** Candidato usato dal micro-sim (semplice + profilo opzionale). */
export interface MicrosimCandidate {
  name: string;
  partySlug: string;
  description?: string;
  program?: string;
  /** Profilo cognitivo 0–100 se già calcolato dalla pipeline esistente */
  profile?: Partial<CandidateProfile>;
}

export interface ScenarioOverride {
  seed?: number;
  scenarioType?: ScenarioType | string;
  /** Aggiustamenti in punti percentuali (es. +2 = +0.02 su preferenza) */
  partyVoteAdjustments?: Record<string, number>;
  /** Amplifica rumore/shock (scenari estremi) */
  chaosMode?: boolean;
}

export type SimulationMode = "hybrid" | "pure-abm";

export interface ComuneInput {
  comuneId: string;
  candidate: MicrosimCandidate;
  scenario: ScenarioOverride;
  weights: WeightedFactors[];
  sampleSize?: number;
  /** Default hybrid (MRP prior + ABM shocks) */
  mode?: SimulationMode;
  /** Data target per prior/sondaggi (default: now) */
  targetDate?: Date;
}

export interface FactorImpact {
  factorId: string;
  impact: number;
}

export interface ComuneResult {
  comuneId: string;
  comuneName: string;
  regione: string;
  province: string;
  totalVoters: number;
  simulatedVoters: number;
  partyVotes: Record<string, number>;
  seats: Record<string, number>;
  winner: string;
  winnerMargin: number;
  confidenceInterval: Record<string, [number, number]>;
  factorsImpact: FactorImpact[];
  metadata: {
    simulationTime: number;
    seed: number;
    modelVersion: string;
  };
}

export interface NationalAggregate {
  totalSeats: Record<string, number>;
  nationalVotes: Record<string, number>;
  mapData: {
    comuneId: string;
    winner: string;
    margin: number;
  }[];
  coalitions: {
    name: string;
    seats: number;
    votes: number;
  }[];
  winProbability: Record<string, number>;
}

export interface DemographicBundle {
  ageDistribution: Record<string, number>;
  educationDistribution: Record<EducationLevel, number>;
  incomeDistribution: Record<IncomeLevel, number>;
  occupationDistribution: Record<Occupation, number>;
  genderDistribution: Record<Gender, number>;
  zoneDistribution: Record<ZoneType, number>;
  provinceCode: string;
  comuneName: string;
  regione: string;
  electorate: number;
}

export type Rng = () => number;
