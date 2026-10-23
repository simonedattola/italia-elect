import type { ScenarioInput, ScenarioTheme } from "./types";

/**
 * Schemi di scenario. I pesi non sono stime causali.
 * I numeri d'archivio citati nelle note sono scrutini, non l'effetto dell'evento.
 */
export const SCENARIO_PRESETS: ScenarioInput[] = [
  {
    id: "crisi-immigrazione",
    title: "Crisi immigrazione",
    intensity: 0.75,
    duration: "media",
    scope: "nazionale",
    themes: { migration: 1 },
    origin: "preset",
  },
  {
    id: "recessione",
    title: "Recessione",
    intensity: 0.75,
    duration: "lunga",
    scope: "nazionale",
    themes: { recession: 1 },
    origin: "preset",
  },
  {
    id: "inflazione",
    title: "Inflazione e caro vita",
    intensity: 0.7,
    duration: "media",
    scope: "nazionale",
    themes: { inflation: 1 },
    origin: "preset",
  },
  {
    id: "crisi-energetica",
    title: "Crisi energetica",
    intensity: 0.7,
    duration: "media",
    scope: "nazionale",
    themes: { energy: 1 },
    origin: "preset",
  },
  {
    id: "sicurezza",
    title: "Evento di sicurezza",
    intensity: 0.7,
    duration: "breve",
    scope: "nazionale",
    themes: { security: 1 },
    origin: "preset",
  },
  {
    id: "scandalo-corruzione",
    title: "Scandalo di corruzione",
    intensity: 0.8,
    duration: "media",
    scope: "nazionale",
    themes: { corruption: 1 },
    origin: "preset",
  },
  {
    id: "crisi-internazionale",
    title: "Crisi internazionale",
    intensity: 0.65,
    duration: "media",
    scope: "nazionale",
    themes: { war: 1 },
    origin: "preset",
  },
  {
    id: "pandemia",
    title: "Pandemia",
    intensity: 0.6,
    duration: "lunga",
    scope: "nazionale",
    themes: { pandemic: 1 },
    origin: "preset",
  },
  {
    id: "crescita",
    title: "Crescita economica forte",
    intensity: 0.65,
    duration: "lunga",
    scope: "nazionale",
    themes: { growth: 1 },
    origin: "preset",
  },
  {
    id: "disastro-ambientale",
    title: "Disastro ambientale",
    intensity: 0.7,
    duration: "media",
    scope: "nazionale",
    themes: { environment: 1 },
    origin: "preset",
  },
  {
    id: "scandalo-leader",
    title: "Scandalo del leader",
    intensity: 0.8,
    duration: "breve",
    scope: "nazionale",
    themes: { leader: 1 },
    origin: "preset",
  },
];

export function presetById(id: string): ScenarioInput | undefined {
  return SCENARIO_PRESETS.find((item) => item.id === id);
}

export function drawScenario(rng: () => number, scope: ScenarioInput["scope"] = "nazionale"): ScenarioInput {
  const index = Math.floor(rng() * SCENARIO_PRESETS.length) % SCENARIO_PRESETS.length;
  const preset = SCENARIO_PRESETS[index]!;
  return { ...preset, id: `${preset.id}-turno`, intensity: 0.45 + rng() * 0.4, scope, origin: "drawn" };
}

const ANALOGUES: Partial<Record<ScenarioTheme, string>> = {
  migration:
    "Contesto d'archivio, non effetto di questo scenario: alla Camera la Lega passa dal 17,35% del 2018 all'8,79% del 2022 e Fratelli d'Italia dal 4,35% al 25,98%.",
  recession:
    "Contesto d'archivio, non effetto di questo scenario: il Movimento 5 Stelle passa dal 32,68% del 2018 al 15,43% del 2022; il Partito Democratico dal 18,76% al 19,04%.",
  growth:
    "Contesto d'archivio, non effetto di questo scenario: Forza Italia passa dal 14% del 2018 all'8,11% del 2022. La variazione non è attribuita a un ciclo espansivo.",
};

export function analogueFor(themes: Partial<Record<ScenarioTheme, number>>): string | null {
  for (const theme of Object.keys(themes) as ScenarioTheme[]) {
    if ((themes[theme] ?? 0) > 0 && ANALOGUES[theme]) return ANALOGUES[theme]!;
  }
  return null;
}
