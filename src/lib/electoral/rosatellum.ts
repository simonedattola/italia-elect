/**
 * Riparto proporzionale del Rosatellum (l. 165/2017) sul territorio nazionale.
 *
 * Camera: soglie nazionali, poi quoziente intero (Hare) e maggiori resti sui 245 seggi
 * della quota proporzionale. Il totale di lista a livello nazionale si decide in questo
 * passaggio; la successiva distribuzione tra circoscrizioni non cambia il totale di lista
 * e qui non è replicata.
 *
 * Senato: le stesse soglie nazionali, con deroga per la lista che in una regione raggiunge
 * il 20%. Il riparto è regionale, sui seggi proporzionali di ciascuna regione.
 *
 * Non sono replicate le deroghe per le minoranze linguistiche in Trentino-Alto Adige
 * e Valle d'Aosta oltre alla deroga del 20% quando il chiamante la segnala.
 * I seggi uninominali sono un passaggio a parte (plurality), non questo riparto.
 */

import { COALITION_THRESHOLD, LIST_THRESHOLD, TRANSFER_FLOOR } from "./magnitudes";

export interface ContestList {
  id: string;
  votes: number;
  coalitionId?: string | null;
}

export interface ProportionalResult {
  seats: Record<string, number>;
  eligibleIds: string[];
  /** Voti usati nel riparto, dopo l'eventuale trasferimento interno di coalizione. */
  effectiveVotes: Record<string, number>;
  notes: string[];
}

export interface AllocateOptions {
  listThreshold?: number;
  coalitionThreshold?: number;
  transferFloor?: number;
  /** Liste ammesse anche sotto soglia (deroga regionale già verificata dal chiamante). */
  forceEligibleIds?: string[];
}

function hare(
  weights: { id: string; votes: number }[],
  totalSeats: number,
): Record<string, number> {
  const seats: Record<string, number> = {};
  for (const w of weights) seats[w.id] = 0;
  if (totalSeats <= 0 || weights.length === 0) return seats;
  const voteSum = weights.reduce((a, w) => a + w.votes, 0);
  if (voteSum <= 0) {
    // Nessun voto: i seggi non vengono assegnati.
    return seats;
  }
  const quota = voteSum / totalSeats;
  const rows = weights.map((w) => {
    const exact = w.votes / quota;
    const base = Math.floor(exact);
    return { id: w.id, votes: w.votes, base, remainder: exact - base };
  });
  let assigned = 0;
  for (const row of rows) {
    seats[row.id] = row.base;
    assigned += row.base;
  }
  const ranked = [...rows].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.id < b.id ? -1 : 1;
  });
  let i = 0;
  while (assigned < totalSeats && ranked.length > 0) {
    const row = ranked[i % ranked.length];
    seats[row.id] += 1;
    assigned += 1;
    i += 1;
    if (i > totalSeats + ranked.length) break;
  }
  return seats;
}

export function allocateProportional(
  lists: ContestList[],
  totalSeats: number,
  options: AllocateOptions = {},
): ProportionalResult {
  const listThreshold = options.listThreshold ?? LIST_THRESHOLD;
  const coalitionThreshold = options.coalitionThreshold ?? COALITION_THRESHOLD;
  const transferFloor = options.transferFloor ?? TRANSFER_FLOOR;
  const force = new Set(options.forceEligibleIds ?? []);
  const notes: string[] = [];

  const cleaned = lists.filter((l) => l.votes > 0 && l.id);
  const totalVotes = cleaned.reduce((a, l) => a + l.votes, 0);
  const pct = (votes: number) => (totalVotes > 0 ? votes / totalVotes : 0);

  const byCoalition = new Map<string, ContestList[]>();
  for (const list of cleaned) {
    if (!list.coalitionId) continue;
    const bucket = byCoalition.get(list.coalitionId) ?? [];
    bucket.push(list);
    byCoalition.set(list.coalitionId, bucket);
  }

  const passingCoalitions = new Set<string>();
  for (const [id, members] of byCoalition) {
    const share = pct(members.reduce((a, m) => a + m.votes, 0));
    const hasAnchor = members.some((m) => pct(m.votes) >= listThreshold || force.has(m.id));
    if (share + 1e-12 >= coalitionThreshold && hasAnchor) passingCoalitions.add(id);
  }

  // Sopra soglia, o in deroga, la lista è ammessa anche se la coalizione non passa.
  // La soglia di coalizione serve a decidere se i voti tra l'1% e il 3% si trasferiscono.
  const eligible = new Set<string>();
  for (const list of cleaned) {
    if (pct(list.votes) + 1e-12 >= listThreshold || force.has(list.id)) eligible.add(list.id);
  }

  const effective = new Map<string, number>();
  for (const id of eligible) {
    const list = cleaned.find((l) => l.id === id);
    effective.set(id, list?.votes ?? 0);
  }

  for (const coalitionId of passingCoalitions) {
    const members = byCoalition.get(coalitionId) ?? [];
    const donors = members.filter((m) => {
      const share = pct(m.votes);
      return !eligible.has(m.id) && share >= transferFloor && share < listThreshold;
    });
    const receivers = members.filter((m) => eligible.has(m.id));
    const donorVotes = donors.reduce((a, m) => a + m.votes, 0);
    const receiverVotes = receivers.reduce((a, m) => a + m.votes, 0);
    if (donorVotes > 0 && receiverVotes > 0) {
      for (const receiver of receivers) {
        const add = (donorVotes * receiver.votes) / receiverVotes;
        effective.set(receiver.id, (effective.get(receiver.id) ?? 0) + add);
      }
      notes.push(
        `Coalizione ${coalitionId}: ${donorVotes} voti di liste tra l'1% e il 3% trasferiti alle liste ammesse.`,
      );
    }
  }

  const weights = [...effective.entries()].map(([id, votes]) => ({ id, votes }));
  const seats = hare(weights, totalSeats);
  for (const list of cleaned) if (seats[list.id] == null) seats[list.id] = 0;

  const effectiveVotes: Record<string, number> = {};
  for (const [id, votes] of effective) effectiveVotes[id] = votes;

  return {
    seats,
    eligibleIds: [...eligible],
    effectiveVotes,
    notes,
  };
}

export interface CollegeBaseline {
  id: string;
  name: string;
  region: string;
  votes: Record<string, number>;
}

export interface CoalitionDef {
  id: string;
  listIds: string[];
}

export interface UninominalProjection {
  collegeId: string;
  region: string;
  winnerListId: string;
  winnerCoalitionId: string | null;
}

/**
 * Stima dei collegi uninominali con swing uniforme in punti percentuali
 * rispetto alle quote di lista del collegio, poi plurality sulla coalizione.
 * Il seggio è assegnato alla lista più ampia della coalizione vincente:
 * in legge appartiene al candidato, non alla lista.
 */
export function projectUninominalSeats(
  colleges: CollegeBaseline[],
  baselineNational: Record<string, number>,
  targetNational: Record<string, number>,
  coalitions: CoalitionDef[],
): { byList: Record<string, number>; detail: UninominalProjection[] } {
  const delta: Record<string, number> = {};
  const ids = new Set([...Object.keys(baselineNational), ...Object.keys(targetNational)]);
  for (const id of ids) delta[id] = (targetNational[id] ?? 0) - (baselineNational[id] ?? 0);

  const coalitionOf = new Map<string, string>();
  for (const c of coalitions) for (const id of c.listIds) coalitionOf.set(id, c.id);

  const byList: Record<string, number> = {};
  const detail: UninominalProjection[] = [];

  for (const college of colleges) {
    const baseTotal = Object.values(college.votes).reduce((a, b) => a + b, 0);
    if (baseTotal <= 0) continue;
    const projected: Record<string, number> = {};
    const keys = new Set([...Object.keys(college.votes), ...ids]);
    for (const id of keys) {
      const local = ((college.votes[id] ?? 0) / baseTotal) * 100;
      const next = local + (delta[id] ?? 0);
      if (next > 0) projected[id] = next;
    }
    const sum = Object.values(projected).reduce((a, b) => a + b, 0);
    if (sum <= 0) continue;

    const blocVotes = new Map<string, number>();
    const blocLists = new Map<string, { id: string; share: number }[]>();
    for (const [id, shareRaw] of Object.entries(projected)) {
      const share = shareRaw / sum;
      const bloc = coalitionOf.get(id) ?? `lista:${id}`;
      blocVotes.set(bloc, (blocVotes.get(bloc) ?? 0) + share);
      const arr = blocLists.get(bloc) ?? [];
      arr.push({ id, share });
      blocLists.set(bloc, arr);
    }
    let winnerBloc = "";
    let winnerScore = -1;
    for (const [bloc, score] of blocVotes) {
      if (score > winnerScore || (score === winnerScore && bloc < winnerBloc)) {
        winnerBloc = bloc;
        winnerScore = score;
      }
    }
    const members = (blocLists.get(winnerBloc) ?? []).sort((a, b) =>
      b.share !== a.share ? b.share - a.share : a.id < b.id ? -1 : 1,
    );
    const winnerListId = members[0]?.id;
    if (!winnerListId) continue;
    byList[winnerListId] = (byList[winnerListId] ?? 0) + 1;
    detail.push({
      collegeId: college.id,
      region: college.region,
      winnerListId,
      winnerCoalitionId: winnerBloc.startsWith("lista:") ? null : winnerBloc,
    });
  }

  return { byList, detail };
}
