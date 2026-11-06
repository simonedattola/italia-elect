/**
 * Backtest pre-voto: media dei sondaggi pubblicati prima del silenzio elettorale,
 * confrontata con lo scrutinio. I seggi uninominali non si assegnano:
 * non c'è una baseline di collegio precedente al voto.
 */

import backtestPolls from "@/data/polls/backtest.json";
import targets from "@/data/generated/eligendo-targets.json";
import europee2024 from "@/data/generated/europee-2024.json";
import camera2022 from "@/data/generated/politiche-camera-2022-bollettino.json";
import { allocateProportional, type ContestList } from "@/lib/electoral/rosatellum";
import { aggregatePolls, type PollRecord } from "@/lib/model/aggregatePolls";

interface TargetList {
  id: string;
  name: string;
  percentage: number;
  seats: number | null;
}

interface TargetFile {
  [id: string]: {
    date: string;
    lists: TargetList[];
    validVotes: number | null;
    source: { url: string };
  };
}

interface PollFile {
  retrievedAt: string;
  elections: {
    id: string;
    election: string;
    cutoff: string;
    source: string;
    polls: { publishedAt: string; institute: string; sampleSize: number | null; shares: Record<string, number> }[];
  }[];
}

export interface BacktestComparison {
  id: string;
  predicted: number;
  official: number;
}

export interface BacktestRow {
  id: string;
  label: string;
  election: string;
  cutoff: string;
  pollCount: number;
  institutes: number;
  listMae: number;
  coalitionMae: number | null;
  proportionalSeatError: number | null;
  proportionalSeatMae: number | null;
  seatTotal: number | null;
  lists: BacktestComparison[];
  coalitions: BacktestComparison[];
  seats: { id: string; predicted: number; official: number }[];
  sourcePolls: string;
  sourceResult: string;
  note: string;
}

/** Seggi della delegazione italiana. Fonte: infobox Wikipedia delle due elezioni; il 2024 nell'infobox somma 75, il seggio che manca è l'SVP. */
const EUROPEAN_SEATS: Record<string, Record<string, number>> = {
  "europee-2019": {
    lega: 29,
    "partito-democratico": 19,
    "movimento-5-stelle": 14,
    "forza-italia": 7,
    "fratelli-ditalia": 6,
    svp: 1,
  },
  "europee-2024": {
    "fratelli-ditalia": 24,
    "partito-democratico": 21,
    "movimento-5-stelle": 8,
    "forza-italia": 8,
    lega: 8,
    avss: 6,
    svp: 1,
  },
};

const POLLS = backtestPolls as PollFile;
const TARGETS: TargetFile = {
  ...(targets as TargetFile),
  "europee-2024": {
    date: "2024-06-09",
    lists: (europee2024 as { lists: TargetList[] }).lists,
    validVotes: (europee2024 as { validVotes: number | null }).validVotes,
    source: (europee2024 as { source: { url: string } }).source,
  },
  "politiche-camera-2022-bollettino": {
    date: "2022-09-25",
    lists: (camera2022 as { lists: TargetList[] }).lists,
    validVotes: (camera2022 as { validVotes: number | null }).validVotes,
    source: (camera2022 as { source: { url: string } }).source,
  },
};

const CASES: {
  id: string;
  label: string;
  targetId: string;
  kind: "camera" | "europee";
  seatTotal: number;
  threshold: number;
  coalitions: Record<string, string>;
  aliases: Record<string, string[]>;
  /** Somma gli alias anche se la lista principale è già nel sondaggio (liste congiunte spezzate in colonna). */
  sumAliases?: string[];
}[] = [
  {
    id: "camera-2018",
    label: "Camera 2018",
    targetId: "politiche-camera-2018-eligendo",
    kind: "camera",
    seatTotal: 386,
    threshold: 0.03,
    coalitions: {
      lega: "cdx",
      "forza-italia": "cdx",
      "fratelli-ditalia": "cdx",
      "noi-con-litalia": "cdx",
      "partito-democratico": "csx",
      "piu-europa": "csx",
      "italia-europa-insieme": "csx",
      "civica-popolare": "csx",
    },
    aliases: {
      "noi-con-litalia": ["noi-con-litalia", "udc"],
    },
  },
  {
    id: "camera-2022",
    label: "Camera 2022",
    targetId: "politiche-camera-2022-bollettino",
    kind: "camera",
    seatTotal: 245,
    threshold: 0.03,
    coalitions: {
      "fratelli-ditalia": "cdx",
      lega: "cdx",
      "forza-italia": "cdx",
      "noi-moderati": "cdx",
      "partito-democratico": "csx",
      avss: "csx",
      "piu-europa": "csx",
      "impegno-civico": "csx",
    },
    aliases: {
      avss: ["avss", "europa-verde", "sinistra-italiana", "articolo-uno"],
      "azione-iv": ["azione-iv", "azione", "italia-viva"],
      "noi-moderati": ["noi-moderati"],
    },
  },
  {
    id: "europee-2019",
    label: "Europee 2019",
    targetId: "europee-2019",
    kind: "europee",
    seatTotal: 76,
    threshold: 0.04,
    coalitions: {},
    aliases: {},
  },
  {
    id: "europee-2024",
    label: "Europee 2024",
    targetId: "europee-2024",
    kind: "europee",
    seatTotal: 76,
    threshold: 0.04,
    coalitions: {},
    aliases: {
      avss: ["avss", "europa-verde", "sinistra-italiana"],
      "forza-italia": ["forza-italia", "noi-moderati"],
    },
    sumAliases: ["forza-italia"],
  },
];

export function officialListId(name: string): string {
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (n.includes("FRATELLI")) return "fratelli-ditalia";
  if (n.includes("5 STELLE")) return "movimento-5-stelle";
  if (n.includes("PARTITO DEMOCRATICO")) return "partito-democratico";
  if (n.includes("LIBERI E UGUALI")) return "liberi-e-uguali";
  if (n.includes("POTERE AL POPOLO")) return "potere-al-popolo";
  if (n.includes("VERDI E SINISTRA") || n.includes("VERDI-SINISTRA")) return "avss";
  if (n.includes("NOI CON")) return "noi-con-litalia";
  if (n.includes("FORZA ITALIA")) return "forza-italia";
  if (n.includes("NOI MODERATI")) return "noi-moderati";
  if (n.includes("INSIEME")) return "italia-europa-insieme";
  if (n.includes("CIVICA POPOLARE")) return "civica-popolare";
  if (n.includes("IMPEGNO CIVICO")) return "impegno-civico";
  if (n.includes("AZIONE") && n.includes("ITALIA VIVA")) return "azione-iv";
  if (n.includes("ITALIA VIVA")) return "italia-viva";
  if (n.includes("AZIONE")) return "azione";
  if (n.includes("EUROPA VERDE")) return "europa-verde";
  if (n.includes("STATI UNITI")) return "stati-uniti-europa";
  if (n.includes("EUROPA")) return "piu-europa";
  if (n.includes("LEGA")) return "lega";
  if (n.includes("ITALEXIT")) return "italexit";
  if (n.includes("UNIONE POPOLARE")) return "unione-popolare";
  if (n.includes("SVP") || n.includes("SUDTIROL")) return "svp";
  return name.toLowerCase();
}

function forecastShare(
  shares: Record<string, number>,
  id: string,
  aliases: Record<string, string[]>,
  sumAliases: boolean,
): number | null {
  const parts = aliases[id] ?? [id];
  if (!sumAliases && shares[id] != null && parts[0] === id) return shares[id];
  const present = parts.map((part) => shares[part]).filter((value): value is number => value != null);
  if (present.length === 0) return shares[id] ?? null;
  return present.reduce((sum, value) => sum + value, 0);
}

function meanAbs(rows: { predicted: number; official: number }[]): number | null {
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => sum + Math.abs(row.predicted - row.official), 0) / rows.length;
}

function halfL1(rows: { predicted: number; official: number }[]): number | null {
  if (rows.length === 0) return null;
  const distance = rows.reduce((sum, row) => sum + Math.abs(row.predicted - row.official), 0);
  return distance / 2;
}

export function runBacktests(halfLifeDays = 21): BacktestRow[] {
  return CASES.map((spec) => {
    const pollCase = POLLS.elections.find((item) => item.id === spec.id);
    const target = TARGETS[spec.targetId];
    if (!pollCase || !target) {
      throw new Error(`Backtest incompleto: ${spec.id}`);
    }
    const seen = new Set<string>();
    const polls: PollRecord[] = [];
    for (const poll of pollCase.polls) {
      const key = `${poll.publishedAt}|${poll.institute}|${Object.entries(poll.shares)
        .map(([id, value]) => `${id}:${value}`)
        .join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      polls.push({
        id: key.slice(0, 80),
        institute: poll.institute,
        publishedAt: poll.publishedAt,
        sampleSize: poll.sampleSize ?? undefined,
        shares: poll.shares,
        quality: "published",
        sourceUrl: pollCase.source,
        reliability: 0.75,
      });
    }
    const asOf = Date.parse(`${pollCase.cutoff}T23:59:59Z`);
    const aggregate = aggregatePolls(polls, asOf, halfLifeDays);
    const official = target.lists.map((list) => ({
      ...list,
      modelId: officialListId(list.name),
      seats: EUROPEAN_SEATS[spec.id]?.[officialListId(list.name)] ?? list.seats,
    }));
    const predicted: Record<string, number> = {};
    for (const list of official) {
      const share = forecastShare(aggregate.shares, list.modelId, spec.aliases, spec.sumAliases?.includes(list.modelId) ?? false);
      if (share != null) predicted[list.modelId] = share;
    }
    const listRows = official
      .filter((list) => list.percentage >= 3 && predicted[list.modelId] != null)
      .map((list) => ({
        id: list.modelId,
        predicted: predicted[list.modelId],
        official: list.percentage,
      }));
    const coalitionIds = [...new Set(Object.values(spec.coalitions))];
    const coalitions = coalitionIds
      .map((id) => {
        const members = Object.entries(spec.coalitions)
          .filter(([, coalition]) => coalition === id)
          .map(([member]) => member);
        const officialShare = official
          .filter((list) => members.includes(list.modelId))
          .reduce((sum, list) => sum + list.percentage, 0);
        const predictedShare = members.reduce((sum, member) => sum + (predicted[member] ?? 0), 0);
        const covered = members.filter((member) => predicted[member] != null).length;
        if (covered < 2 || officialShare <= 0) return null;
        return { id, predicted: predictedShare, official: officialShare };
      })
      .filter((row): row is BacktestComparison => row != null);

    const seatSum = official.reduce((sum, list) => sum + (list.seats ?? 0), 0);
    const seatsAvailable = seatSum >= spec.seatTotal * 0.85;
    let seatRows: { id: string; predicted: number; official: number }[] = [];
    if (seatsAvailable) {
      const contest: ContestList[] = official
        .filter((list) => (predicted[list.modelId] ?? 0) > 0)
        .map((list) => ({
          id: list.modelId,
          votes: predicted[list.modelId],
          coalitionId: spec.coalitions[list.modelId] ?? null,
        }));
      const allocated = allocateProportional(contest, spec.seatTotal, {
        listThreshold: spec.threshold,
        coalitionThreshold: spec.kind === "camera" ? 0.1 : 1,
      });
      const ids = new Set<string>([
        ...official.filter((list) => (list.seats ?? 0) > 0 || list.percentage >= 1).map((list) => list.modelId),
        ...Object.keys(allocated.seats).filter((id) => allocated.seats[id] > 0),
      ]);
      seatRows = [...ids].map((id) => ({
        id,
        predicted: allocated.seats[id] ?? 0,
        official: official.find((list) => list.modelId === id)?.seats ?? 0,
      }));
    }

    return {
      id: spec.id,
      label: spec.label,
      election: pollCase.election,
      cutoff: pollCase.cutoff,
      pollCount: polls.length,
      institutes: new Set(polls.map((poll) => poll.institute)).size,
      listMae: meanAbs(listRows) ?? 0,
      coalitionMae: meanAbs(coalitions),
      proportionalSeatError: seatsAvailable ? halfL1(seatRows) : null,
      proportionalSeatMae: seatsAvailable ? meanAbs(seatRows) : null,
      seatTotal: seatsAvailable ? spec.seatTotal : null,
      lists: listRows,
      coalitions,
      seats: seatRows,
      sourcePolls: pollCase.source,
      sourceResult: target.source.url,
      note:
        spec.kind === "camera"
          ? "Errore di seggio sulla quota proporzionale. Gli uninominali non sono assegnati: non c'è una baseline di collegio anteriore al voto."
          : "Proporzionale nazionale con soglia del 4% e quoziente Hare, confrontato con i seggi della delegazione pubblicata. Le europee calibrano le quote, non sono una consultazione del simulatore.",
    };
  });
}
