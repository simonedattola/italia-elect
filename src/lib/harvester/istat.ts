/**
 * Harvester ISTAT BES — benessere equo e sostenibile (SDMX REST).
 * Endpoint: https://esploradati.istat.it/SDMXWS/rest
 *
 * Nota: DF_BES_TERRIT_0 espone territori NUTS/province/regioni, non tutti i comuni.
 * Per Roma (058091) associamo ITE4 (Lazio) e IT108 (area metropolitana se presente).
 */

import { promises as fs } from "fs";
import path from "path";
import type { HarvestResult, NormalizedBesIndicator } from "./types";

const DATA_DIR = path.join(process.cwd(), "src/data/istat");
const SDMX_BASE = "https://esploradati.istat.it/SDMXWS/rest";
const USER_AGENT = "ItaliaElect/3.0 (cognitive-engine; educational)";

/** Mapping comune ISTAT → REF_AREA BES più vicina */
export const COMUNE_TO_BES_AREA: Record<
  string,
  { territoryCode: string; territoryLevel: NormalizedBesIndicator["territoryLevel"]; label: string }
> = {
  "058091": {
    territoryCode: "ITE4",
    territoryLevel: "regione",
    label: "Lazio (proxy BES per Roma Capitale)",
  },
};

const INDICATOR_LABELS: Record<string, string> = {
  "01SAL001": "Speranza di vita alla nascita",
  "01SAL004": "Speranza di vita in buona salute alla nascita",
  "01SAL005": "Mortalità infantile",
  "02IST001": "Partecipazione alla forza lavoro",
  "03LAV001": "Tasso di occupazione",
  "03LAV008": "Tasso di disoccupazione",
  "04ECO001": "Reddito medio disponibile",
  "05REL001": "Persone che hanno parenti/amici su cui contare",
  "06POL001": "Partecipazione sociale",
  "07SIC001": "Omicidi",
  "08SUB001": "Soddisfazione per la vita",
  "09AMB001": "Emissioni di CO2 e altri gas clima-alteranti",
  "10PAE001": "Verde urbano",
  "11INN001": "Intensità di ricerca",
  "12QUA001": "Posti letto in degenza ordinaria",
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

export async function harvestBes(opts?: {
  comuneId?: string;
  startPeriod?: string;
  endPeriod?: string;
  dryRun?: boolean;
}): Promise<HarvestResult<NormalizedBesIndicator>> {
  const warnings: string[] = [];
  const start = opts?.startPeriod ?? "2020";
  const end = opts?.endPeriod ?? "2024";
  const url =
    `${SDMX_BASE}/data/DF_BES_TERRIT_0/all` +
    `?startPeriod=${start}&endPeriod=${end}&format=csv&lastNObservations=1`;

  let csv: string | null = null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/csv,*/*" },
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      warnings.push(`ISTAT SDMX HTTP ${res.status}`);
    } else {
      csv = await res.text();
    }
  } catch (e) {
    warnings.push(`ISTAT SDMX errore: ${e instanceof Error ? e.message : String(e)}`);
  }

  const retrievedAt = new Date().toISOString();
  const source = {
    id: "istat-bes-territ",
    kind: "istat_bes" as const,
    provider: "ISTAT — SDMX DF_BES_TERRIT_0",
    retrievedAt,
    url,
    notes:
      "BES territoriale a livello NUTS/regione/provincia. I comuni sono collegati via proxy territoriale.",
  };

  let items: NormalizedBesIndicator[] = [];

  if (csv && csv.length > 100 && !csv.startsWith("NoRecords") && !csv.startsWith("Not enough")) {
    const rows = parseCsv(csv);
    const targetAreas = new Set(
      opts?.comuneId
        ? [COMUNE_TO_BES_AREA[opts.comuneId]?.territoryCode].filter(Boolean)
        : Object.values(COMUNE_TO_BES_AREA).map((x) => x.territoryCode)
    );
    // include IT108 if harvesting Roma
    if (opts?.comuneId === "058091" || !opts?.comuneId) targetAreas.add("IT108");
    targetAreas.add("ITE4");

    const comuneId = opts?.comuneId ?? "058091";
    const mapping =
      COMUNE_TO_BES_AREA[comuneId] ??
      ({
        territoryCode: "ITE4",
        territoryLevel: "regione" as const,
        label: "proxy",
      });

    for (const row of rows) {
      const area = row.REF_AREA;
      if (!targetAreas.has(area)) continue;
      if (row.SEX && row.SEX !== "T" && row.SEX !== "") continue;
      const value = row.OBS_VALUE ? Number(row.OBS_VALUE) : null;
      const year = Number(row.TIME_PERIOD);
      if (!Number.isFinite(year)) continue;
      const indicatorId = row.DATA_TYPE || row.NOTE_DATA_TYPE_DESCR || "unknown";
      items.push({
        comuneId,
        territoryCode: area,
        territoryLevel: area === "IT" ? "nazionale" : mapping.territoryLevel,
        year,
        domain: row.DOMAIN || "",
        indicatorId,
        indicatorLabel: INDICATOR_LABELS[indicatorId] ?? indicatorId,
        sex: (row.SEX || "T") as "T",
        value: Number.isFinite(value as number) ? (value as number) : null,
        unit: row.UNIT_MEAS || undefined,
        source,
      });
    }
  } else {
    warnings.push("Download BES fallito o vuoto — uso seed locale se presente.");
    items = await loadBesSeed(opts?.comuneId);
  }

  if (!items.length) {
    items = await loadBesSeed(opts?.comuneId);
  }

  if (!opts?.dryRun && items.length) {
    await persistBes(items);
  }

  return { ok: items.length > 0, items, warnings, source };
}

async function loadBesSeed(comuneId?: string): Promise<NormalizedBesIndicator[]> {
  try {
    const file = path.join(DATA_DIR, `${comuneId ?? "058091"}.json`);
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as {
      indicators: NormalizedBesIndicator[];
    };
    return raw.indicators ?? [];
  } catch {
    return [];
  }
}

export async function persistBes(items: NormalizedBesIndicator[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const byComune = new Map<string, NormalizedBesIndicator[]>();
  for (const item of items) {
    const list = byComune.get(item.comuneId) ?? [];
    list.push(item);
    byComune.set(item.comuneId, list);
  }
  for (const [comuneId, indicators] of byComune) {
    await fs.writeFile(
      path.join(DATA_DIR, `${comuneId}.json`),
      JSON.stringify(
        {
          comuneId,
          updatedAt: new Date().toISOString(),
          indicators,
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

export async function readBes(comuneId: string): Promise<NormalizedBesIndicator[]> {
  try {
    const raw = JSON.parse(
      await fs.readFile(path.join(DATA_DIR, `${comuneId}.json`), "utf8")
    ) as { indicators: NormalizedBesIndicator[] };
    return raw.indicators ?? [];
  } catch {
    return [];
  }
}

export { DATA_DIR as ISTAT_DATA_DIR };
