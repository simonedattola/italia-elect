/**
 * Baseline storiche nazionali — valori ispirati a risultati ufficiali
 * Ministero dell'Interno / Eligendo (arrotondati per il modello).
 * Fonti documentate in DataUpdateLog e metodologia.
 */

export interface NationalSnapshot {
  year: number;
  type: "POLITICHE" | "EUROPEE";
  turnout: number;
  /** percentuali per slug partito (sistema contemporaneo mappato) */
  shares: Record<string, number>;
  source: string;
  sourceUrl: string;
}

/**
 * Mapping semplificato: partiti storici → slug contemporanei dove ha senso
 * per costruire serie temporali coerenti nel modello.
 */
export const HISTORICAL_NATIONAL: NationalSnapshot[] = [
  {
    year: 2013,
    type: "POLITICHE",
    turnout: 75.2,
    shares: {
      "partito-democratico": 25.4,
      "movimento-5-stelle": 25.6,
      "forza-italia": 21.6, // PdL
      lega: 4.1,
      "fratelli-ditalia": 2.0,
      avss: 3.2,
      "azione-iv": 0,
      "piu-europa": 0,
      italexit: 2.5,
    },
    source: "Ministero dell'Interno — Eligendo",
    sourceUrl: "https://elezioni.interno.gov.it/",
  },
  {
    year: 2018,
    type: "POLITICHE",
    turnout: 72.9,
    shares: {
      "movimento-5-stelle": 32.7,
      "partito-democratico": 18.7,
      lega: 17.4,
      "forza-italia": 14.0,
      "fratelli-ditalia": 4.4,
      avss: 3.4,
      "azione-iv": 0,
      "piu-europa": 2.6,
      italexit: 1.5,
    },
    source: "Ministero dell'Interno — Eligendo",
    sourceUrl: "https://elezioni.interno.gov.it/",
  },
  {
    year: 2019,
    type: "EUROPEE",
    turnout: 54.5,
    shares: {
      lega: 34.3,
      "partito-democratico": 22.7,
      "movimento-5-stelle": 17.1,
      "forza-italia": 8.8,
      "fratelli-ditalia": 6.4,
      avss: 2.3,
      "azione-iv": 0,
      "piu-europa": 3.1,
      italexit: 1.5,
    },
    source: "Ministero dell'Interno — Eligendo",
    sourceUrl: "https://elezioni.interno.gov.it/",
  },
  {
    year: 2022,
    type: "POLITICHE",
    turnout: 63.9,
    shares: {
      "fratelli-ditalia": 26.0,
      "partito-democratico": 19.1,
      lega: 8.8,
      "movimento-5-stelle": 15.4,
      "forza-italia": 8.1,
      "azione-iv": 7.8,
      avss: 3.6,
      "piu-europa": 2.8,
      italexit: 1.9,
    },
    source: "Ministero dell'Interno — Eligendo",
    sourceUrl: "https://elezioni.interno.gov.it/",
  },
  {
    year: 2024,
    type: "EUROPEE",
    turnout: 48.3,
    shares: {
      "fratelli-ditalia": 28.8,
      "partito-democratico": 24.1,
      "movimento-5-stelle": 10.0,
      "forza-italia": 9.6,
      lega: 9.0,
      "futuro-nazionale": 8.0,
      avss: 6.8,
      "azione-iv": 3.3,
      "piu-europa": 3.8,
      italexit: 1.5,
    },
    source: "Ministero dell'Interno — Eligendo",
    sourceUrl: "https://elezioni.interno.gov.it/",
  },
];

/**
 * Moltiplicatori territoriali tipici per area geografica × famiglia coalizione.
 * Derivati da pattern elettorali osservati 2018–2024 (non sono previsioni).
 */
export const AREA_BIAS: Record<
  string,
  Record<string, number>
> = {
  nord: {
    "fratelli-ditalia": 1.08,
    lega: 1.35,
    "forza-italia": 1.05,
    "partito-democratico": 0.95,
    "movimento-5-stelle": 0.7,
    "azione-iv": 1.15,
    avss: 0.95,
    "piu-europa": 1.1,
    italexit: 0.9,
  },
  centro: {
    "fratelli-ditalia": 1.0,
    lega: 0.75,
    "forza-italia": 0.95,
    "partito-democratico": 1.25,
    "movimento-5-stelle": 0.95,
    "azione-iv": 1.1,
    avss: 1.15,
    "piu-europa": 1.2,
    italexit: 0.85,
  },
  sud: {
    "fratelli-ditalia": 0.95,
    lega: 0.55,
    "forza-italia": 1.1,
    "partito-democratico": 0.9,
    "movimento-5-stelle": 1.45,
    "azione-iv": 0.75,
    avss: 0.85,
    "piu-europa": 0.7,
    italexit: 1.1,
  },
  isole: {
    "fratelli-ditalia": 1.0,
    lega: 0.5,
    "forza-italia": 1.05,
    "partito-democratico": 0.85,
    "movimento-5-stelle": 1.5,
    "azione-iv": 0.7,
    avss: 0.8,
    "piu-europa": 0.65,
    italexit: 1.15,
  },
};

/** Bias provinciali aggiuntivi (override soft) per province emblematiche */
export const PROVINCE_BIAS: Record<string, Record<string, number>> = {
  MI: { "partito-democratico": 1.1, "azione-iv": 1.25, lega: 0.9 },
  BO: { "partito-democratico": 1.35, avss: 1.3, "fratelli-ditalia": 0.8 },
  FI: { "partito-democratico": 1.3, avss: 1.25 },
  RM: { "movimento-5-stelle": 1.15, "fratelli-ditalia": 1.05 },
  NA: { "movimento-5-stelle": 1.6, lega: 0.4 },
  PA: { "movimento-5-stelle": 1.4, "forza-italia": 1.2 },
  VR: { lega: 1.4, "fratelli-ditalia": 1.15 },
  BG: { lega: 1.5, "fratelli-ditalia": 1.1 },
  VE: { lega: 1.3, "fratelli-ditalia": 1.1 },
  TO: { "partito-democratico": 1.1, "movimento-5-stelle": 1.05 },
  GE: { "partito-democratico": 1.15, avss: 1.1 },
  BA: { "movimento-5-stelle": 1.3, "partito-democratico": 1.0 },
  CT: { "movimento-5-stelle": 1.35, "forza-italia": 1.15 },
};

/** Serie storica per un partito (per grafici) */
export function getPartyHistory(partySlug: string) {
  return HISTORICAL_NATIONAL.map((h) => ({
    year: h.year,
    type: h.type,
    percentage: h.shares[partySlug] ?? 0,
    turnout: h.turnout,
  }));
}
