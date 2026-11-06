/**
 * Affinità candidato–lista. Le posizioni di lista sono uno schema di scenario,
 * non la codifica di un programma ufficiale.
 */

export interface AffinityQuestion {
  id: string;
  theme: string;
  prompt: string;
  /** -1 = risposta "sinistra / apertura", +1 = risposta opposta, nello schema interno. */
  leftLabel: string;
  rightLabel: string;
}

export const AFFINITY_QUESTIONS: AffinityQuestion[] = [
  {
    id: "tax",
    theme: "Fisco",
    prompt: "La priorità di bilancio è ridurre le tasse o estendere il welfare?",
    leftLabel: "Welfare",
    rightLabel: "Meno tasse",
  },
  {
    id: "europe",
    theme: "Europa",
    prompt: "L'integrazione europea va approfondita o riportata agli Stati?",
    leftLabel: "Più integrazione",
    rightLabel: "Più sovranità",
  },
  {
    id: "migration",
    theme: "Migrazioni",
    prompt: "Sui flussi migratori prevale l'accoglienza o il controllo dei confini?",
    leftLabel: "Accoglienza",
    rightLabel: "Controllo",
  },
  {
    id: "climate",
    theme: "Clima",
    prompt: "La transizione ecologica va accelerata anche se costa nell'immediato?",
    leftLabel: "Accelerare",
    rightLabel: "Frenare",
  },
  {
    id: "security",
    theme: "Sicurezza",
    prompt: "Sulla sicurezza prevale la prevenzione sociale o la risposta penale?",
    leftLabel: "Prevenzione",
    rightLabel: "Risposta penale",
  },
  {
    id: "work",
    theme: "Lavoro",
    prompt: "Il lavoro si tutela prima con i salari e i diritti o con la flessibilità d'impresa?",
    leftLabel: "Salari e diritti",
    rightLabel: "Flessibilità",
  },
];

/** Schema -1…+1 per le liste contemporanee. 0 = non classificato. */
export const PARTY_POSITIONS: Record<string, Record<string, number>> = {
  "fratelli-ditalia": { tax: 0.55, europe: 0.45, migration: 0.8, climate: 0.35, security: 0.75, work: 0.4 },
  lega: { tax: 0.6, europe: 0.7, migration: 0.85, climate: 0.45, security: 0.7, work: 0.45 },
  "forza-italia": { tax: 0.7, europe: -0.2, migration: 0.35, climate: 0.15, security: 0.4, work: 0.55 },
  "noi-moderati": { tax: 0.45, europe: -0.15, migration: 0.25, climate: 0.05, security: 0.3, work: 0.35 },
  "partito-democratico": { tax: -0.45, europe: -0.7, migration: -0.45, climate: -0.55, security: -0.25, work: -0.5 },
  avss: { tax: -0.75, europe: -0.35, migration: -0.7, climate: -0.9, security: -0.55, work: -0.7 },
  "piu-europa": { tax: -0.05, europe: -0.95, migration: -0.4, climate: -0.6, security: -0.2, work: -0.1 },
  "azione-iv": { tax: 0.25, europe: -0.75, migration: -0.05, climate: -0.2, security: 0.05, work: 0.35 },
  "movimento-5-stelle": { tax: -0.2, europe: 0.15, migration: -0.1, climate: -0.45, security: -0.05, work: -0.35 },
  italexit: { tax: 0.2, europe: 0.95, migration: 0.7, climate: 0.4, security: 0.55, work: 0.1 },
};

export interface AffinityResult {
  score: number;
  coverage: number;
  note: string;
}

/** Risposte da -1 (etichetta sinistra) a +1 (etichetta destra). */
export function scoreAffinity(
  listId: string,
  answers: Record<string, number>,
): AffinityResult {
  const positions = PARTY_POSITIONS[listId];
  if (!positions) {
    return {
      score: 50,
      coverage: 0,
      note: "Per questa lista non c'è uno schema di posizioni: l'affinità resta neutra e non sposta i voti.",
    };
  }
  let distance = 0;
  let n = 0;
  for (const q of AFFINITY_QUESTIONS) {
    const answer = answers[q.id];
    const position = positions[q.id];
    if (answer == null || Number.isNaN(answer) || position == null) continue;
    const clamped = Math.max(-1, Math.min(1, answer));
    distance += Math.abs(clamped - position) / 2;
    n += 1;
  }
  if (n === 0) {
    return {
      score: 50,
      coverage: 0,
      note: "Nessuna risposta: affinità neutra.",
    };
  }
  const mean = distance / n;
  const score = Math.round((1 - mean) * 100);
  return {
    score,
    coverage: n / AFFINITY_QUESTIONS.length,
    note: "Distanza media tra le risposte e lo schema di scenario della lista. Non è un giudizio sul candidato.",
  };
}

/**
 * Elasticità di scenario, in punti percentuali.
 * A parità di notorietà, lo scostamento negativo è più ampio di quello positivo:
 * un candidato lontano dalla lista disperde più di quanto uno vicino non raccolga.
 * Non è un coefficiente stimato su dati storici.
 */
export function affinitySwing(score: number, notoriety: number): number {
  const centered = (Math.max(0, Math.min(100, score)) - 50) / 50;
  const reach = Math.max(0, Math.min(100, notoriety)) / 100;
  if (centered >= 0) return centered * reach * 2.5;
  return centered * reach * 4;
}
