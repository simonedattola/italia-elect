/**
 * Pipeline di ingestione dati elettorali da fonti ufficiali.
 *
 * Flusso previsto in produzione:
 * 1. Fetch open data / Eligendo (Ministero dell'Interno)
 * 2. Validazione schema (Zod)
 * 3. Normalizzazione partiti → slug interni
 * 4. Upsert Election + ElectionResult
 * 5. Ricalcolo TerritorialMetrics
 * 6. DataUpdateLog
 *
 * Questo modulo è lo stub architetturale: collegare URL ufficiali
 * e credenziali quando disponibili.
 */

import { z } from "zod";

export const officialResultSchema = z.object({
  electionType: z.enum(["POLITICHE", "EUROPEE", "REGIONALI"]),
  year: z.number().int().min(1990),
  date: z.string(),
  turnout: z.number().min(0).max(100).optional(),
  scope: z.enum(["NAZIONALE", "REGIONALE", "PROVINCIALE"]),
  territoryCode: z.string().optional(),
  partyName: z.string(),
  votes: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  sourceUrl: z.string().url(),
});

export type OfficialResult = z.infer<typeof officialResultSchema>;

export async function fetchEligendoIndex(): Promise<{
  checkedAt: string;
  message: string;
}> {
  // Placeholder: in produzione chiamare API/open data Eligendo
  return {
    checkedAt: new Date().toISOString(),
    message:
      "Controllo predisposto. Collegare endpoint ufficiali Ministero dell'Interno per ingestione automatica.",
  };
}

export function validateOfficialBatch(rows: unknown[]) {
  const ok: OfficialResult[] = [];
  const errors: string[] = [];
  for (const [i, row] of rows.entries()) {
    const parsed = officialResultSchema.safeParse(row);
    if (parsed.success) ok.push(parsed.data);
    else errors.push(`Riga ${i}: ${parsed.error.issues[0]?.message}`);
  }
  return { ok, errors };
}
