/**
 * Scenari elettorali — modificano la baseline per tutti i partiti.
 */
import type { ScenarioDefinition, ScenarioKind } from "./types";
import { PARTIES } from "@/lib/electoral/parties";

function mod(
  slug: string,
  delta: number,
): { slug: string; delta: number } {
  return { slug, delta };
}

export const SCENARIO_PRESETS: ScenarioDefinition[] = [
  {
    id: "current",
    kind: "current",
    title: "Scenario attuale",
    description: "Sondaggi e baseline aggiornati al contesto politico odierno.",
    narrative: "Le elezioni si svolgono nel clima politico attuale, senza shock esterni.",
    partyModifiers: [],
  },
  {
    id: "migrants",
    kind: "random",
    title: "Arrivo massiccio di migranti",
    description:
      "Un'ondata migratoria improvvisa polarizza il dibattito su sicurezza e accoglienza.",
    narrative:
      "L'arrivo di decine di migliaia di migranti nei porti meridionali spinge l'opinione pubblica su temi di confine, ordine e identità.",
    partyModifiers: [
      mod("lega", 2.8),
      mod("fratelli-ditalia", 2.2),
      mod("futuro-nazionale", 1.8),
      mod("italexit", 1.2),
      mod("partito-democratico", -1.5),
      mod("avss", -0.8),
      mod("piu-europa", -1.2),
    ],
  },
  {
    id: "economic_crisis",
    kind: "random",
    title: "Crisi economica",
    description: "Recessione, inflazione e timori sulla tenuta del welfare.",
    narrative:
      "Una contrazione del PIL e l'aumento del costo della vita spingono gli elettori verso proposte di stabilità o protezione sociale.",
    partyModifiers: [
      mod("movimento-5-stelle", 1.5),
      mod("lega", 1.2),
      mod("partito-democratico", 0.8),
      mod("azione-iv", -0.6),
      mod("forza-italia", -0.4),
    ],
  },
  {
    id: "environment",
    kind: "random",
    title: "Crisi ambientale",
    description: "Ondata di calore, siccità e allarme climatico.",
    narrative:
      "Emergenze climatiche e disastri naturali portano ambiente e transizione ecologica al centro della campagna.",
    partyModifiers: [
      mod("avss", 3.2),
      mod("partito-democratico", 1.4),
      mod("movimento-5-stelle", 1.0),
      mod("piu-europa", 0.9),
      mod("fratelli-ditalia", -0.8),
      mod("lega", -0.6),
      mod("futuro-nazionale", -0.5),
    ],
  },
  {
    id: "corruption",
    kind: "random",
    title: "Scandalo di sistema",
    description: "Inchieste giudiziarie coinvolgono la classe dirigente.",
    narrative:
      "Un'inchiesta nazionale scuote la fiducia nelle élite. Cresce l'appetito per outsider e movimenti anti-sistema.",
    partyModifiers: [
      mod("movimento-5-stelle", 2.0),
      mod("italexit", 1.4),
      mod("futuro-nazionale", 0.6),
      mod("forza-italia", -1.8),
      mod("partito-democratico", -1.2),
      mod("azione-iv", -0.7),
    ],
  },
  {
    id: "europe",
    kind: "random",
    title: "Crisi europea",
    description: "Tensioni con Bruxelles e dibattito sull'euro.",
    narrative:
      "Nuove regole europee e un dibattito sull'autonomia fiscale riaccendono il conflitto tra sovranisti ed europeisti.",
    partyModifiers: [
      mod("lega", 1.6),
      mod("fratelli-ditalia", 1.2),
      mod("futuro-nazionale", 1.5),
      mod("italexit", 2.2),
      mod("piu-europa", 1.0),
      mod("partito-democratico", 0.5),
      mod("azione-iv", 0.4),
    ],
  },
];

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIO_PRESETS.find((s) => s.id === id);
}

export function pickRandomScenario(): ScenarioDefinition {
  const pool = SCENARIO_PRESETS.filter((s) => s.kind === "random");
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function applyScenarioToShares(
  shares: Record<string, number>,
  scenario: ScenarioDefinition,
): Record<string, number> {
  if (!scenario.partyModifiers.length) return shares;
  const out = { ...shares };
  for (const { slug, delta } of scenario.partyModifiers) {
    if (out[slug] !== undefined) {
      out[slug] = Math.max(0.1, (out[slug] ?? 0) + delta);
    }
  }
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  if (total <= 0) return out;
  for (const k of Object.keys(out)) {
    out[k] = (out[k]! / total) * 100;
  }
  return out;
}

export function scenarioInsights(
  scenario: ScenarioDefinition,
): Array<{ party: string; effect: string }> {
  return scenario.partyModifiers
    .map((m) => {
      const p = PARTIES.find((x) => x.slug === m.slug);
      if (!p) return null;
      const sign = m.delta > 0 ? "+" : "";
      return { party: p.shortName, effect: `${sign}${m.delta.toFixed(1)}pp` };
    })
    .filter(Boolean) as Array<{ party: string; effect: string }>;
}

export type { ScenarioKind };
