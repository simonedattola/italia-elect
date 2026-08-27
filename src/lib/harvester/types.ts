/**
 * Tipi del Cognitive Engine — Data Ingestion / Harvester (Fase 1).
 */

export type ElectionType = "POLITICHE" | "EUROPEE" | "REGIONALI" | "COMUNALI";

export type DataSourceKind = "elections" | "istat_bes" | "polls";

export interface DataSourceMeta {
  id: string;
  kind: DataSourceKind;
  provider: string;
  retrievedAt: string;
  url?: string;
  notes?: string;
}

/** Risultato elettorale normalizzato a livello comunale */
export interface NormalizedElection {
  comuneId: string; // codice ISTAT (es. 058091)
  comuneName: string;
  year: number;
  electionType: ElectionType;
  chamber?: "CAMERA" | "SENATO" | "UNICO";
  turnout?: number;
  /** percentuali 0–100 per slug partito Italia Elect */
  shares: Record<string, number>;
  /** voti assoluti se disponibili */
  votes?: Record<string, number>;
  electorate?: number;
  voters?: number;
  source: DataSourceMeta;
  rawListaNames?: Record<string, string>; // slug → nome lista originale
}

/** Indicatore BES / benessere territoriale */
export interface NormalizedBesIndicator {
  comuneId: string;
  territoryCode: string; // REF_AREA SDMX (es. ITE4)
  territoryLevel: "comune" | "provincia" | "regione" | "nuts" | "nazionale";
  year: number;
  domain: string;
  indicatorId: string;
  indicatorLabel: string;
  sex: "T" | "M" | "F" | string;
  value: number | null;
  unit?: string;
  source: DataSourceMeta;
}

/** Sondaggio aggregato */
export interface NormalizedPoll {
  id: string;
  publishedAt: string;
  institute: string;
  sampleSize: number;
  method?: string;
  fieldworkStart?: string;
  fieldworkEnd?: string;
  /** percentuali 0–100 */
  shares: Record<string, number>;
  undecided?: number;
  source: DataSourceMeta;
}

/**
 * Formato canonico prodotto dal normalizer.
 * Ogni record ha un `kind` discriminante.
 */
export type NormalizedData =
  | { kind: "election"; data: NormalizedElection }
  | { kind: "istat_bes"; data: NormalizedBesIndicator }
  | { kind: "poll"; data: NormalizedPoll };

export interface HarvestResult<T> {
  ok: boolean;
  items: T[];
  warnings: string[];
  source: DataSourceMeta;
}

export interface ComuneElectionStore {
  comuneId: string;
  comuneName: string;
  elections: NormalizedElection[];
  updatedAt: string;
}
