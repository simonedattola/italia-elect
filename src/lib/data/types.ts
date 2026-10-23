/**
 * Schema normalizzato degli scrutini.
 * I campi assenti in fonte restano null: non si stimano conteggi mancanti.
 */

export type ElectionLevel = "nazionali" | "europee" | "regionali" | "comunali" | "referendum";

export type Chamber = "camera" | "senato" | "costituente" | "parlamento-europeo" | "consiglio" | "comunale" | "referendum";

export type SeatScope = "totale" | "proporzionale" | "proporzionale-mattarellum" | "non-disponibile";

export interface SourceRef {
  provider: string;
  url: string;
  retrievedAt: string;
  notes: string;
}

export interface ListTally {
  id: string;
  name: string;
  votes: number | null;
  /** Percentuale sui voti di lista validi, quando i voti ci sono; altrimenti percentuale pubblicata. */
  percentage: number;
  seats: number | null;
  seatsScope: SeatScope;
}

export interface TerritoryTally {
  id: string;
  name: string;
  electorate: number | null;
  voters: number | null;
  blankBallots: number | null;
  validVotes: number | null;
  turnout: number | null;
  lists: ListTally[];
  /** Annotazione di fonte, per esempio il sindaco eletto. */
  note?: string;
}

export interface CollegeTally {
  id: string;
  name: string;
  region: string;
  votes: { id: string; name: string; votes: number }[];
}

export interface UninominalBloc {
  /** Ordine di apparizione nel bollettino compilato. */
  index: number;
  percentage: number | null;
  seats: number | null;
  listIds: string[];
}

export interface ElectionRecord {
  id: string;
  level: ElectionLevel;
  chamber: Chamber;
  date: string | null;
  year: number;
  title: string;
  territory: string;
  source: SourceRef;
  /** Note di copertura specifiche di questo scrutinio. */
  coverageNotes: string[];
  turnout: number | null;
  electorate: number | null;
  voters: number | null;
  blankBallots: number | null;
  validVotes: number | null;
  lists: ListTally[];
  regions: TerritoryTally[];
  /** Presente solo se la fonte distingue i comuni. */
  municipalities?: TerritoryTally[];
  colleges: CollegeTally[];
  uninominalBlocs?: UninominalBloc[];
}

export interface ElectionSummary {
  id: string;
  level: ElectionLevel;
  chamber: Chamber;
  date: string | null;
  year: number;
  title: string;
  territory: string;
  turnout: number | null;
  listCount: number;
  hasVotes: boolean;
  hasGeography: boolean;
  topLists: { id: string; name: string; percentage: number }[];
  coverageNotes: string[];
  source: SourceRef;
}

export interface CoverageGap {
  level: ElectionLevel | "estero" | "sondaggi" | "sentiment" | "referendum";
  detail: string;
}

export interface DataCatalog {
  generatedAt: string;
  elections: ElectionSummary[];
  gaps: CoverageGap[];
  sources: SourceRef[];
}
