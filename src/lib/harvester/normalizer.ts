/**
 * Normalizer — converte fonti grezze / store locali in NormalizedData[].
 */

import type {
  NormalizedBesIndicator,
  NormalizedData,
  NormalizedElection,
  NormalizedPoll,
} from "./types";
import { normalizeShares } from "./partyMap";

export function normalizeElection(raw: NormalizedElection): NormalizedData {
  return {
    kind: "election",
    data: {
      ...raw,
      shares: normalizeShares(raw.shares),
    },
  };
}

export function normalizeBes(raw: NormalizedBesIndicator): NormalizedData {
  return { kind: "istat_bes", data: raw };
}

export function normalizePoll(raw: NormalizedPoll): NormalizedData {
  return {
    kind: "poll",
    data: {
      ...raw,
      shares: normalizeShares(raw.shares, { includeOther: false }),
    },
  };
}

export function normalizeAll(input: {
  elections?: NormalizedElection[];
  bes?: NormalizedBesIndicator[];
  polls?: NormalizedPoll[];
}): NormalizedData[] {
  const out: NormalizedData[] = [];
  for (const e of input.elections ?? []) out.push(normalizeElection(e));
  for (const b of input.bes ?? []) out.push(normalizeBes(b));
  for (const p of input.polls ?? []) out.push(normalizePoll(p));
  return out;
}

/** Estrae solo le elezioni da un bundle normalizzato */
export function electionsFromNormalized(
  items: NormalizedData[]
): NormalizedElection[] {
  return items.filter((x): x is { kind: "election"; data: NormalizedElection } => x.kind === "election").map((x) => x.data);
}
