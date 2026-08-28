/**
 * Scenario UI / override condivisi tra form, action e motore.
 */

export type UiMode = "analyst" | "fun";

export interface UiScenarioConfig {
  uiMode: UiMode;
  chaosMode: boolean;
  /** Aggiustamenti in punti percentuali per partito (−5…+5) */
  partyVoteAdjustments: Record<string, number>;
  /** Coalizioni attive (nome → true/false) */
  activeCoalitions: Record<string, boolean>;
  /** Soglia lista % per Rosatellum (default 3) */
  partyThreshold: number;
  /** Affluenza % (50–90) — influenza volatilità e mappe */
  turnout: number;
  /** Usa allocateRosatellum invece del solo proporzionale */
  useRosatellum: boolean;
  seed?: number;
}

export const DEFAULT_UI_SCENARIO: UiScenarioConfig = {
  uiMode: "analyst",
  chaosMode: false,
  partyVoteAdjustments: {},
  activeCoalitions: {
    CENTRODESTRA: true,
    CENTROSINISTRA: true,
    M5S: true,
    TERZO_POLO: true,
    ALTRI: true,
  },
  partyThreshold: 3,
  turnout: 65,
  useRosatellum: true,
};

export const COALITION_OPTIONS = [
  {
    id: "CENTRODESTRA",
    name: "Centrodestra",
    parties: ["fratelli-ditalia", "lega", "forza-italia"],
  },
  {
    id: "CENTROSINISTRA",
    name: "Centrosinistra",
    parties: ["partito-democratico", "avss", "piu-europa"],
  },
  {
    id: "M5S",
    name: "Movimento 5 Stelle",
    parties: ["movimento-5-stelle"],
  },
  {
    id: "TERZO_POLO",
    name: "Terzo polo (Az/IV)",
    parties: ["azione-iv"],
  },
  {
    id: "ALTRI",
    name: "Altri",
    parties: ["italexit"],
  },
] as const;
