/**
 * Scarica le fonti pubbliche e scrive il catalogo normalizzato.
 * Non inventa scrutini: se un file manca, resta un buco documentato in coverage.json.
 *
 *   npm run data:ingest
 */
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  canonicalListId,
  colorForList,
  ideologyForList,
  regionFromLabel,
  slugify,
} from "../../src/lib/electoral/canonical";
import type {
  CollegeTally,
  DataCatalog,
  ElectionRecord,
  ElectionSummary,
  ListTally,
  SeatScope,
  SourceRef,
  TerritoryTally,
  UninominalBloc,
} from "../../src/lib/data/types";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RAW = path.join(ROOT, "data", "raw");
const OUT = path.join(ROOT, "src", "data", "generated");
const RETRIEVED = "2026-10-23";

const DAIT = "https://dait.interno.gov.it/documenti/opendata/catalogoagid";
const SOURCES = {
  camera: `${DAIT}/camera-2022-Italia-livcomune.csv`,
  cameraVda: `${DAIT}/Camera_VAosta_LivComune.csv`,
  senato: `${DAIT}/senato-2022-italia-livcomune.csv`,
  europee: `${DAIT}/europee-2024-italia-livcomune.csv`,
  regionali: `${DAIT}/regionali-20230212.csv`,
  comunali: `${DAIT}/comunali-20240728.csv`,
  zenodo:
    "https://zenodo.org/records/13864339/files/Dati%20Eligendo%20elezioni%20politiche%20italiane.csv?download=1",
};

const DATES: Record<number, string> = {
  1946: "1946-06-02",
  1948: "1948-04-18",
  1953: "1953-06-07",
  1958: "1958-05-25",
  1963: "1963-04-28",
  1968: "1968-05-19",
  1972: "1972-05-07",
  1976: "1976-06-20",
  1979: "1979-06-03",
  1983: "1983-06-26",
  1987: "1987-06-14",
  1992: "1992-04-05",
  1994: "1994-03-27",
  1996: "1996-04-21",
  2001: "2001-05-13",
  2006: "2006-04-09",
  2008: "2008-04-13",
  2013: "2013-02-24",
  2018: "2018-03-04",
  2022: "2022-09-25",
};

async function download(url: string, filename: string): Promise<Buffer> {
  const dest = path.join(RAW, filename);
  try {
    const info = await stat(dest);
    if (info.size > 100) {
      console.log("cache", filename, info.size);
      return await readFile(dest);
    }
  } catch {
    /* scarica */
  }
  console.log("scarico", filename);
  const response = await fetch(url, {
    headers: { "user-agent": "ItaliaElectIngest/1.0 (research; +https://github.com/simonedattola/italia-elect)" },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const buf = Buffer.from(await response.arrayBuffer());
  await writeFile(dest, buf);
  console.log("  bytes", buf.length);
  return buf;
}

function decodeCsv(buf: Buffer): string {
  const utf = buf.toString("utf8");
  const bad = (utf.match(/\uFFFD/g) ?? []).length;
  return bad > 8 ? buf.toString("latin1") : utf;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = false;
      } else cur += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cur);
      cur = "";
    } else if (char === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (char !== "\r") cur += char;
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parsePercentCell(value: string): number | null {
  const cleaned = value.replace("%", "").trim().replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface DraftList {
  name: string;
  percentage: number;
  seats: number | null;
  blocIndex: number | null;
}

function parseHistorical(text: string, source: SourceRef): ElectionRecord[] {
  const rows = parseDelimited(text, ",");
  const elections: ElectionRecord[] = [];
  const box: {
    current: {
      year: number;
      turnout: number | null;
      lists: DraftList[];
      blocs: UninominalBloc[];
      bloc: number;
    } | null;
  } = { current: null };
  let pendingYear: number | null = null;

  const open = (year: number) => {
    if (box.current) elections.push(materialize(box.current, source));
    box.current = { year, turnout: null, lists: [], blocs: [], bloc: -1 };
  };

  for (const raw of rows) {
    const cells = raw.map((c) => c.trim());
    const yearCell = cells[0] ?? "";
    if (/^\d{4}$/.test(yearCell)) {
      const marker = (cells[1] ?? "").toUpperCase();
      // Il 1963 è scritto sulla riga TOTALI precedente, non su Affluenza.
      if (marker === "TOTALI") pendingYear = Number(yearCell);
      else open(Number(yearCell));
      continue;
    }
    const draft = box.current;
    if (!draft) continue;
    const meaningful = cells.filter(Boolean);
    if (meaningful.length === 0) continue;
    if (meaningful[0] === "Affluenza" && draft.lists.length > 0) {
      const inferred = pendingYear ?? (draft.year === 2018 ? 2022 : null);
      pendingYear = null;
      if (inferred) open(inferred);
      continue;
    }
    if (meaningful.includes("Votanti")) {
      const pct = meaningful.map(parsePercentCell).find((n) => n != null && n > 40 && n <= 100);
      if (pct != null) draft.turnout = pct;
      continue;
    }
    const head = meaningful[0].toUpperCase();
    if (
      head === "LISTE" ||
      head === "LISTE/GRUPPI" ||
      head.startsWith("CANDIDATI E") ||
      head.startsWith("CANDIDATI UNINOMINALI E") ||
      head === "TOTALE" ||
      head.startsWith("TOTALE ") ||
      head.startsWith("SCHED") ||
      head.startsWith("BIANCH") ||
      head.startsWith("NON VALIDE") ||
      head === "ELETTORI"
    ) {
      continue;
    }
    const numbers = meaningful.filter((cell) => !cell.includes(".") && parsePercentCell(cell) != null);
    if (head === "CANDIDATI UNINOMINALI") {
      const pct = numbers[0] != null ? parsePercentCell(numbers[0]) : null;
      const seats = numbers[1] != null ? Number(numbers[1]) : null;
      draft.bloc += 1;
      draft.blocs.push({
        index: draft.bloc,
        percentage: pct,
        seats: Number.isFinite(seats) ? seats : null,
        listIds: [],
      });
      continue;
    }
    if (numbers.length === 0) continue;
    const percentage = parsePercentCell(numbers[0]);
    if (percentage == null || percentage > 100) continue;
    const seats = numbers[1] != null && /^\d+$/.test(numbers[1]) ? Number(numbers[1]) : null;
    draft.lists.push({
      name: meaningful[0],
      percentage,
      seats,
      blocIndex: draft.bloc >= 0 ? draft.bloc : null,
    });
  }
  if (box.current) elections.push(materialize(box.current, source));
  return elections;
}

function materialize(
  draft: { year: number; turnout: number | null; lists: DraftList[]; blocs: UninominalBloc[] },
  source: SourceRef,
): ElectionRecord {
  const seatSum = draft.lists.reduce((a, l) => a + (l.seats ?? 0), 0);
  let scope: SeatScope = "totale";
  if (draft.blocs.length > 0) scope = "proporzionale";
  else if (seatSum >= 140 && seatSum <= 170) scope = "proporzionale-mattarellum";
  const used = new Map<string, number>();
  const lists: ListTally[] = draft.lists.map((list) => {
    const base = list.name.includes("#NAME?") ? `lista-nome-corrotto-${draft.year}` : slugify(list.name);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    return {
      id,
      name: list.name.includes("#NAME?") ? "Nome lista illeggibile nella compilazione (#NAME?)" : list.name,
      votes: null,
      percentage: list.percentage,
      seats: list.seats,
      seatsScope: list.seats == null ? "non-disponibile" : scope,
    };
  });
  const idByName = new Map(draft.lists.map((list, i) => [list, lists[i].id]));
  for (const list of draft.lists) {
    if (list.blocIndex == null) continue;
    const bloc = draft.blocs.find((b) => b.index === list.blocIndex);
    const id = idByName.get(list);
    if (bloc && id) bloc.listIds.push(id);
  }
  const costituente = draft.year === 1946;
  const notes = [
    "Percentuali e seggi dalla compilazione Zenodo dei dati Eligendo (DOI 10.5281/zenodo.13864339). I conteggi assoluti di quel CSV sono corrotti (numeri letti come orari) e non sono stati importati.",
  ];
  if (scope === "proporzionale") {
    notes.push(
      "I seggi accanto a ciascuna lista sono la quota proporzionale. I seggi uninominali, nel file, sono aggregati per blocco e non per lista.",
    );
  }
  if (scope === "proporzionale-mattarellum") {
    notes.push("Mattarellum: la colonna seggi del file somma a circa 155, cioè la quota proporzionale, non i seggi totali della lista.");
  }
  if (lists.some((l) => l.name.includes("#NAME?"))) {
    notes.push(
      "Una cella lista è illeggibile (#NAME?, tipico errore Excel). Il nome non è stato ricostruito, anche se la percentuale coincide con l'ordine di grandezza di una lista nota.",
    );
  }
  if (draft.year === 2022) {
    notes.push(
      "Il CSV non ripete l'anno sull'intestazione di quest'ultimo blocco. È stato attribuito al 2022 perché segue il 2018 e riporta affluenza 63,91% con le liste delle politiche 2022.",
    );
  }
  return {
    id: costituente ? "costituente-1946" : `politiche-camera-${draft.year}-bollettino`,
    level: "nazionali",
    chamber: costituente ? "costituente" : "camera",
    date: DATES[draft.year] ?? null,
    year: draft.year,
    title: costituente
      ? "Assemblea Costituente 1946"
      : `Politiche ${draft.year} — Camera, bollettino nazionale`,
    territory: "Italia",
    source,
    coverageNotes: notes,
    turnout: draft.turnout,
    electorate: null,
    voters: null,
    blankBallots: null,
    validVotes: null,
    lists,
    regions: [],
    colleges: [],
    uninominalBlocs: draft.blocs,
  };
}

function assertAnchor(elections: ElectionRecord[], year: number, fragment: string, percentage: number) {
  const election = elections.find((e) => e.year === year && (e.chamber === "camera" || e.chamber === "costituente"));
  if (!election) throw new Error(`manca l'anno ${year}`);
  const list = election.lists.find((l) => l.name.toUpperCase().includes(fragment.toUpperCase()));
  if (!list) throw new Error(`nel ${year} non trovo ${fragment}: ${election.lists.map((l) => l.name).slice(0, 8).join(" | ")}`);
  if (Math.abs(list.percentage - percentage) > 0.05) {
    throw new Error(`${year} ${list.name}: atteso ${percentage}, trovato ${list.percentage}`);
  }
}

interface SliceAgg {
  electorate: number;
  voters: number;
  blank: number;
  lists: Map<string, { name: string; votes: number }>;
}

function freshSlice(): SliceAgg {
  return { electorate: 0, voters: 0, blank: 0, lists: new Map() };
}

function addSliceMeta(target: SliceAgg, electorate: number, voters: number, blank: number) {
  target.electorate += electorate;
  target.voters += voters;
  target.blank += blank;
}

function territoryFrom(id: string, name: string, slice: SliceAgg): TerritoryTally {
  const valid = [...slice.lists.values()].reduce((a, l) => a + l.votes, 0);
  return {
    id,
    name,
    electorate: slice.electorate || null,
    voters: slice.voters || null,
    blankBallots: slice.blank || null,
    validVotes: valid || null,
    turnout: slice.electorate ? round2((100 * slice.voters) / slice.electorate) : null,
    lists: listsFromMap(slice.lists, valid),
  };
}

function listsFromMap(map: Map<string, { name: string; votes: number }>, valid: number): ListTally[] {
  return [...map.entries()]
    .map(([id, value]) => ({
      id,
      name: value.name,
      votes: value.votes,
      percentage: valid > 0 ? round2((100 * value.votes) / valid) : 0,
      seats: null,
      seatsScope: "non-disponibile" as const,
    }))
    .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
}

function aggregateScrutini(
  text: string,
  spec: { delimiter: string; regionCol: string; collegeCol: string; comuneCol: string; listCol: string; listVotesCol: string; electorateCol: string; votersCol: string; blankCol: string },
): { national: SliceAgg; regions: Map<string, SliceAgg>; colleges: Map<string, { name: string; region: string; slice: SliceAgg }> } {
  const rows = parseDelimited(text, spec.delimiter);
  const header = rows[0].map((c) => c.replace(/^\uFEFF/, "").trim());
  const idx = (name: string) => {
    const found = header.indexOf(name);
    if (found < 0) throw new Error(`colonna assente: ${name} in ${header.join(",")}`);
    return found;
  };
  const cRegion = idx(spec.regionCol);
  const cCollege = idx(spec.collegeCol);
  const cComune = idx(spec.comuneCol);
  const cList = idx(spec.listCol);
  const cVotes = idx(spec.listVotesCol);
  const cEl = idx(spec.electorateCol);
  const cVoters = idx(spec.votersCol);
  const cBlank = idx(spec.blankCol);
  const national = freshSlice();
  const regions = new Map<string, SliceAgg>();
  const colleges = new Map<string, { name: string; region: string; slice: SliceAgg }>();
  const seenMeta = new Set<string>();
  const seenList = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < header.length - 2) continue;
    const region = regionFromLabel(row[cRegion] ?? "");
    const collegeName = (row[cCollege] ?? "").trim();
    const comune = (row[cComune] ?? "").trim();
    const listName = (row[cList] ?? "").trim();
    if (!region || !collegeName || !comune || !listName) continue;
    const votes = Number(row[cVotes] ?? 0) || 0;
    const metaKey = `${collegeName}|${comune}`;
    const listKey = `${metaKey}|${listName}`;
    if (!seenMeta.has(metaKey)) {
      seenMeta.add(metaKey);
      const electorate = Number(row[cEl] ?? 0) || 0;
      const voters = Number(row[cVoters] ?? 0) || 0;
      const blank = Number(row[cBlank] ?? 0) || 0;
      addSliceMeta(national, electorate, voters, blank);
      const regionSlice = regions.get(region) ?? freshSlice();
      addSliceMeta(regionSlice, electorate, voters, blank);
      regions.set(region, regionSlice);
      const college = colleges.get(collegeName) ?? { name: collegeName, region, slice: freshSlice() };
      addSliceMeta(college.slice, electorate, voters, blank);
      colleges.set(collegeName, college);
    }
    if (seenList.has(listKey)) continue;
    seenList.add(listKey);
    const listId = slugify(listName);
    const add = (slice: SliceAgg) => {
      const prev = slice.lists.get(listId) ?? { name: listName, votes: 0 };
      prev.votes += votes;
      slice.lists.set(listId, prev);
    };
    add(national);
    add(regions.get(region)!);
    add(colleges.get(collegeName)!.slice);
  }
  return { national, regions, colleges };
}

function collegesFrom(
  colleges: Map<string, { name: string; region: string; slice: SliceAgg }>,
): CollegeTally[] {
  return [...colleges.entries()].map(([id, college]) => ({
    id: slugify(id),
    name: college.name,
    region: college.region,
    votes: [...college.slice.lists.entries()].map(([listId, value]) => ({
      id: listId,
      name: value.name,
      votes: value.votes,
    })),
  }));
}

function recordFromSlices(options: {
  id: string;
  title: string;
  chamber: ElectionRecord["chamber"];
  date: string;
  year: number;
  source: SourceRef;
  notes: string[];
  national: SliceAgg;
  regions: Map<string, SliceAgg>;
  colleges: Map<string, { name: string; region: string; slice: SliceAgg }>;
}): ElectionRecord {
  const national = territoryFrom("italia", "Italia", options.national);
  const regions = [...options.regions.entries()]
    .map(([name, slice]) => territoryFrom(slugify(name), name, slice))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
  return {
    id: options.id,
    level: "nazionali",
    chamber: options.chamber,
    date: options.date,
    year: options.year,
    title: options.title,
    territory: "Italia",
    source: options.source,
    coverageNotes: options.notes,
    turnout: national.turnout,
    electorate: national.electorate,
    voters: national.voters,
    blankBallots: national.blankBallots,
    validVotes: national.validVotes,
    lists: national.lists,
    regions,
    colleges: collegesFrom(options.colleges),
  };
}

function addVda(record: ElectionRecord, text: string) {
  const rows = parseDelimited(text, ";");
  const header = rows[0].map((c) => c.trim());
  const col = (name: string) => header.indexOf(name);
  const slice = freshSlice();
  const byComune = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const comune = (row[col("COMUNE")] ?? "").trim();
    const list = (row[col("CONTRASSEGNO")] ?? "").trim();
    const votes = Number(row[col("TOTVOTI")] ?? 0) || 0;
    if (!comune || !list) continue;
    if (!byComune.has(comune)) byComune.add(comune);
    const id = slugify(list);
    const prev = slice.lists.get(id) ?? { name: list, votes: 0 };
    prev.votes += votes;
    slice.lists.set(id, prev);
  }
  const region = territoryFrom("valle-d-aosta", "Valle d'Aosta", slice);
  region.note = "Schede e elettori non sono nello stesso tracciato del file Italia: qui ci sono solo i voti di lista per comune.";
  record.regions.push(region);
  record.regions.sort((a, b) => a.name.localeCompare(b.name, "it"));
  record.colleges.push({
    id: "valle-d-aosta-u01",
    name: "Valle d'Aosta - U01",
    region: "Valle d'Aosta",
    votes: region.lists.map((l) => ({ id: l.id, name: l.name, votes: l.votes ?? 0 })),
  });
  record.coverageNotes.push(
    "Valle d'Aosta aggiunta dal CSV separato Camera_VAosta_LivComune. I suoi voti non entrano nel totale nazionale di questo record, perché le liste sono diverse e il collegio è fuori dal riparto proporzionale.",
  );
}

function aggregateEuropee(text: string, source: SourceRef): ElectionRecord {
  const rows = parseDelimited(text, ";");
  const header = rows[0].map((c) => c.replace(/^\uFEFF/, "").trim());
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`europee, manca ${name}`);
    return i;
  };
  const cReg = col("DESCREGIONE");
  const cProv = col("DESCPROVINCIA");
  const cCom = col("DESCCOMUNE");
  const cEl = col("ELETTORI");
  const cVoters = col("VOTANTI");
  const cBlank = col("NUMSCHEDEBIANCHE");
  const cList = col("DESCLISTA");
  const cVotes = col("NUMVOTI");
  const national = freshSlice();
  const regions = new Map<string, SliceAgg>();
  const seenMeta = new Set<string>();
  const seenList = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const region = regionFromLabel(row[cReg] ?? "");
    const comune = `${row[cProv] ?? ""}|${row[cCom] ?? ""}`.trim();
    const listName = (row[cList] ?? "").trim();
    if (!region || !listName) continue;
    const metaKey = `${region}|${comune}`;
    if (!seenMeta.has(metaKey)) {
      seenMeta.add(metaKey);
      const electorate = Number(row[cEl] ?? 0) || 0;
      const voters = Number(row[cVoters] ?? 0) || 0;
      const blank = Number(row[cBlank] ?? 0) || 0;
      addSliceMeta(national, electorate, voters, blank);
      const slice = regions.get(region) ?? freshSlice();
      addSliceMeta(slice, electorate, voters, blank);
      regions.set(region, slice);
    }
    const listKey = `${metaKey}|${listName}`;
    if (seenList.has(listKey)) continue;
    seenList.add(listKey);
    const votes = Number(row[cVotes] ?? 0) || 0;
    const id = slugify(listName);
    const add = (slice: SliceAgg) => {
      const prev = slice.lists.get(id) ?? { name: listName, votes: 0 };
      prev.votes += votes;
      slice.lists.set(id, prev);
    };
    add(national);
    add(regions.get(region)!);
  }
  const nationalT = territoryFrom("italia", "Italia", national);
  return {
    id: "europee-2024",
    level: "europee",
    chamber: "parlamento-europeo",
    date: "2024-06-09",
    year: 2024,
    title: "Elezioni europee 2024 — Italia",
    territory: "Italia",
    source,
    coverageNotes: [
      "Aggregazione del CSV europeo per comune. I voti di lista sono sommati una sola volta per comune e lista. Non include il voto fuori sede pubblicato in un file separato.",
    ],
    turnout: nationalT.turnout,
    electorate: nationalT.electorate,
    voters: nationalT.voters,
    blankBallots: nationalT.blankBallots,
    validVotes: nationalT.validVotes,
    lists: nationalT.lists,
    regions: [...regions.entries()].map(([name, slice]) => territoryFrom(slugify(name), name, slice)),
    colleges: [],
  };
}

function aggregateRegionali(text: string, source: SourceRef): ElectionRecord {
  const rows = parseDelimited(text, ";");
  const header = rows[0].map((c) => c.trim());
  const col = (name: string) => header.indexOf(name);
  const regions = new Map<string, SliceAgg>();
  const provinces = new Map<string, { region: string; slice: SliceAgg }>();
  const seen = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const region = regionFromLabel(row[col("REGIONE")] ?? "");
    const province = (row[col("PROVINCIA")] ?? "").trim();
    const comune = (row[col("COMUNE")] ?? "").trim();
    const listName = (row[col("DESCRLISTA")] ?? "").trim();
    if (!region || !listName || !comune) continue;
    const key = `${region}|${comune}|${listName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const votes = Number(row[col("VOTILISTA")] ?? 0) || 0;
    const id = slugify(listName);
    const regionSlice = regions.get(region) ?? freshSlice();
    const prev = regionSlice.lists.get(id) ?? { name: listName, votes: 0 };
    prev.votes += votes;
    regionSlice.lists.set(id, prev);
    regions.set(region, regionSlice);
    const pKey = `${region}|${province}`;
    const p = provinces.get(pKey) ?? { region, slice: freshSlice() };
    const pp = p.slice.lists.get(id) ?? { name: listName, votes: 0 };
    pp.votes += votes;
    p.slice.lists.set(id, pp);
    provinces.set(pKey, p);
  }
  // Elettori: una volta per comune. Seconda passata leggera sul primo incontro.
  const seenComune = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const region = regionFromLabel(row[col("REGIONE")] ?? "");
    const comune = (row[col("COMUNE")] ?? "").trim();
    if (!region || !comune || seenComune.has(`${region}|${comune}`)) continue;
    seenComune.add(`${region}|${comune}`);
    const electorate = Number(row[col("ELETTORITOT")] ?? 0) || 0;
    const voters = Number(row[col("VOTANTITOT")] ?? 0) || 0;
    const blank = Number(row[col("SKBIANCHE")] ?? 0) || 0;
    addSliceMeta(regions.get(region)!, electorate, voters, blank);
  }
  const regionTerritories = [...regions.entries()].map(([name, slice]) => territoryFrom(slugify(name), name, slice));
  const lists = new Map<string, { name: string; votes: number }>();
  for (const slice of regions.values()) {
    for (const [id, value] of slice.lists) {
      const prev = lists.get(id) ?? { name: value.name, votes: 0 };
      prev.votes += value.votes;
      lists.set(id, prev);
    }
  }
  const valid = [...lists.values()].reduce((a, l) => a + l.votes, 0);
  const names = regionTerritories.map((r) => r.name).join(" e ");
  return {
    id: "regionali-2023-lazio-lombardia",
    level: "regionali",
    chamber: "consiglio",
    date: "2023-02-12",
    year: 2023,
    title: `Regionali 12 febbraio 2023 — ${names}`,
    territory: names,
    source,
    coverageNotes: [
      "Il CSV aperto regionali-20230212 contiene solo Lazio e Lombardia. Non è un ciclo nazionale. Le percentuali nazionali di questo record sono la somma delle due regioni, non un voto italiano.",
      "I voti di lista sono deduplicati per comune e lista: il file ripete la riga per ogni candidato.",
    ],
    turnout: null,
    electorate: regionTerritories.reduce((a, r) => a + (r.electorate ?? 0), 0),
    voters: regionTerritories.reduce((a, r) => a + (r.voters ?? 0), 0),
    blankBallots: regionTerritories.reduce((a, r) => a + (r.blankBallots ?? 0), 0),
    validVotes: valid,
    lists: listsFromMap(lists, valid),
    regions: regionTerritories,
    municipalities: [...provinces.entries()].map(([key, value]) => {
      const territory = territoryFrom(slugify(key), key.split("|")[1] || key, value.slice);
      territory.note = `Provincia · ${value.region}`;
      return territory;
    }),
    colleges: [],
  };
}

function aggregateComunali(text: string, source: SourceRef): ElectionRecord {
  const rows = parseDelimited(text, ";");
  const header = rows[0].map((c) => c.replace(/^\uFEFF/, "").trim());
  const col = (name: string) => header.indexOf(name);
  const groups = new Map<
    string,
    {
      region: string;
      province: string;
      comune: string;
      electorate: number;
      voters: number;
      blank: number;
      lists: Map<string, { name: string; votes: number; seats: number }>;
      mayor: string | null;
    }
  >();
  const codes = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const region = (row[col("REG")] ?? "").trim();
    const province = (row[col("PROV")] ?? "").trim();
    const comune = (row[col("COMUNE")] ?? "").trim();
    const listName = (row[col("DESCRLISTA")] ?? "").trim();
    if (!comune || !listName) continue;
    const key = `${region}|${province}|${comune}`;
    const group = groups.get(key) ?? {
      region,
      province,
      comune,
      electorate: Number(row[col("ELETTORITOT")] ?? 0) || 0,
      voters: Number(row[col("VOTANTITOT")] ?? 0) || 0,
      blank: Number(row[col("SKBIANCHE")] ?? 0) || 0,
      lists: new Map(),
      mayor: null,
    };
    const id = slugify(listName);
    const votes = Number(row[col("VOTILISTA")] ?? 0) || 0;
    const seats = Number(row[col("SEGGILISTA")] ?? 0) || 0;
    const prev = group.lists.get(id) ?? { name: listName, votes: 0, seats: 0 };
    prev.votes = Math.max(prev.votes, votes);
    prev.seats = Math.max(prev.seats, seats);
    group.lists.set(id, prev);
    const code = (row[col("CODTIPOELETTO")] ?? "").trim();
    codes.set(code, (codes.get(code) ?? 0) + 1);
    if (code === "S") {
      const name = `${(row[col("NOME")] ?? "").trim()} ${(row[col("COGNOME")] ?? "").trim()}`.trim();
      if (name) group.mayor = name;
    }
    groups.set(key, group);
  }
  const municipalities: TerritoryTally[] = [...groups.values()].map((group) => {
    const valid = [...group.lists.values()].reduce((a, l) => a + l.votes, 0);
    const lists: ListTally[] = [...group.lists.entries()]
      .map(([id, value]) => ({
        id,
        name: value.name,
        votes: value.votes,
        percentage: valid ? round2((100 * value.votes) / valid) : 0,
        seats: value.seats,
        seatsScope: "totale" as const,
      }))
      .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
    return {
      id: slugify(`${group.province}-${group.comune}`),
      name: group.comune,
      electorate: group.electorate,
      voters: group.voters,
      blankBallots: group.blank,
      validVotes: valid,
      turnout: group.electorate ? round2((100 * group.voters) / group.electorate) : null,
      lists,
      note: group.mayor
        ? `${group.province} · candidato con codice S nel file: ${group.mayor}`
        : group.province,
    };
  });
  municipalities.sort((a, b) => (b.voters ?? 0) - (a.voters ?? 0));
  const codeNote = [...codes.entries()].map(([k, n]) => `${k || "vuoto"}:${n}`).join(", ");
  return {
    id: "comunali-2024-07-28",
    level: "comunali",
    chamber: "comunale",
    date: "2024-07-28",
    year: 2024,
    title: "Comunali nel CSV del 28 luglio 2024",
    territory: "Comuni presenti nel file",
    source,
    coverageNotes: [
      `Comuni distinti nel file: ${municipalities.length}. Il catalogo aperto consultato il ${RETRIEVED} non pubblica l'intero storico comunale dal 1946: questo è il CSV comunali-20240728.`,
      `Il file comunali-20240609, nonostante il nome, contiene righe del 12 febbraio 2023 (Lazio e Lombardia) ed è stato scartato per non etichettarlo come comunale.`,
      `Codici CODTIPOELETTO incontrati: ${codeNote}. Il dizionario non è nel CSV; il codice S è riportato come annotazione, non come proclamazione verificata a parte.`,
      "I seggi di lista sono quelli del campo SEGGILISTA (massimo sulla riga, perché il file ripete i candidati).",
    ],
    turnout: null,
    electorate: municipalities.reduce((a, m) => a + (m.electorate ?? 0), 0),
    voters: municipalities.reduce((a, m) => a + (m.voters ?? 0), 0),
    blankBallots: null,
    validVotes: municipalities.reduce((a, m) => a + (m.validVotes ?? 0), 0),
    lists: [],
    regions: [],
    municipalities,
    colleges: [],
  };
}

function summary(election: ElectionRecord): ElectionSummary {
  return {
    id: election.id,
    level: election.level,
    chamber: election.chamber,
    date: election.date,
    year: election.year,
    title: election.title,
    territory: election.territory,
    turnout: election.turnout,
    listCount: election.level === "comunali" ? (election.municipalities?.length ?? 0) : election.lists.length,
    hasVotes: election.lists.some((l) => l.votes != null) || (election.municipalities ?? []).some((m) => m.validVotes),
    hasGeography: election.regions.length > 0 || (election.municipalities?.length ?? 0) > 0,
    topLists: [...election.lists].sort((a, b) => b.percentage - a.percentage).slice(0, 6).map((l) => ({
      id: l.id,
      name: l.name,
      percentage: l.percentage,
    })),
    coverageNotes: election.coverageNotes,
    source: election.source,
  };
}

function canonicalVotes(lists: { id: string; name: string; votes: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const list of lists) {
    const id = canonicalListId(list.name);
    out[id] = (out[id] ?? 0) + list.votes;
  }
  return out;
}

async function main() {
  await mkdir(RAW, { recursive: true });
  await mkdir(OUT, { recursive: true });
  const zenodoSource: SourceRef = {
    provider: "Compilazione Zenodo di dati Eligendo (Isidori), DOI 10.5281/zenodo.13864339",
    url: "https://zenodo.org/records/13864339",
    retrievedAt: RETRIEVED,
    notes: "Percentuali e seggi. Conteggi assoluti scartati perché corrotti nel CSV.",
  };
  const historical = parseHistorical(decodeCsv(await download(SOURCES.zenodo, "eligendo-politiche-1946-2022.csv")), zenodoSource);
  assertAnchor(historical, 1948, "DC", 48.51);
  assertAnchor(historical, 1948, "FR.DEMOCR.POPOLARE", 30.98);
  assertAnchor(historical, 2008, "PARTITO DEMOCRATICO", 33.18);
  assertAnchor(historical, 2008, "POPOLO DELLA LIBERTA", 37.38);
  assertAnchor(historical, 2013, "PARTITO DEMOCRATICO", 25.43);
  assertAnchor(historical, 2018, "MOVIMENTO 5 STELLE", 32.68);
  assertAnchor(historical, 2018, "LEGA", 17.35);
  assertAnchor(historical, 2022, "FRATELLI D'ITALIA", 25.98);
  assertAnchor(historical, 1946, "DC", 35.21);

  const cameraSource: SourceRef = {
    provider: "Ministero dell'Interno — DAIT, open data Eligendo",
    url: SOURCES.camera,
    retrievedAt: RETRIEVED,
    notes: "Scrutini Camera 2022 per comune e collegio, più il CSV separato della Valle d'Aosta.",
  };
  const cameraAgg = aggregateScrutini(decodeCsv(await download(SOURCES.camera, "camera-2022.csv")), {
    delimiter: ";",
    regionCol: "CIRC-REG",
    collegeCol: "COLLUNINOM",
    comuneCol: "COMUNE",
    listCol: "DESCRLISTA",
    listVotesCol: "VOTILISTA",
    electorateCol: "ELETTORITOT",
    votersCol: "VOTANTITOT",
    blankCol: "SKBIANCHE",
  });
  const camera = recordFromSlices({
    id: "politiche-camera-2022",
    title: "Politiche 2022 — Camera, dettaglio territoriale",
    chamber: "camera",
    date: "2022-09-25",
    year: 2022,
    source: cameraSource,
    notes: [
      "Somma del CSV per collegio uninominale e comune. Ogni lista è contata una volta per sezione territoriale: il file non ripete i candidati di lista.",
      "Il totale può scostarsi di alcuni decimi dal bollettino nazionale (record politiche-camera-2022-bollettino) se il CSV non copre ogni comune. I collegi uninominali nel file Italia sono 146 su 147; la Valle d'Aosta è nel CSV separato.",
      "Circoscrizione Estero assente.",
    ],
    ...cameraAgg,
  });
  addVda(camera, decodeCsv(await download(SOURCES.cameraVda, "camera-2022-vda.csv")));

  const senatoSource: SourceRef = {
    provider: "Ministero dell'Interno — DAIT, open data Eligendo",
    url: SOURCES.senato,
    retrievedAt: RETRIEVED,
    notes: "Scrutini Senato 2022 per comune e collegio.",
  };
  const senatoAgg = aggregateScrutini(decodeCsv(await download(SOURCES.senato, "senato-2022.csv")), {
    delimiter: ";",
    regionCol: "CIRC-REG",
    collegeCol: "COLLUNINOM",
    comuneCol: "COMUNE",
    listCol: "DESCRLISTA",
    listVotesCol: "VOTILISTA",
    electorateCol: "ELETTORITOT",
    votersCol: "VOTANTITOT",
    blankCol: "SKBIANCHE",
  });
  const senato = recordFromSlices({
    id: "politiche-senato-2022",
    title: "Politiche 2022 — Senato, dettaglio territoriale",
    chamber: "senato",
    date: "2022-09-25",
    year: 2022,
    source: senatoSource,
    notes: [
      "Stesso metodo di aggregazione della Camera. L'elettorato del Senato è più stretto (età). Circoscrizione Estero assente.",
      "Il CSV non contiene Trentino-Alto Adige né Valle d'Aosta: i loro seggi uninominali (6+1) non sono stimati. Il Trentino al Senato non ha quota proporzionale.",
    ],
    ...senatoAgg,
  });

  const europee = aggregateEuropee(
    decodeCsv(await download(SOURCES.europee, "europee-2024.csv")),
    {
      provider: "Ministero dell'Interno — DAIT, open data Eligendo",
      url: SOURCES.europee,
      retrievedAt: RETRIEVED,
      notes: "Europee 2024, livello comune.",
    },
  );
  const regionali = aggregateRegionali(
    decodeCsv(await download(SOURCES.regionali, "regionali-2023.csv")),
    {
      provider: "Ministero dell'Interno — DAIT, open data Eligendo",
      url: SOURCES.regionali,
      retrievedAt: RETRIEVED,
      notes: "Regionali del 12 febbraio 2023.",
    },
  );
  const comunali = aggregateComunali(
    decodeCsv(await download(SOURCES.comunali, "comunali-2024-07-28.csv")),
    {
      provider: "Ministero dell'Interno — DAIT, open data Eligendo",
      url: SOURCES.comunali,
      retrievedAt: RETRIEVED,
      notes: "Comunali presenti nel CSV del 28 luglio 2024.",
    },
  );

  const elections = [...historical, camera, senato, europee, regionali, comunali].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : (a.date ?? "").localeCompare(b.date ?? ""),
  );

  for (const election of elections) {
    const slim = election.level === "comunali"
      ? { ...election, municipalities: election.municipalities }
      : election;
    await writeFile(path.join(OUT, `${election.id}.json`), JSON.stringify(slim));
    console.log(
      election.id,
      "liste",
      election.lists.length,
      "regioni",
      election.regions.length,
      "collegi",
      election.colleges.length,
      "comuni",
      election.municipalities?.length ?? 0,
    );
  }

  const catalog: DataCatalog = {
    generatedAt: new Date().toISOString(),
    elections: elections.map(summary),
    gaps: [
      {
        level: "nazionali",
        detail:
          "Il bollettino compilato copre la Camera e la Costituente dal 1946 al 2022, non il Senato storico. I microdati con i voti ci sono per Camera e Senato 2022. I conteggi assoluti 1946–2018 non sono nel file utilizzabili e restano vuoti.",
      },
      {
        level: "estero",
        detail: "La circoscrizione Estero (8 deputati e 4 senatori) non è nei CSV Italia scaricati. Il modello non le assegna seggi.",
      },
      {
        level: "europee",
        detail:
          "Nel catalogo CSV del portale, alla data di scarico, c'è il dettaglio comunale delle europee 2024. Le europee 1979–2019 non sono in quel catalogo e non sono state ricostruite.",
      },
      {
        level: "regionali",
        detail:
          "Il portale descrive i cicli regionali dal 1970, ma il CSV pubblicato nel catalogo machine-readable copre solo Lazio e Lombardia del 12 febbraio 2023. Il resto non è stato inventato.",
      },
      {
        level: "comunali",
        detail: `Il CSV comunali-20240728, alla data di scarico, contiene ${comunali.municipalities?.length ?? 0} comuni (non l'universo comunale). Il file datato 20240609 è stato scartato: le righe sono del 12 febbraio 2023, non comunali.`,
      },
      {
        level: "sondaggi",
        detail:
          "Non esiste un feed ufficiale dei sondaggi. La serie nel repository è dimostrativa e resta spenta finché non si imposta POLLS_JSON_URL o non la si attiva a mano.",
      },
      {
        level: "sentiment",
        detail:
          "Sentiment e rassegna non hanno una fonte di default. Senza SOCIAL_API_URL e NEWS_API_URL i fattori restano a zero.",
      },
    ],
    sources: [zenodoSource, cameraSource, senatoSource, europee.source, regionali.source, comunali.source],
  };
  await writeFile(path.join(OUT, "catalog.json"), JSON.stringify(catalog, null, 2));

  const cameraLists = camera.lists.map((list) => ({
    id: canonicalListId(list.name),
    name: list.name,
    color: colorForList(canonicalListId(list.name)),
    percentage: list.percentage,
    votes: list.votes ?? 0,
    ideology: ideologyForList(canonicalListId(list.name)),
  }));
  const merged = new Map<string, (typeof cameraLists)[number]>();
  for (const list of cameraLists) {
    const prev = merged.get(list.id);
    if (!prev) merged.set(list.id, { ...list });
    else prev.votes += list.votes;
  }
  const mergedValid = [...merged.values()].reduce((a, l) => a + l.votes, 0) || 1;
  const baseline = {
    generatedAt: catalog.generatedAt,
    note: "Identificativi canonici per il modello. L'archivio mantiene i nomi ufficiali senza accorpamenti. La Valle d'Aosta non è in queste percentuali.",
    camera: {
      lists: [...merged.values()]
        .map((l) => ({ ...l, percentage: round2((100 * l.votes) / mergedValid) }))
        .sort((a, b) => b.percentage - a.percentage),
      colleges: camera.colleges
        .filter((c) => c.region !== "Valle d'Aosta")
        .map((c) => ({
          id: c.id,
          name: c.name,
          region: c.region,
          votes: canonicalVotes(c.votes),
        })),
    },
    senate: {
      regions: senato.regions.map((region) => ({
        region: region.name,
        votes: canonicalVotes(region.lists.map((l) => ({ id: l.id, name: l.name, votes: l.votes ?? 0 }))),
      })),
      colleges: senato.colleges.map((c) => ({
        id: c.id,
        name: c.name,
        region: c.region,
        votes: canonicalVotes(c.votes),
      })),
    },
    europee: {
      lists: europee.lists.map((l) => ({
        id: canonicalListId(l.name),
        name: l.name,
        color: colorForList(canonicalListId(l.name)),
        percentage: l.percentage,
        votes: l.votes,
        ideology: ideologyForList(canonicalListId(l.name)),
      })),
      regions: europee.regions.map((r) => ({ id: r.id, name: r.name, lists: r.lists })),
    },
    regionali: regionali.regions.map((r) => ({
      id: r.id,
      name: r.name,
      turnout: r.turnout,
      lists: r.lists.map((l) => ({
        id: canonicalListId(l.name),
        name: l.name,
        color: colorForList(canonicalListId(l.name)),
        percentage: l.percentage,
        votes: l.votes,
        ideology: ideologyForList(canonicalListId(l.name)),
      })),
    })),
  };
  await writeFile(path.join(OUT, "simulator-baseline.json"), JSON.stringify(baseline));

  const cases = elections
    .map(
      (e) =>
        `    case ${JSON.stringify(e.id)}:\n      return (await import(${JSON.stringify(`./${e.id}.json`)})).default as ElectionRecord;`,
    )
    .join("\n");
  const registry = `/* Generato da scripts/ingest/build-catalog.ts. Non modificare a mano. */\nimport type { ElectionRecord } from "@/lib/data/types";\nimport catalog from "./catalog.json";\nimport baseline from "./simulator-baseline.json";\nimport type { DataCatalog } from "@/lib/data/types";\n\nexport const dataCatalog = catalog as DataCatalog;\nexport const simulatorBaseline = baseline;\n\nexport async function loadElection(id: string): Promise<ElectionRecord | null> {\n  switch (id) {\n${cases}\n    default: {\n      const pack = (await import("./eligendo-historical.json")).default as { records: Record<string, ElectionRecord> };\n      return pack.records[id] ?? null;\n    }\n  }\n}\n`;
  await writeFile(path.join(OUT, "registry.ts"), registry);
  console.log("elezioni", elections.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
