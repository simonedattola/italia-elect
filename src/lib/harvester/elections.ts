/**
 * Harvester elezioni — Ministero dell'Interno / Eligendo.
 *
 * Strategia:
 * 1. Tentativo live su eleapi.interno.gov.it (può essere geo-bloccato)
 * 2. Fallback open-data Eligendo via mirror ondata (stessi CSV ufficiali)
 * 3. Persistenza in src/data/elections/
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  ComuneElectionStore,
  HarvestResult,
  NormalizedElection,
} from "./types";
import { mapListaToSlug, normalizeShares } from "./partyMap";

const DATA_DIR = path.join(process.cwd(), "src/data/elections");
const USER_AGENT = "ItaliaElect/3.0 (cognitive-engine; educational; +https://github.com/simonedattola/italia-elect)";

/** Dataset Eligendo Politiche 2022 Camera (fonte Ministero, mirror ondata) */
const ELIGENDO_CAMERA_2022 =
  "https://raw.githubusercontent.com/ondata/elezioni-politiche-2022/main/affluenza-risultati/dati/Eligendo/processing/Politiche2022_Scrutini_Camera_Italia.csv";

export interface ElectionHarvestOptions {
  year: number;
  electionType?: NormalizedElection["electionType"];
  comuneIds?: string[];
  /** Se true, non scrive su disco */
  dryRun?: boolean;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/csv,application/json,*/*",
        Origin: "https://elezioni.interno.gov.it",
        Referer: "https://elezioni.interno.gov.it/",
      },
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Tentativo eleapi (spesso 403 fuori rete IT) */
export async function tryEleapiLive(year: number): Promise<{
  ok: boolean;
  message: string;
  body?: string;
}> {
  const dateByYear: Record<number, string> = {
    2022: "20220925",
    2018: "20180304",
    2019: "20190526",
    2024: "20240609",
  };
  const de = dateByYear[year];
  if (!de) {
    return { ok: false, message: `Nessun mapping DE per anno ${year}` };
  }
  const url = `https://eleapi.interno.gov.it/siel/PX/getenti/DE/${de}/TE/02`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        Origin: "https://elezioni.interno.gov.it",
        Referer: "https://elezioni.interno.gov.it/",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        message: `eleapi HTTP ${res.status}: ${body.slice(0, 120)}`,
        body,
      };
    }
    return { ok: true, message: "eleapi ok", body };
  } catch (e) {
    return {
      ok: false,
      message: `eleapi errore: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

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

function aggregateEligendoCamera(
  rows: Record<string, string>[],
  filterComuneIds?: string[]
): NormalizedElection[] {
  type Acc = {
    comuneId: string;
    comuneName: string;
    votes: Record<string, number>;
    rawNames: Record<string, string>;
    electorate: number;
    voters: number;
    collegi: Set<string>;
  };
  const byComune = new Map<string, Acc>();

  for (const row of rows) {
    const comuneId = (row["CODICE ISTAT"] || "").padStart(6, "0");
    if (!comuneId || comuneId.length < 5) continue;
    if (filterComuneIds && !filterComuneIds.includes(comuneId)) continue;

    const lista = row["LISTA"] || "";
    const slug = mapListaToSlug(lista) ?? "other";
    const votiListe = Number(String(row["VOTI LISTE"] || "0").replace(",", "."));
    if (!Number.isFinite(votiListe) || votiListe <= 0) continue;

    let acc = byComune.get(comuneId);
    if (!acc) {
      acc = {
        comuneId,
        comuneName: row["COMUNE"] || comuneId,
        votes: {},
        rawNames: {},
        electorate: 0,
        voters: 0,
        collegi: new Set(),
      };
      byComune.set(comuneId, acc);
    }
    acc.votes[slug] = (acc.votes[slug] ?? 0) + votiListe;
    if (slug !== "other") acc.rawNames[slug] = lista;
    const collegio = row["COLLEGIO UNINOMINALE"] || row["cod"] || "";
    if (collegio && !acc.collegi.has(collegio)) {
      acc.collegi.add(collegio);
      acc.electorate += Number(row["ELETTORI TOTALI"] || 0) || 0;
      acc.voters += Number(row["VOTANTI TOTALI"] || 0) || 0;
    }
  }

  const retrievedAt = new Date().toISOString();
  const source = {
    id: "eligendo-camera-2022",
    kind: "elections" as const,
    provider: "Ministero dell'Interno — Eligendo (via open data / ondata mirror)",
    retrievedAt,
    url: ELIGENDO_CAMERA_2022,
    notes:
      "Aggregazione VOTI LISTE per codice ISTAT. eleapi live può essere indisponibile: si usa CSV ufficiale Eligendo.",
  };

  const out: NormalizedElection[] = [];
  for (const acc of byComune.values()) {
    const total = Object.values(acc.votes).reduce((a, b) => a + b, 0);
    const pct: Record<string, number> = {};
    for (const [slug, v] of Object.entries(acc.votes)) {
      pct[slug] = total > 0 ? (v / total) * 100 : 0;
    }
    out.push({
      comuneId: acc.comuneId,
      comuneName: acc.comuneName,
      year: 2022,
      electionType: "POLITICHE",
      chamber: "CAMERA",
      turnout:
        acc.electorate > 0
          ? Math.round((acc.voters / acc.electorate) * 1000) / 10
          : undefined,
      shares: normalizeShares(pct, { includeOther: false }),
      votes: acc.votes,
      electorate: acc.electorate || undefined,
      voters: acc.voters || undefined,
      source,
      rawListaNames: acc.rawNames,
    });
  }
  return out;
}

/**
 * Scarica risultati per anno e li salva in src/data/elections/.
 * Per il 2022 usa CSV Camera Eligendo; altri anni: seed curati se presenti.
 */
export async function harvestElections(
  opts: ElectionHarvestOptions
): Promise<HarvestResult<NormalizedElection>> {
  const warnings: string[] = [];
  const year = opts.year;
  const electionType = opts.electionType ?? "POLITICHE";

  const live = await tryEleapiLive(year);
  if (!live.ok) {
    warnings.push(`eleapi non usabile: ${live.message}`);
  } else {
    warnings.push("eleapi raggiungibile ma parser completo non ancora collegato; uso open data CSV.");
  }

  let items: NormalizedElection[] = [];

  if (year === 2022 && electionType === "POLITICHE") {
    const csv = await fetchText(ELIGENDO_CAMERA_2022);
    if (!csv) {
      warnings.push("Download CSV Eligendo fallito — provo seed locale.");
      items = await loadLocalElectionSeeds(opts.comuneIds);
    } else {
      items = aggregateEligendoCamera(parseCsv(csv), opts.comuneIds);
      if (!items.length) {
        warnings.push("CSV scaricato ma nessun comune aggregato.");
        items = await loadLocalElectionSeeds(opts.comuneIds);
      }
    }
  } else {
    items = await loadLocalElectionSeeds(opts.comuneIds, year, electionType);
    if (!items.length) {
      warnings.push(
        `Nessun dataset live per ${electionType} ${year}: usa seed in src/data/elections/ o estendi l'harvester.`
      );
    }
  }

  if (!opts.dryRun && items.length) {
    await persistElections(items);
  }

  return {
    ok: items.length > 0,
    items,
    warnings,
    source: items[0]?.source ?? {
      id: "elections-none",
      kind: "elections",
      provider: "n/a",
      retrievedAt: new Date().toISOString(),
    },
  };
}

async function loadLocalElectionSeeds(
  comuneIds?: string[],
  year?: number,
  electionType?: NormalizedElection["electionType"]
): Promise<NormalizedElection[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const files = await fs.readdir(DATA_DIR);
    const out: NormalizedElection[] = [];
    for (const file of files) {
      if (!file.endsWith(".json") || file === "index.json") continue;
      const raw = JSON.parse(
        await fs.readFile(path.join(DATA_DIR, file), "utf8")
      ) as ComuneElectionStore | NormalizedElection;
      if ("elections" in raw) {
        for (const e of raw.elections) {
          if (comuneIds && !comuneIds.includes(e.comuneId)) continue;
          if (year && e.year !== year) continue;
          if (electionType && e.electionType !== electionType) continue;
          out.push(e);
        }
      } else if ("comuneId" in raw) {
        if (comuneIds && !comuneIds.includes(raw.comuneId)) continue;
        if (year && raw.year !== year) continue;
        if (electionType && raw.electionType !== electionType) continue;
        out.push(raw);
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function persistElections(
  items: NormalizedElection[]
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const byComune = new Map<string, NormalizedElection[]>();
  for (const item of items) {
    const list = byComune.get(item.comuneId) ?? [];
    // replace same year+type+chamber
    const filtered = list.filter(
      (e) =>
        !(
          e.year === item.year &&
          e.electionType === item.electionType &&
          e.chamber === item.chamber
        )
    );
    filtered.push(item);
    byComune.set(item.comuneId, filtered);
  }

  // merge with existing files
  for (const [comuneId, elections] of byComune) {
    const file = path.join(DATA_DIR, `${comuneId}.json`);
    let existing: ComuneElectionStore | null = null;
    try {
      existing = JSON.parse(await fs.readFile(file, "utf8")) as ComuneElectionStore;
    } catch {
      existing = null;
    }
    const merged = new Map<string, NormalizedElection>();
    for (const e of existing?.elections ?? []) {
      merged.set(`${e.year}:${e.electionType}:${e.chamber ?? ""}`, e);
    }
    for (const e of elections) {
      merged.set(`${e.year}:${e.electionType}:${e.chamber ?? ""}`, e);
    }
    const store: ComuneElectionStore = {
      comuneId,
      comuneName: elections[0]?.comuneName ?? existing?.comuneName ?? comuneId,
      elections: [...merged.values()].sort((a, b) => a.year - b.year),
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(file, JSON.stringify(store, null, 2), "utf8");
  }

  await fs.writeFile(
    path.join(DATA_DIR, "index.json"),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        comuni: [...byComune.keys()].sort(),
      },
      null,
      2
    ),
    "utf8"
  );
}

export async function readComuneElections(
  comuneId: string
): Promise<ComuneElectionStore | null> {
  try {
    const file = path.join(DATA_DIR, `${comuneId}.json`);
    return JSON.parse(await fs.readFile(file, "utf8")) as ComuneElectionStore;
  } catch {
    return null;
  }
}

export { DATA_DIR as ELECTIONS_DATA_DIR, ELIGENDO_CAMERA_2022 };
