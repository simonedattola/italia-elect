import { readFileSync } from "fs";
import path from "path";

export interface HistoricalFigure {
  key: string;
  names: string[];
  ideologyScore: number;
  reputation: number;
  partyCompatibility: Record<string, number>;
  notes?: string;
}

let cache: HistoricalFigure[] | null = null;

export function loadHistoricalFigures(): HistoricalFigure[] {
  if (cache) return cache;
  const p = path.join(process.cwd(), "src/data/historicalFigures.json");
  cache = JSON.parse(readFileSync(p, "utf8")) as HistoricalFigure[];
  return cache;
}

export function matchHistoricalFigure(
  firstName: string,
  lastName: string,
): HistoricalFigure | null {
  const figures = loadHistoricalFigures();
  const fn = firstName.trim().toLowerCase();
  const ln = lastName.trim().toLowerCase();
  return (
    figures.find(
      (f) =>
        f.names[0]?.toLowerCase() === fn && f.names[1]?.toLowerCase() === ln,
    ) ?? null
  );
}
