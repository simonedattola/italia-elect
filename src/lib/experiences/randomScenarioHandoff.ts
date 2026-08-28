/** Session key per handoff scenario casuale → /simula */
export const RANDOM_SCENARIO_SESSION_KEY = "italia-elect-random-scenario";

export interface RandomScenarioHandoff {
  title: string;
  description: string;
  partyVoteAdjustments: Record<string, number>;
}
