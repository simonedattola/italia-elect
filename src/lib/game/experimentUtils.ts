import { REGIONS } from "@/lib/electoral/provinces";
import { PARTIES } from "@/lib/electoral/parties";
import { ITALIAN_CANDIDATE_POOL, VP_POOL, partyFromSlug } from "@/lib/game/computer/candidatePool";
import type { GamePlayer, GameSimulationResult } from "@/lib/game/types";
import { nanoid } from "nanoid";

export const CHAMBER_MAJORITY = 201;
export const CHAMBER_TOTAL = 400;

const REGION_ABBR: Record<string, string> = {
  Piemonte: "PIE",
  "Valle d'Aosta": "VDA",
  Lombardia: "LOM",
  "Trentino-Alto Adige": "TAA",
  Veneto: "VEN",
  "Friuli-Venezia Giulia": "FVG",
  Liguria: "LIG",
  "Emilia-Romagna": "EMR",
  Toscana: "TOS",
  Umbria: "UMB",
  Marche: "MAR",
  Lazio: "LAZ",
  Abruzzo: "ABR",
  Molise: "MOL",
  Campania: "CAM",
  Puglia: "PUG",
  Basilicata: "BAS",
  Calabria: "CAL",
  Sicilia: "SIC",
  Sardegna: "SAR",
};

export function regionAbbr(name: string): string {
  return REGION_ABBR[name] ?? name.slice(0, 3).toUpperCase();
}

export function randomPoolEntry(partySlug?: string) {
  const pool = partySlug
    ? ITALIAN_CANDIDATE_POOL.filter((e) => e.partySlug === partySlug)
  : ITALIAN_CANDIDATE_POOL;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function randomVp(partySlug: string) {
  const pool = VP_POOL.filter((e) => e.partySlug === partySlug);
  if (!pool.length) return undefined;
  return pool[Math.floor(Math.random() * pool.length)]!.candidate;
}

export function playerFromPool(
  entry: (typeof ITALIAN_CANDIDATE_POOL)[number],
  displayName: string,
): GamePlayer {
  const vp = randomVp(entry.partySlug);
  return {
    id: nanoid(8),
    displayName,
    party: partyFromSlug(entry.partySlug),
    candidate: {
      ...entry.candidate,
      description: entry.description,
      program: defaultProgram(entry.partySlug),
    },
    vicePresident: vp,
    isHuman: displayName === "Tu",
  };
}

function defaultProgram(partySlug: string): string {
  const p = PARTIES.find((x) => x.slug === partySlug);
  if (!p) return "Riforme economiche, sicurezza e crescita.";
  if (p.ideologyScore > 0.4) {
    return "Sovranità nazionale, taglio tasse, sicurezza, famiglia e ordine.";
  }
  if (p.ideologyScore < -0.2) {
    return "Welfare, sanità pubblica, diritti civili, ambiente e lavoro.";
  }
  return "Riforme liberali, Europa, competitività e innovazione.";
}

export function scoreboardSides(result: GameSimulationResult | null) {
  if (!result) {
    const baseline = PARTIES.slice(0, 2);
    return {
      left: { name: baseline[0]?.shortName ?? "—", seats: 0, color: baseline[0]?.color ?? "#64748b", pct: 0 },
      right: { name: baseline[1]?.shortName ?? "—", seats: 0, color: baseline[1]?.color ?? "#64748b", pct: 0 },
    };
  }
  const sorted = [...result.players].sort((a, b) => b.chamberSeats - a.chamberSeats);
  const a = sorted[0];
  const b = sorted[1];
  return {
    left: {
      name: a?.partyName ?? "—",
      seats: a?.chamberSeats ?? 0,
      color: a?.partyColor ?? "#2563eb",
      pct: a?.percentage ?? 0,
      candidate: a?.candidateName,
    },
    right: {
      name: b?.partyName ?? "—",
      seats: b?.chamberSeats ?? 0,
      color: b?.partyColor ?? "#dc2626",
      pct: b?.percentage ?? 0,
      candidate: b?.candidateName,
    },
  };
}

export const ALL_REGIONS = REGIONS.map((r) => r.name);
