import type { SharePayload } from "@/lib/model/shareLink";
import { affinitySwing } from "@/lib/model/affinity";
import type { SenateRegionBaseline, SimulationInput } from "@/lib/model/engine";
import type { CollegeBaseline } from "@/lib/electoral/rosatellum";
import { slugify } from "@/lib/electoral/canonical";
import baseline from "@/data/generated/simulator-baseline.json";

function numericVotes(votes: object): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(votes)) {
    if (typeof value === "number") out[id] = value;
  }
  return out;
}

function asColleges(rows: ReadonlyArray<{ id: string; name: string; region: string; votes: object }>): CollegeBaseline[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    votes: numericVotes(row.votes),
  }));
}

function asSenateRegions(rows: ReadonlyArray<{ region: string; votes: object }>): SenateRegionBaseline[] {
  return rows.map((row) => ({ region: row.region, votes: numericVotes(row.votes) }));
}

const cameraColleges = asColleges(baseline.camera.colleges);
const senateColleges = asColleges(baseline.senate.colleges);
const senateRegions = asSenateRegions(baseline.senate.regions);

export { baseline };

type BaselineList = {
  id: string;
  name: string;
  color: string;
  percentage: number;
  ideology?: number;
  votes?: number | null;
};

const COALITION_NAMES = ["centrodestra", "centrosinistra", "terzo"] as const;

export function defaultCoalition(listId: string): string | null {
  if (["fratelli-ditalia", "lega", "forza-italia", "noi-moderati"].includes(listId)) return "centrodestra";
  if (["partito-democratico", "avss", "piu-europa", "impegno-civico"].includes(listId)) return "centrosinistra";
  return null;
}

export function initialPayload(level: SharePayload["level"] = "nazionali"): SharePayload {
  const lists = listsFor(level, level === "regionali" ? "Lombardia" : undefined);
  const coalitions: Record<string, string | null> = {};
  if (level === "nazionali") {
    for (const list of lists) coalitions[list.id] = defaultCoalition(list.id);
  }
  return {
    v: 1,
    level,
    baselineId: baselineIdFor(level),
    seed: 20220925,
    runs: 1500,
    sigma: 1.4,
    pollWeight: 0,
    usePolls: false,
    factors: { economy: 0, security: 0, europe: 0, costOfLiving: 0, social: 0 },
    coalitions,
    region: level === "regionali" ? "Lombardia" : undefined,
  };
}

export function baselineIdFor(level: SharePayload["level"]): string {
  if (level === "europee") return "europee-2024";
  if (level === "regionali") return "regionali-2023-lazio-lombardia";
  if (level === "comunali") return "comunali-2024-07-28";
  return "politiche-camera-2022";
}

export function listsFor(level: SharePayload["level"], region?: string): BaselineList[] {
  if (level === "europee") return mergeLists(baseline.europee.lists);
  if (level === "regionali") {
    const found = baseline.regionali.find((item) => item.name === region) ?? baseline.regionali[0];
    return mergeLists(found?.lists ?? []);
  }
  return mergeLists(baseline.camera.lists);
}

function mergeLists(lists: BaselineList[]): BaselineList[] {
  const map = new Map<string, BaselineList>();
  for (const list of lists) {
    const prev = map.get(list.id);
    if (!prev) map.set(list.id, { ...list });
    else prev.percentage += list.percentage;
  }
  const merged = [...map.values()];
  const sum = merged.reduce((a, l) => a + l.percentage, 0) || 1;
  return merged
    .map((list) => ({ ...list, percentage: (list.percentage / sum) * 100 }))
    .sort((a, b) => b.percentage - a.percentage);
}

export function inputFromPayload(
  payload: SharePayload,
  extras?: {
    pollShares?: Record<string, number> | null;
    municipalLists?: BaselineList[];
    municipalCouncil?: number;
  },
): SimulationInput {
  const region = payload.region;
  const sourceLists =
    payload.level === "comunali"
      ? mergeLists(extras?.municipalLists ?? [])
      : listsFor(payload.level, region);
  const lists = sourceLists.map((list) => ({
    id: list.id,
    name: list.name,
    color: list.color,
    baseline: list.percentage,
    ideology: list.ideology ?? 0,
    coalitionId: payload.level === "nazionali" || payload.level === "regionali" ? payload.coalitions[list.id] ?? null : null,
  }));
  const affinity = payload.affinity
    ? {
        listId: payload.affinity.listId,
        points: affinitySwing(payload.affinity.score, payload.affinity.notoriety),
      }
    : null;
  const custom = payload.customParty?.name
    ? {
        id: slugify(payload.customParty.name) || "lista-nuova",
        name: payload.customParty.name,
        color: payload.customParty.color,
        target: payload.customParty.target,
        ideology: payload.customParty.ideology,
      }
    : null;
  return {
    level: payload.level,
    seed: payload.seed,
    runs: payload.runs,
    sigma: payload.sigma,
    lists,
    polls: payload.usePolls && extras?.pollShares ? { shares: extras.pollShares, weight: payload.pollWeight } : null,
    affinitySwing: affinity,
    factors: { ...payload.factors, social: payload.factors.social ?? 0 },
    incumbents: payload.level === "nazionali" ? ["fratelli-ditalia", "lega", "forza-italia", "noi-moderati"] : [],
    customParty: custom,
    colleges: payload.level === "nazionali" ? cameraColleges : [],
    senateColleges: payload.level === "nazionali" ? senateColleges : [],
    senateRegions: payload.level === "nazionali" ? senateRegions : [],
    councilSeats: payload.level === "comunali" ? payload.councilSeats || extras?.municipalCouncil || 0 : payload.councilSeats,
    regionalBonusSeats: payload.regionalBonusSeats,
    regionalBonusCoalitionId: payload.bonusCoalitionId ?? null,
    regionalThreshold: 0.03,
  };
}

export function paintRegions(
  targetShares: Record<string, number>,
  lists: { id: string; name: string; color: string; baseline: number }[],
): { name: string; color: string; label: string }[] {
  const baselineShares: Record<string, number> = {};
  for (const list of lists) baselineShares[list.id] = list.baseline;
  return senateRegions.map((region) => {
    const total = Object.values(region.votes).reduce((a, b) => a + b, 0) || 1;
    const projected: Record<string, number> = {};
    const ids = new Set([...Object.keys(region.votes), ...Object.keys(targetShares)]);
    for (const id of ids) {
      const local = ((region.votes[id] ?? 0) / total) * 100;
      const delta = (targetShares[id] ?? 0) - (baselineShares[id] ?? 0);
      const next = local + delta;
      if (next > 0) projected[id] = next;
    }
    let leader = "";
    let best = -1;
    for (const [id, value] of Object.entries(projected)) {
      if (value > best) {
        best = value;
        leader = id;
      }
    }
    const list = lists.find((item) => item.id === leader);
    const sum = Object.values(projected).reduce((a, b) => a + b, 0) || 1;
    return {
      name: region.region,
      color: list?.color ?? "#d6d0c4",
      label: list ? `${list.name.split(" ")[0]} ${((best / sum) * 100).toFixed(0)}%` : "n.d.",
    };
  });
}

export { COALITION_NAMES };
