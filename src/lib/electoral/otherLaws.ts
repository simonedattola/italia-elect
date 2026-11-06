import { allocateProportional, type ContestList } from "./rosatellum";
import { EUROPEAN_SEATS_ITALY_2024, EUROPEAN_THRESHOLD } from "./magnitudes";

/**
 * Europee italiane: proporzionale nazionale, soglia 4%, quoziente intero e maggiori resti.
 * 76 seggi spettanti all'Italia nel 2024. Nessuna coalizione nel riparto.
 */
export function allocateEuropeanSeats(
  lists: { id: string; votes: number }[],
  totalSeats = EUROPEAN_SEATS_ITALY_2024,
  threshold = EUROPEAN_THRESHOLD,
): Record<string, number> {
  const result = allocateProportional(
    lists.map((l) => ({ id: l.id, votes: l.votes, coalitionId: null })),
    totalSeats,
    { listThreshold: threshold, coalitionThreshold: 1, transferFloor: 1 },
  );
  return result.seats;
}

export interface MunicipalOptions {
  councilSeats: number;
  /** Soglia di lista. Default 3%, comuni sopra 15.000 abitanti (d.lgs. 267/2000). */
  threshold?: number;
  /**
   * Quota di seggi della coalizione del sindaco eletto se nessuna lista l'ha già.
   * Il testo unico indica il 60% nei comuni sopra 15.000. Non si applica sotto quella soglia:
   * il chiamante deve dirlo esplicitamente.
   */
  majorityShare?: number;
  winnerIds: string[];
}

/**
 * Modello del premio di maggioranza comunale per i comuni sopra 15.000 abitanti.
 * I comuni più piccoli hanno un altro sistema e non vanno fatti passare di qui.
 */
export function allocateMunicipalSeats(
  lists: ContestList[],
  options: MunicipalOptions,
): Record<string, number> {
  const threshold = options.threshold ?? 0.03;
  const majorityShare = options.majorityShare ?? 0.6;
  const seats: Record<string, number> = {};
  for (const list of lists) seats[list.id] = 0;
  if (options.councilSeats <= 0) return seats;

  const totalVotes = lists.reduce((a, l) => a + Math.max(0, l.votes), 0) || 1;
  const winners = new Set(options.winnerIds);
  const admitted = lists.filter(
    (l) => l.votes > 0 && (winners.has(l.id) || l.votes / totalVotes >= threshold),
  );
  const pure = allocateProportional(admitted, options.councilSeats, {
    listThreshold: 0,
    coalitionThreshold: 1,
    transferFloor: 1,
  });
  const winnerSeats = admitted
    .filter((l) => winners.has(l.id))
    .reduce((a, l) => a + (pure.seats[l.id] ?? 0), 0);
  const target = Math.round(options.councilSeats * majorityShare);
  if (winners.size === 0 || winnerSeats >= target) {
    for (const [id, n] of Object.entries(pure.seats)) seats[id] = n;
    return seats;
  }

  const winnerLists = admitted.filter((l) => winners.has(l.id));
  const others = admitted.filter((l) => !winners.has(l.id));
  const bonusAlloc = allocateProportional(winnerLists, target, {
    listThreshold: 0,
    coalitionThreshold: 1,
    transferFloor: 1,
  });
  const restAlloc = allocateProportional(others, options.councilSeats - target, {
    listThreshold: 0,
    coalitionThreshold: 1,
    transferFloor: 1,
  });
  for (const [id, n] of Object.entries(bonusAlloc.seats)) seats[id] = (seats[id] ?? 0) + n;
  for (const [id, n] of Object.entries(restAlloc.seats)) seats[id] = (seats[id] ?? 0) + n;
  return seats;
}

export interface RegionalParamOptions {
  councilSeats: number;
  threshold?: number;
  /** Seggi di premio assegnati alla coalizione indicata, dopo il proporzionale sul resto. */
  bonusSeats?: number;
  bonusCoalitionId?: string | null;
}

/**
 * Modello parametrico per i consigli regionali.
 * Ogni Regione ha una legge propria: i parametri sono scelti da chi simula
 * e non sono una codifica della legge regionale.
 */
export function allocateRegionalParametric(
  lists: ContestList[],
  options: RegionalParamOptions,
): Record<string, number> {
  const bonus = Math.max(0, Math.min(options.bonusSeats ?? 0, options.councilSeats));
  const proportionalSeats = options.councilSeats - bonus;
  const base = allocateProportional(lists, proportionalSeats, {
    listThreshold: options.threshold ?? 0.03,
    coalitionThreshold: 0,
    transferFloor: 1,
  });
  const seats = { ...base.seats };
  if (bonus > 0 && options.bonusCoalitionId) {
    const members = lists.filter((l) => l.coalitionId === options.bonusCoalitionId && l.votes > 0);
    const extra = allocateProportional(members, bonus, {
      listThreshold: 0,
      coalitionThreshold: 1,
      transferFloor: 1,
    });
    for (const [id, n] of Object.entries(extra.seats)) seats[id] = (seats[id] ?? 0) + n;
  }
  return seats;
}
