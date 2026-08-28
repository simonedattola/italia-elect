/**
 * Tipi per Italia Elect Game — multiplayer / single / vs computer.
 */

export type GameMode =
  | "multiplayer"
  | "singleplayer"
  | "vscomputer"
  | "computervscomputer";

export type GameDifficulty = "easy" | "medium" | "hard" | "impossible";

export type ComputerOrientation = "random" | "right" | "left" | "center" | "populist";

export type RedistributionMode = "candidates_only" | "all_parties";

export interface GamePartyChoice {
  slug: string;
  name: string;
  color: string;
  isCustom?: boolean;
  ideologyScore?: number;
}

export interface GameCandidateInput {
  firstName: string;
  lastName: string;
  description?: string;
  program?: string;
}

export interface GamePlayer {
  id: string;
  displayName: string;
  party: GamePartyChoice;
  candidate: GameCandidateInput;
  vicePresident?: GameCandidateInput;
  isComputer?: boolean;
  isHuman?: boolean;
}

export interface CandidateGameProfile {
  name: string;
  firstName: string;
  lastName: string;
  partySlug: string;
  popularity: number;
  compatibility: number;
  ideology: number;
  leadership: number;
  mobilization: number;
  credibility: number;
  isPublicFigure: boolean;
  positionLabel: string;
  programSummary: string;
  vicePresidentEffect: number;
  expectedSwingPts: number;
}

export interface GameSimulationOptions {
  mode: GameMode;
  redistributionMode: RedistributionMode;
  seed?: number;
  /** Single player: partiti reali attivi senza candidato umano */
  realPartySlugs?: string[];
  difficulty?: GameDifficulty;
  computerOrientation?: ComputerOrientation;
}

export interface PlayerGameResult {
  playerId: string;
  displayName: string;
  partySlug: string;
  partyName: string;
  partyColor: string;
  candidateName: string;
  percentage: number;
  percentageLow: number;
  percentageHigh: number;
  chamberSeats: number;
  senateSeats: number;
  totalSeats: number;
  profile: CandidateGameProfile;
  won: boolean;
}

export interface RegionalGameResult {
  regionName: string;
  winnerSlug: string;
  winnerName: string;
  winnerColor: string;
  percentage: number;
  partyShares: Record<string, number>;
}

export interface GameSimulationResult {
  mode: GameMode;
  seed: number;
  players: PlayerGameResult[];
  winner: PlayerGameResult;
  nationalShares: Record<string, number>;
  regionalResults: RegionalGameResult[];
  provincialMap: import("@/types/simulation").ProvinceResult[];
  narrative: string;
  comparisonTable: Array<{
    name: string;
    party: string;
    percentage: number;
    seats: number;
    position: string;
  }>;
}

export interface ComputerChoice {
  displayName: string;
  party: GamePartyChoice;
  candidate: GameCandidateInput;
  vicePresident?: GameCandidateInput;
  program: string;
  description: string;
}

export interface GameSessionState {
  id: string;
  mode: GameMode;
  players: GamePlayer[];
  options: GameSimulationOptions;
  createdAt: string;
}
