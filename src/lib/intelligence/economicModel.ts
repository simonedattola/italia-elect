/**
 * Economic Sentiment Index — impatto macroeconomico sul voto.
 */

import type { EconomicSentiment } from "@/types/intelligence";
import { clamp } from "@/lib/utils";

export interface EconomicInput {
  asOf: string;
  gdpGrowth?: number | null;
  inflation?: number | null;
  unemployment?: number | null;
  realWageGrowth?: number | null;
  costOfLivingIndex?: number | null;
  spreadBtpBund?: number | null;
  consumerConfidence?: number | null;
  source?: string;
  sourceUrl?: string;
}

/** Snapshot di riferimento (ordini di grandezza ISTAT / Banca d'Italia) */
export const EMBEDDED_ECONOMY: EconomicInput = {
  asOf: "2026-06-30",
  gdpGrowth: 0.7,
  inflation: 1.9,
  unemployment: 6.8,
  realWageGrowth: -0.4,
  costOfLivingIndex: 108,
  spreadBtpBund: 125,
  consumerConfidence: 96,
  source: "ISTAT / Banca d'Italia (aggregato modellistico)",
  sourceUrl: "https://www.istat.it/",
};

export function computeEconomicSentiment(
  input: EconomicInput = EMBEDDED_ECONOMY
): EconomicSentiment {
  const gdp = input.gdpGrowth ?? 0;
  const inf = input.inflation ?? 2;
  const une = input.unemployment ?? 7;
  const wages = input.realWageGrowth ?? 0;
  const coli = input.costOfLivingIndex ?? 100;
  const spread = input.spreadBtpBund ?? 150;
  const conf = input.consumerConfidence ?? 100;

  // Indice composito -1…+1
  const gdpN = clamp(gdp / 3, -1, 1);
  const infN = clamp((2 - inf) / 4, -1, 1); // inflazione >2 penalizza
  const uneN = clamp((8 - une) / 5, -1, 1);
  const wageN = clamp(wages / 2, -1, 1);
  const coliN = clamp((100 - coli) / 20, -1, 1);
  const spreadN = clamp((180 - spread) / 120, -1, 1);
  const confN = clamp((conf - 100) / 25, -1, 1);

  const index = clamp(
    gdpN * 0.2 +
      infN * 0.18 +
      uneN * 0.15 +
      wageN * 0.15 +
      coliN * 0.12 +
      spreadN * 0.08 +
      confN * 0.12,
    -1,
    1
  );

  const stress = clamp(-index, 0, 1);
  const governmentPenalty = clamp(stress * 0.85 + (coli > 105 ? 0.1 : 0), 0, 1);
  const protestBoost = clamp(stress * 0.7 + (wages < 0 ? 0.15 : 0), 0, 1);
  const abstentionBoost = clamp(stress * 0.35 + (conf < 95 ? 0.1 : 0), 0, 0.6);

  return {
    asOf: input.asOf,
    index,
    gdpGrowth: input.gdpGrowth ?? null,
    inflation: input.inflation ?? null,
    unemployment: input.unemployment ?? null,
    realWageGrowth: input.realWageGrowth ?? null,
    costOfLivingIndex: input.costOfLivingIndex ?? null,
    spreadBtpBund: input.spreadBtpBund ?? null,
    consumerConfidence: input.consumerConfidence ?? null,
    governmentPenalty,
    protestBoost,
    abstentionBoost,
    sources: [
      input.source ?? "Indicatori macroeconomici incorporati",
      input.sourceUrl ?? "https://www.istat.it/",
    ],
  };
}

/** Shock di voto per famiglia: governo uscente = centrodestra nel contesto 2026 */
export function economicPartyShocks(
  sentiment: EconomicSentiment,
  governingFamily: string = "CENTRODESTRA"
): Record<string, number> {
  const shocks: Record<string, number> = {};
  // Punti percentuali
  const govShock = -sentiment.governmentPenalty * 3.5;
  const protest = sentiment.protestBoost * 2.2;
  const oppBoost = sentiment.governmentPenalty * 1.8;

  // Mappa famiglia → slug rappresentativi
  const byFamily: Record<string, string[]> = {
    CENTRODESTRA: ["fratelli-ditalia", "lega", "forza-italia"],
    CENTROSINISTRA: ["partito-democratico", "avss", "piu-europa"],
    ALTRO: ["movimento-5-stelle"],
    CENTRO: ["azione-iv"],
    SINISTRA: ["avss"],
    DESTRA: ["italexit"],
  };

  for (const [family, slugs] of Object.entries(byFamily)) {
    for (const slug of slugs) {
      if (family === governingFamily) {
        shocks[slug] = (shocks[slug] ?? 0) + govShock / slugs.length;
      } else if (family === "ALTRO" || family === "DESTRA") {
        shocks[slug] = (shocks[slug] ?? 0) + protest / 2;
      } else {
        shocks[slug] = (shocks[slug] ?? 0) + oppBoost / Math.max(slugs.length, 1);
      }
    }
  }
  return shocks;
}
