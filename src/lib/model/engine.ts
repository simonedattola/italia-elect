import { sampleNormal, createRng, percentile } from "@/lib/utils";
import { applyScenarioStack } from "@/lib/scenarios/apply";
import type { ScenarioInput } from "@/lib/scenarios/types";
import {
  allocateProportional,
  projectUninominalSeats,
  type CollegeBaseline,
  type CoalitionDef,
  type ContestList,
} from "@/lib/electoral/rosatellum";
import { allocateEuropeanSeats, allocateMunicipalSeats, allocateRegionalParametric } from "@/lib/electoral/otherLaws";
import {
  CAMERA_PROPORTIONAL,
  majorityOf,
  SENATE_REGIONS,
} from "@/lib/electoral/magnitudes";

export interface ModelList {
  id: string;
  name: string;
  color: string;
  /** Percentuale di partenza, 0–100. */
  baseline: number;
  coalitionId?: string | null;
  ideology?: number;
}

export interface SenateRegionBaseline {
  region: string;
  votes: Record<string, number>;
}

export interface SimulationInput {
  level: "nazionali" | "europee" | "regionali" | "comunali";
  seed: number;
  runs: number;
  /** Scarto tipo del rumore, in punti percentuali, prima della rinormalizzazione. */
  sigma: number;
  lists: ModelList[];
  polls?: { shares: Record<string, number>; weight: number } | null;
  /** Punti percentuali già calcolati dall'affinità, applicati a una lista. */
  affinitySwing?: { listId: string; points: number } | null;
  /** Fattori di attualità, da -2 a +2. 0 = nessun effetto. */
  factors?: {
    economy?: number;
    security?: number;
    europe?: number;
    costOfLiving?: number;
    /** Clima social, -2…+2. Positivo = favorevole ai partiti indicati come incumbenti. */
    social?: number;
  };
  /** Liste considerate di governo per il fattore economia. */
  incumbents?: string[];
  customParty?: {
    id: string;
    name: string;
    color: string;
    target: number;
    ideology: number;
  } | null;
  colleges?: CollegeBaseline[];
  senateColleges?: CollegeBaseline[];
  senateRegions?: SenateRegionBaseline[];
  councilSeats?: number;
  regionalBonusSeats?: number;
  regionalBonusCoalitionId?: string | null;
  regionalThreshold?: number;
  municipalThreshold?: number;
  municipalMajorityShare?: number;
  /** Scenari impilati. Intensità 0 non sposta le quote. */
  scenarios?: ScenarioInput[];
  /** Effetti di un leader riconosciuto, già calcolati e spiegati a monte. */
  leaderEffects?: { listId: string; swing?: number; cap?: number; backlash?: number; note: string }[];
  /** Shock comune correlato all'asse sinistra-destra, in punti. 0 = assente. */
  commonShockSd?: number;
  /** Rumore di collegio, in punti sulla quota di coalizione. */
  collegioNoiseSd?: number;
  /** Quote nazionali usate come base geografica dello swing. Se assenti, si usano le baseline di lista. */
  geographyBaseline?: Record<string, number>;
}

export interface ShareBand {
  id: string;
  name: string;
  color: string;
  mean: number;
  low: number;
  high: number;
  baseline: number;
}

export interface SeatBand {
  id: string;
  mean: number;
  low: number;
  high: number;
  proportionalMean: number;
  uninominalMean: number;
}

export interface CoalitionBand {
  id: string;
  name: string;
  probability: number;
  meanSeats: number;
}

export interface SimulationOutput {
  shares: ShareBand[];
  cameraSeats: SeatBand[];
  senateSeats: SeatBand[];
  coalitions: CoalitionBand[];
  hemicycle: { id: string; seats: number }[];
  notes: string[];
  meta: {
    runs: number;
    seed: number;
    sigma: number;
    level: SimulationInput["level"];
    majorityThreshold: number;
    method: string[];
  };
}

function renormalize(values: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  let sum = 0;
  for (const [id, value] of Object.entries(values)) {
    const v = Math.max(0, value);
    next[id] = v;
    sum += v;
  }
  if (sum <= 0) return next;
  for (const id of Object.keys(next)) next[id] = (next[id] / sum) * 100;
  return next;
}

function blendPolls(
  baseline: Record<string, number>,
  polls: { shares: Record<string, number>; weight: number },
): Record<string, number> {
  const w = Math.max(0, Math.min(1, polls.weight));
  if (w === 0) return { ...baseline };
  const next = { ...baseline };
  for (const [id, share] of Object.entries(polls.shares)) {
    if (next[id] == null) continue;
    next[id] = (1 - w) * next[id] + w * share;
  }
  return renormalize(next);
}

function applyFactors(
  shares: Record<string, number>,
  lists: ModelList[],
  factors: SimulationInput["factors"],
  incumbents: string[],
): Record<string, number> {
  const economy = factors?.economy ?? 0;
  const security = factors?.security ?? 0;
  const europe = factors?.europe ?? 0;
  const prices = factors?.costOfLiving ?? 0;
  const social = factors?.social ?? 0;
  if (economy === 0 && security === 0 && europe === 0 && prices === 0 && social === 0) return { ...shares };
  const incumbent = new Set(incumbents);
  const next = { ...shares };
  for (const list of lists) {
    const ideology = list.ideology ?? 0;
    let delta = 0;
    // Economia negativa pesa sui partiti indicati come incumbenti.
    if (incumbent.has(list.id)) delta += economy * 0.8;
    else delta -= economy * 0.25;
    // Sicurezza: spostamento verso le liste più a destra nello schema.
    delta += security * ideology * 0.45;
    // Europa: un valore positivo è uno shock "più integrazione" e favorisce le liste europeiste (ideologia europea non è l'asse sinistra-destra).
    // Usiamo il segno opposto dell'asse solo come proxy grossolano, dichiarato in metodologia.
    delta += europe * -ideology * 0.35;
    // Caro vita: penalizza gli incumbenti, in modo distinto dal ciclo economico.
    if (incumbent.has(list.id)) delta -= Math.max(0, prices) * 0.5;
    // Sentiment: stesso asse del governo indicato, con elasticità più piccola dell'economia.
    if (incumbent.has(list.id)) delta += social * 0.35;
    else delta -= social * 0.1;
    next[list.id] = (next[list.id] ?? 0) + delta;
  }
  return renormalize(next);
}

function insertCustom(
  shares: Record<string, number>,
  lists: ModelList[],
  custom: NonNullable<SimulationInput["customParty"]>,
): { shares: Record<string, number>; lists: ModelList[] } {
  const target = Math.max(0, Math.min(40, custom.target));
  const weights: Record<string, number> = {};
  let weightSum = 0;
  for (const list of lists) {
    const distance = Math.abs((list.ideology ?? 0) - custom.ideology);
    const w = Math.exp(-distance * 2.2) * Math.max(0.05, shares[list.id] ?? 0);
    weights[list.id] = w;
    weightSum += w;
  }
  const next = { ...shares };
  if (weightSum > 0 && target > 0) {
    for (const id of Object.keys(weights)) {
      next[id] = Math.max(0, (next[id] ?? 0) - target * (weights[id] / weightSum));
    }
  }
  next[custom.id] = target;
  const customList: ModelList = {
    id: custom.id,
    name: custom.name,
    color: custom.color,
    baseline: target,
    ideology: custom.ideology,
    coalitionId: null,
  };
  return { shares: renormalize(next), lists: [...lists, customList] };
}

function toVotes(shares: Record<string, number>, scale = 10000): ContestList[] {
  return Object.entries(shares).map(([id, pct]) => ({
    id,
    votes: Math.max(0, pct) * scale,
  }));
}

function withCoalitions(lists: ModelList[], shares: Record<string, number>): ContestList[] {
  return lists.map((list) => ({
    id: list.id,
    votes: Math.max(0, shares[list.id] ?? 0) * 10000,
    coalitionId: list.coalitionId,
  }));
}

function emptyBands(lists: ModelList[]): { shares: number[][]; camera: number[][]; senate: number[][] } {
  const shares: number[][] = lists.map(() => []);
  const camera: number[][] = lists.map(() => []);
  const senate: number[][] = lists.map(() => []);
  return { shares, camera, senate };
}

function band(ids: ModelList[], samples: number[][], baselines: Record<string, number>): ShareBand[] {
  return ids.map((list, i) => {
    const values = [...samples[i]].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    return {
      id: list.id,
      name: list.name,
      color: list.color,
      mean,
      low: percentile(values, 5),
      high: percentile(values, 95),
      baseline: baselines[list.id] ?? 0,
    };
  });
}

function seatBand(ids: ModelList[], samples: number[][], propMeans: number[], uniMeans: number[]): SeatBand[] {
  return ids.map((list, i) => {
    const values = [...samples[i]].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    return {
      id: list.id,
      mean,
      low: percentile(values, 5),
      high: percentile(values, 95),
      proportionalMean: propMeans[i] ?? 0,
      uninominalMean: uniMeans[i] ?? 0,
    };
  });
}

/**
 * Lo scarto di una lista al 25% è `sigma` punti. Le liste piccole hanno uno scarto
 * più stretto, come in un campione, così il troncamento a zero non sposta la media delle grandi.
 */
function drawShares(
  center: Record<string, number>,
  lists: { id: string; ideology?: number }[],
  rng: () => number,
  sigma: number,
  commonShockSd = 0,
): Record<string, number> {
  const drawn: Record<string, number> = {};
  const shock = commonShockSd > 0 ? sampleNormal(rng, 0, commonShockSd) : 0;
  if (sigma <= 0 && shock === 0) {
    for (const list of lists) drawn[list.id] = center[list.id] ?? 0;
    return renormalize(drawn);
  }
  const reference = Math.sqrt(0.25 * 0.75);
  for (const list of lists) {
    const mu = Math.max(0, center[list.id] ?? 0);
    const p = mu / 100;
    const sd = sigma <= 0 ? 0 : sigma * (Math.sqrt(Math.max(p * (1 - p), 0)) / reference);
    const tilt = shock * (list.ideology ?? 0);
    drawn[list.id] = Math.max(0, mu + (sd > 0 ? sampleNormal(rng, 0, sd) : 0) + tilt);
  }
  return renormalize(drawn);
}

function largestRemainder(means: number[], total: number): number[] {
  const floors = means.map((m) => Math.floor(m));
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = means
    .map((m, i) => ({ i, rem: m - Math.floor(m) }))
    .sort((a, b) => b.rem - a.rem);
  const out = [...floors];
  let k = 0;
  while (left > 0 && order.length > 0) {
    out[order[k % order.length].i] += 1;
    left -= 1;
    k += 1;
    if (k > total + order.length) break;
  }
  return out;
}

export function prepareBaseline(input: SimulationInput): { lists: ModelList[]; shares: Record<string, number>; notes: string[] } {
  const notes: string[] = [];
  let shares: Record<string, number> = {};
  for (const list of input.lists) shares[list.id] = list.baseline;
  shares = renormalize(shares);
  if (input.polls && input.polls.weight > 0) {
    shares = blendPolls(shares, input.polls);
    notes.push("La baseline è stata miscelata con la media sondaggi al peso indicato.");
  }
  shares = applyFactors(shares, input.lists, input.factors, input.incumbents ?? []);
  const f = input.factors;
  if ((f?.economy ?? 0) !== 0 || (f?.security ?? 0) !== 0 || (f?.europe ?? 0) !== 0 || (f?.costOfLiving ?? 0) !== 0 || (f?.social ?? 0) !== 0) {
    notes.push("I fattori di attualità e il sentiment usano elasticità di scenario dichiarate, non stime causali.");
  }
  let lists = input.lists;
  if (input.customParty && input.customParty.target > 0) {
    const inserted = insertCustom(shares, lists, input.customParty);
    shares = inserted.shares;
    lists = inserted.lists;
    notes.push("La lista ipotetica preleva voti dalle liste vicine sullo schema sinistra-destra.");
  }
  if (input.affinitySwing && input.affinitySwing.points !== 0) {
    const id = input.affinitySwing.listId;
    if (shares[id] != null) {
      shares[id] += input.affinitySwing.points;
      shares = renormalize(shares);
      notes.push("L'affinità del candidato sposta la lista indicata prima del sorteggio Monte Carlo.");
    }
  }
  if (input.scenarios?.length) {
    const applied = applyScenarioStack(shares, lists, input.scenarios, input.level);
    shares = applied.shares;
    notes.push(...applied.notes);
  }
  if (input.leaderEffects?.length) {
    for (const effect of input.leaderEffects) {
      if (shares[effect.listId] == null) continue;
      if (effect.swing) shares[effect.listId] += effect.swing;
      if (effect.cap != null) {
        const excess = Math.max(0, shares[effect.listId] - effect.cap);
        shares[effect.listId] = Math.min(shares[effect.listId], effect.cap);
        const pool = excess + (effect.backlash ?? 0);
        if (pool > 0) {
          const leaderIdeology = lists.find((item) => item.id === effect.listId)?.ideology ?? 1;
          const others = lists.filter((list) => list.id !== effect.listId && (list.ideology ?? 0) * leaderIdeology <= 0);
          const receivers = others.length ? others : lists.filter((list) => list.id !== effect.listId);
          const each = pool / Math.max(1, receivers.length);
          for (const list of receivers) shares[list.id] = (shares[list.id] ?? 0) + each;
        }
      }
      notes.push(effect.note);
    }
    shares = renormalize(shares);
  }
  return { lists, shares, notes };
}

export function runSimulation(input: SimulationInput): SimulationOutput {
  const runs = Math.max(1, Math.min(20000, Math.floor(input.runs)));
  const prepared = prepareBaseline(input);
  const lists = prepared.lists;
  const center = prepared.shares;
  const rng = createRng(input.seed >>> 0);
  const samples = emptyBands(lists);
  const propAcc = lists.map(() => 0);
  const uniAcc = lists.map(() => 0);
  const senatePropAcc = lists.map(() => 0);
  const senateUniAcc = lists.map(() => 0);
  const index = new Map(lists.map((l, i) => [l.id, i]));
  const coalitions = coalitionDefs(lists);
  const names = new Map<string, string>();
  for (const c of coalitions) names.set(c.id, c.name);
  const majorityHits = new Map<string, number>();
  for (const c of coalitions) majorityHits.set(c.id, 0);
  let majorityThreshold = 0;

  const baselineNational: Record<string, number> = { ...(input.geographyBaseline ?? {}) };
  for (const list of input.lists) {
    if (baselineNational[list.id] == null) baselineNational[list.id] = input.geographyBaseline ? 0 : list.baseline;
  }

  for (let r = 0; r < runs; r++) {
    const shares = drawShares(center, lists, rng, input.sigma, input.commonShockSd ?? 0);
    for (const list of lists) samples.shares[index.get(list.id)!].push(shares[list.id] ?? 0);

    if (input.level === "europee") {
      const seats = allocateEuropeanSeats(toVotes(shares).map((l) => ({ id: l.id, votes: l.votes })));
      majorityThreshold = majorityOf(Object.values(seats).reduce((a, b) => a + b, 0) || 76);
      addSeats(samples.camera, propAcc, uniAcc, index, seats, {});
      zeroSenate(samples.senate, lists);
    } else if (input.level === "regionali") {
      const contest = withCoalitions(lists, shares);
      const seats = allocateRegionalParametric(contest, {
        councilSeats: input.councilSeats ?? 0,
        threshold: input.regionalThreshold ?? 0.03,
        bonusSeats: input.regionalBonusSeats ?? 0,
        bonusCoalitionId: input.regionalBonusCoalitionId ?? null,
      });
      majorityThreshold = majorityOf(input.councilSeats ?? 0);
      addSeats(samples.camera, propAcc, uniAcc, index, seats, {});
      zeroSenate(samples.senate, lists);
    } else if (input.level === "comunali") {
      const winner = Object.entries(shares).sort((a, b) => b[1] - a[1])[0]?.[0];
      const seats = allocateMunicipalSeats(
        lists.map((l) => ({ id: l.id, votes: (shares[l.id] ?? 0) * 10000, coalitionId: l.coalitionId })),
        {
          councilSeats: input.councilSeats ?? 0,
          threshold: input.municipalThreshold ?? 0.03,
          majorityShare: input.municipalMajorityShare ?? 0.6,
          winnerIds: winner ? [winner] : [],
        },
      );
      majorityThreshold = majorityOf(input.councilSeats ?? 0);
      addSeats(samples.camera, propAcc, uniAcc, index, seats, {});
      zeroSenate(samples.senate, lists);
    } else {
      const contest = withCoalitions(lists, shares);
      const proportional = allocateProportional(contest, CAMERA_PROPORTIONAL);
      const uni = projectUninominalSeats(
        input.colleges ?? [],
        renormalize(baselineNational),
        shares,
        coalitions.map((c) => ({ id: c.id, listIds: c.listIds })),
        rng,
        input.collegioNoiseSd ?? 0,
      );
      addSeats(samples.camera, propAcc, uniAcc, index, proportional.seats, uni.byList);
      const cameraTotal = sumRecord(proportional.seats) + sumRecord(uni.byList);
      majorityThreshold = majorityOf(cameraTotal || CAMERA_PROPORTIONAL);

      const senateSeats: Record<string, number> = {};
      for (const region of input.senateRegions ?? []) {
        const spec = SENATE_REGIONS.find((s) => s.region === region.region);
        if (!spec || spec.proportional <= 0) continue;
        const regionalTotal = Object.values(region.votes).reduce((a, b) => a + b, 0) || 1;
        const regionalShares: Record<string, number> = {};
        for (const [id, votes] of Object.entries(region.votes)) {
          regionalShares[id] = (votes / regionalTotal) * 100 + ((shares[id] ?? 0) - (baselineNational[id] ?? 0));
        }
        const positive = renormalize(
          Object.fromEntries(Object.entries(regionalShares).filter(([, v]) => v > 0)),
        );
        const regionalLists: ContestList[] = lists.map((list) => ({
          id: list.id,
          votes: (positive[list.id] ?? 0) * 100,
          coalitionId: list.coalitionId,
        }));
        const force = lists
          .filter((list) => (positive[list.id] ?? 0) >= 20)
          .map((list) => list.id);
        const alloc = allocateProportional(regionalLists, spec.proportional, { forceEligibleIds: force });
        for (const [id, n] of Object.entries(alloc.seats)) senateSeats[id] = (senateSeats[id] ?? 0) + n;
      }
      const senateUni = projectUninominalSeats(
        input.senateColleges ?? [],
        renormalize(baselineNational),
        shares,
        coalitions.map((c) => ({ id: c.id, listIds: c.listIds })),
        rng,
        input.collegioNoiseSd ?? 0,
      );
      for (const list of lists) {
        const prop = senateSeats[list.id] ?? 0;
        const uni = senateUni.byList[list.id] ?? 0;
        samples.senate[index.get(list.id)!].push(prop + uni);
        senatePropAcc[index.get(list.id)!] += prop;
        senateUniAcc[index.get(list.id)!] += uni;
      }

      const coalSeats = new Map<string, number>();
      for (const c of coalitions) {
        let s = 0;
        for (const id of c.listIds) {
          s += (proportional.seats[id] ?? 0) + (uni.byList[id] ?? 0);
        }
        coalSeats.set(c.id, s);
        if (s >= majorityThreshold) majorityHits.set(c.id, (majorityHits.get(c.id) ?? 0) + 1);
      }
    }
  }

  const shareBands = band(lists, samples.shares, center).sort((a, b) => b.mean - a.mean);
  const cameraSeats = seatBand(
    lists,
    samples.camera,
    propAcc.map((v) => v / runs),
    uniAcc.map((v) => v / runs),
  );
  const senateSeats = seatBand(
    lists,
    samples.senate,
    senatePropAcc.map((v) => v / runs),
    senateUniAcc.map((v) => v / runs),
  );

  const coalitionsOut: CoalitionBand[] = coalitions.map((c) => {
    let mean = 0;
    for (const id of c.listIds) {
      const i = index.get(id);
      if (i == null) continue;
      mean += cameraSeats[i]?.mean ?? 0;
    }
    return {
      id: c.id,
      name: c.name,
      probability: (majorityHits.get(c.id) ?? 0) / runs,
      meanSeats: mean,
    };
  });

  const totalHemi = Math.round(cameraSeats.reduce((a, s) => a + s.mean, 0));
  const rounded = largestRemainder(
    cameraSeats.map((s) => s.mean),
    totalHemi,
  );
  const hemicycle = cameraSeats
    .map((s, i) => ({ id: s.id, seats: rounded[i] ?? 0 }))
    .filter((s) => s.seats > 0);

  const method = [
    "Monte Carlo: rumore gaussiano con scarto proporzionale a √(p·(1−p)), calibrato sul valore indicato per una lista al 25%, poi rinormalizzato.",
    "Intervallo: 5° e 95° percentile delle estrazioni.",
    input.level === "nazionali"
      ? "Camera: soglie Rosatellum, Hare e maggiori resti sui 245 seggi proporzionali. Il collegio uninominale va alla coalizione; la lista del candidato, assente nei dati, è sorteggiata in proporzione alle quote locali. Uno shock comune muove insieme le liste sullo stesso lato dello schema."
      : input.level === "europee"
        ? "Europee: soglia 4% e Hare sui 76 seggi."
        : input.level === "comunali"
          ? "Comunali sopra 15.000 abitanti: premio al 60% se il proporzionale non lo raggiunge già."
          : "Regionali: modello parametrico (soglia e premio scelti da chi simula), non la legge della singola Regione.",
  ];

  return {
    shares: shareBands,
    cameraSeats,
    senateSeats,
    coalitions: coalitionsOut.sort((a, b) => b.meanSeats - a.meanSeats),
    hemicycle,
    notes: prepared.notes,
    meta: {
      runs,
      seed: input.seed >>> 0,
      sigma: input.sigma,
      level: input.level,
      majorityThreshold,
      method,
    },
  };
}

function coalitionDefs(lists: ModelList[]): { id: string; name: string; listIds: string[] }[] {
  const map = new Map<string, string[]>();
  for (const list of lists) {
    const id = list.coalitionId || `lista:${list.id}`;
    const bucket = map.get(id) ?? [];
    bucket.push(list.id);
    map.set(id, bucket);
  }
  const labels: Record<string, string> = {
    centrodestra: "Centrodestra",
    centrosinistra: "Centrosinistra",
    terzo: "Terzo polo",
  };
  return [...map.entries()].map(([id, listIds]) => ({
    id,
    name: labels[id] ?? lists.find((l) => l.id === listIds[0])?.name ?? id,
    listIds,
  }));
}

function addSeats(
  samples: number[][],
  propAcc: number[],
  uniAcc: number[],
  index: Map<string, number>,
  proportional: Record<string, number>,
  uninominal: Record<string, number>,
) {
  for (const [id, i] of index) {
    const prop = proportional[id] ?? 0;
    const uni = uninominal[id] ?? 0;
    samples[i].push(prop + uni);
    propAcc[i] += prop;
    uniAcc[i] += uni;
  }
}

function zeroSenate(samples: number[][], lists: ModelList[]) {
  for (let i = 0; i < lists.length; i++) samples[i].push(0);
}

function sumRecord(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

export type { CollegeBaseline, CoalitionDef };
