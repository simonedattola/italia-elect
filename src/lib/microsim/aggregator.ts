/**
 * Aggregazione nazionale dei risultati comunali.
 */

import { PARTIES, COALITION_LABELS } from "../electoral/parties";
import type { ComuneResult, NationalAggregate } from "./types";

export function aggregateResults(
  comuneResults: ComuneResult[],
): NationalAggregate {
  const weightedVotes: Record<string, number> = {};
  const totalSeats: Record<string, number> = {};
  const mapData: NationalAggregate["mapData"] = [];

  let weightSum = 0;

  for (const result of comuneResults) {
    const w = Math.max(1, result.totalVoters);
    weightSum += w;

    for (const [party, pct] of Object.entries(result.partyVotes)) {
      weightedVotes[party] = (weightedVotes[party] ?? 0) + (pct / 100) * w;
    }
    for (const [party, seats] of Object.entries(result.seats)) {
      totalSeats[party] = (totalSeats[party] ?? 0) + seats;
    }
    mapData.push({
      comuneId: result.comuneId,
      winner: result.winner,
      margin: result.winnerMargin,
    });
  }

  const nationalVotes: Record<string, number> = {};
  const denom = weightSum || 1;
  for (const [party, votes] of Object.entries(weightedVotes)) {
    nationalVotes[party] = (votes / denom) * 100;
  }

  const coalitions = computeCoalitions(totalSeats, nationalVotes);
  const winProbability = computeWinProbability(nationalVotes, totalSeats);

  return {
    totalSeats,
    nationalVotes,
    mapData,
    coalitions,
    winProbability,
  };
}

export function computeCoalitions(
  totalSeats: Record<string, number>,
  nationalVotes: Record<string, number>,
): NationalAggregate["coalitions"] {
  const families = [
    "CENTRODESTRA",
    "CENTROSINISTRA",
    "CENTRO",
    "SINISTRA",
    "DESTRA",
    "ALTRO",
  ] as const;

  return families
    .map((family) => {
      const parties = PARTIES.filter((p) => p.coalitionFamily === family);
      const seats = parties.reduce(
        (a, p) => a + (totalSeats[p.slug] ?? 0),
        0,
      );
      const votes = parties.reduce(
        (a, p) => a + (nationalVotes[p.slug] ?? 0),
        0,
      );
      return {
        name: COALITION_LABELS[family] ?? family,
        seats,
        votes: Number(votes.toFixed(2)),
      };
    })
    .filter((c) => c.votes > 0.2 || c.seats > 0)
    .sort((a, b) => b.seats - a.seats || b.votes - a.votes);
}

/**
 * Probabilità di vittoria euristica (non ML): softmax su seggi + voti.
 */
export function computeWinProbability(
  nationalVotes: Record<string, number>,
  totalSeats: Record<string, number>,
): Record<string, number> {
  const families = new Map<string, number>();

  for (const p of PARTIES) {
    const name = COALITION_LABELS[p.coalitionFamily] ?? p.coalitionFamily;
    const score =
      (totalSeats[p.slug] ?? 0) * 1.2 + (nationalVotes[p.slug] ?? 0);
    families.set(name, (families.get(name) ?? 0) + score);
  }

  const entries = [...families.entries()];
  const max = Math.max(...entries.map(([, v]) => v), 1);
  // Softmax temperature
  const exps = entries.map(([k, v]) => [k, Math.exp((v / max) * 3)] as const);
  const sum = exps.reduce((a, [, e]) => a + e, 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, e] of exps) {
    out[k] = Number((e / sum).toFixed(4));
  }
  return out;
}
