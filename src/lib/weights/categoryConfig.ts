import type { ScenarioMode, WeightCategory } from "./types";

export const CATEGORY_LABELS: Record<WeightCategory, string> = {
  economy: "Economia e Finanza",
  security: "Sicurezza e Giustizia",
  health: "Sanità e Welfare",
  education: "Educazione e Cultura",
  environment: "Ambiente e Clima",
  geopolitics: "Geopolitica",
  politics: "Politica e Istituzioni",
  taxes: "Tasse e Fisco",
  weather: "Meteo",
  sports: "Sport",
  social_news: "Social e Notizie",
  demography: "Psicologia e Demografia",
};

/** Peso base per categoria (% del totale) per scenario */
export const CATEGORY_SCENARIO_WEIGHTS: Record<
  ScenarioMode,
  Record<WeightCategory, number>
> = {
  base: {
    economy: 30,
    security: 15,
    health: 10,
    education: 5,
    environment: 5,
    geopolitics: 5,
    politics: 10,
    taxes: 5,
    weather: 2,
    sports: 2,
    social_news: 5,
    demography: 6,
  },
  crisis: {
    economy: 40,
    security: 25,
    health: 15,
    education: 5,
    environment: 8,
    geopolitics: 10,
    politics: 10,
    taxes: 5,
    weather: 4,
    sports: 2,
    social_news: 10,
    demography: 6,
  },
  election: {
    economy: 25,
    security: 10,
    health: 8,
    education: 5,
    environment: 4,
    geopolitics: 3,
    politics: 15,
    taxes: 10,
    weather: 2,
    sports: 2,
    social_news: 15,
    demography: 6,
  },
};

export function scenarioFromLegacy(
  scenarioType: string,
): ScenarioMode {
  if (scenarioType === "crisis") return "crisis";
  if (scenarioType === "election" || scenarioType === "growth") return "election";
  return "base";
}
