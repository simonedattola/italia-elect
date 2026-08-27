/**
 * Baseline storica comunale.
 *
 * getBaseline(comuneId, year) → percentuali partito dalla consultazione
 * primaria di quell'anno (Politiche > Europee > Regionali > Comunali).
 *
 * getBaselinesByType espone tutte le elezioni disponibili per anno.
 */

import { readComuneElections } from "./elections";
import type { ElectionType, NormalizedElection } from "./types";
import { normalizeShares } from "./partyMap";

const TYPE_PRIORITY: ElectionType[] = [
  "POLITICHE",
  "EUROPEE",
  "REGIONALI",
  "COMUNALI",
];

function pickPrimary(elections: NormalizedElection[]): NormalizedElection | null {
  for (const type of TYPE_PRIORITY) {
    const hit = elections.find((e) => e.electionType === type);
    if (hit) return hit;
  }
  return elections[0] ?? null;
}

/**
 * Voti/quote percentuali per partito nel comune-anno.
 * Preferisce Politiche Camera se presenti.
 */
export async function getBaseline(
  comuneId: string,
  year: number
): Promise<Record<string, number>> {
  const store = await readComuneElections(comuneId);
  if (!store) return {};
  const yearElections = store.elections.filter((e) => e.year === year);
  const primary = pickPrimary(yearElections);
  if (!primary) return {};
  return normalizeShares(primary.shares);
}

/** Tutte le baseline per tipo elettorale nello stesso anno */
export async function getBaselinesByType(
  comuneId: string,
  year: number
): Promise<Partial<Record<ElectionType, Record<string, number>>>> {
  const store = await readComuneElections(comuneId);
  if (!store) return {};
  const out: Partial<Record<ElectionType, Record<string, number>>> = {};
  for (const e of store.elections.filter((x) => x.year === year)) {
    // se più camere, preferisci CAMERA
    if (out[e.electionType] && e.chamber === "SENATO") continue;
    out[e.electionType] = normalizeShares(e.shares);
  }
  return out;
}

export async function listAvailableYears(comuneId: string): Promise<number[]> {
  const store = await readComuneElections(comuneId);
  if (!store) return [];
  return [...new Set(store.elections.map((e) => e.year))].sort();
}

export async function getElectionRecord(
  comuneId: string,
  year: number,
  electionType?: ElectionType
): Promise<NormalizedElection | null> {
  const store = await readComuneElections(comuneId);
  if (!store) return null;
  const yearElections = store.elections.filter((e) => e.year === year);
  if (electionType) {
    return (
      yearElections.find((e) => e.electionType === electionType && e.chamber !== "SENATO") ??
      yearElections.find((e) => e.electionType === electionType) ??
      null
    );
  }
  return pickPrimary(yearElections);
}
