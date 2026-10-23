export type ScenarioTheme =
  | "migration"
  | "recession"
  | "inflation"
  | "energy"
  | "security"
  | "corruption"
  | "war"
  | "pandemic"
  | "growth"
  | "environment"
  | "leader";

export type ScenarioDuration = "breve" | "media" | "lunga";
export type ScenarioScope = "nazionale" | "regionale" | "comunale";
export type ContestLevel = "nazionali" | "europee" | "regionali" | "comunali";

export interface ScenarioInput {
  id: string;
  title: string;
  /** 0 = nessuno spostamento, 1 = intensità piena dello schema. */
  intensity: number;
  duration: ScenarioDuration;
  scope: ScenarioScope;
  territory?: string;
  themes: Partial<Record<ScenarioTheme, number>>;
  /** Liste colpite da uno scandalo. Senza id lo schema usa gli incumbenti nazionali. */
  affectedPartyIds?: string[];
  /** Da dove arriva lo scenario, solo per la nota. */
  origin?: "preset" | "custom" | "drawn" | "text";
}

export interface ScenarioMovement {
  id: string;
  before: number;
  after: number;
  delta: number;
}

export interface ScenarioApplication {
  shares: Record<string, number>;
  notes: string[];
  movements: ScenarioMovement[];
}
