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

export type ScenarioKind = "current" | "custom" | "random";

export interface ScenarioPartyModifier {
  slug: string;
  delta: number;
}

export interface ScenarioDefinition {
  id: string;
  kind: ScenarioKind;
  title: string;
  description: string;
  narrative: string;
  partyModifiers: ScenarioPartyModifier[];
  customText?: string;
}

export type ThemeQuestionType = "yesno" | "scale" | "choice";

export interface ThemeQuestion {
  id: string;
  theme: string;
  label: string;
  type: ThemeQuestionType;
  min?: number;
  max?: number;
  labels?: [string, string];
  options?: string[];
}

export interface CustomPartyProfile {
  motto: string;
  economicAxis: number;
  socialAxis: number;
  themeAnswers: Record<string, string | number | boolean>;
}

export interface GamePartyChoice {
  slug: string;
  name: string;
  color: string;
  isCustom?: boolean;
  ideologyScore?: number;
  customProfile?: CustomPartyProfile;
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
  themes?: string[];
  textDepth?: number;
  textSwingPts?: number;
  campaignImpact?: number;
  recognitionNote?: string;
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
  scenario?: ScenarioDefinition;
}

export interface GameInsight {
  label: string;
  value: string;
  detail?: string;
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
  scenario?: ScenarioDefinition;
  insights?: GameInsight[];
}

export type WizardStep = "players" | "scenario" | "competition" | "results";

export interface PlayerFormState {
  id: string;
  displayName: string;
  leaderFirstName: string;
  leaderLastName: string;
  description: string;
  program: string;
  vpFirstName: string;
  vpLastName: string;
  partySlug: string;
  customPartyName: string;
  customMotto: string;
  economicAxis: number;
  socialAxis: number;
  themeAnswers: Record<string, string | number | boolean>;
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
