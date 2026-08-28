import type { ItalianRegion } from "./constants";

export type Gender = "M" | "F";
export type Education = "bassa" | "media" | "alta";
export type Zone = "urbano" | "suburbano" | "rurale";
export type Platform = "x" | "facebook" | "instagram" | "tiktok" | "reddit" | "none";

export interface SocialPlatformProfile {
  active: boolean;
  hoursPerDay: number;
  followers: number;
}

export interface AgentSocialProfile {
  x: SocialPlatformProfile;
  facebook: SocialPlatformProfile;
  instagram: SocialPlatformProfile;
  tiktok: SocialPlatformProfile;
  reddit: SocialPlatformProfile;
  followsMeloni?: boolean;
  followsPd?: boolean;
}

export interface EmotionalState {
  mood: number;
  anxiety: number;
  optimism: number;
  anger: number;
}

export interface AgentWeights {
  economy: number;
  security: number;
  health: number;
  education: number;
  environment: number;
  geopolitics: number;
  politics: number;
  taxes: number;
  weather: number;
  sports: number;
  social: number;
  news: number;
  personal: number;
}

export interface AgentNetwork {
  contacts: string[];
  /** Peso del legame 0..1 per contatto */
  tieStrength: Record<string, number>;
}

export interface VotingHistory {
  politiche2018?: string;
  politiche2022?: string;
  europee2024?: string;
  regionali2023?: string;
  comunali2024?: string;
}

export interface DigitalAgent {
  id: string;
  age: number;
  gender: Gender;
  region: ItalianRegion | string;
  comuneId: string;
  income: string;
  education: Education;
  zone: Zone;
  votingHistory: VotingHistory;
  socialProfile: AgentSocialProfile;
  emotionalState: EmotionalState;
  weights: AgentWeights;
  network: AgentNetwork;
  /** Moltiplicatore per aggregazione su 60M */
  virtualWeight: number;
  updatedAt: string;
}

export interface AgentPopulationMeta {
  virtualPopulation: number;
  sampleSize: number;
  scalingFactor: number;
  generatedAt: string;
  demographics: Record<string, number>;
}
