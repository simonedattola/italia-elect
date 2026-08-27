/**
 * Rosatellum (modello educativo semplificato ma strutturato).
 * Camera: 147 uninominali FPTP + 245 proporzionali + 8 estero (qui: estero assorbito nel proporzionale → 253).
 * Senato: 74 uninominali + 122 proporzionali + 4 estero → 126 proporzionali.
 *
 * NON è una replica legale completa (collegi reali, liste bloccate, multi-liste coalizione).
 */

import type { PartyResult, SeatAllocation } from "../../types/simulation";
import { PARTIES, getParty } from "../electoral/parties";

export const ROSATELLUM = {
  chamber: {
    uninominal: 147,
    proportional: 245,
    abroad: 8,
    total: 400,
    partyThreshold: 3,
    coalitionThreshold: 10,
  },
  senate: {
    uninominal: 74,
    proportional: 122,
    abroad: 4,
    total: 200,
    partyThreshold: 3,
    coalitionThreshold: 10,
  },
} as const;

export interface CollegioUninominale {
  id: string;
  chamber: "camera" | "senato";
  /** Share locale per partito (somma ~100) — se assente si usa nazionale + rumore */
  localShares?: Record<string, number>;
}

export interface RosatellumInput {
  /** % nazionali 0..100 */
  nationalShares: Record<string, number>;
  /** Coalizioni: nome → lista slug partiti */
  coalitions?: Record<string, string[]>;
  /** Collegi uninominali (opzionale; se assenti si sintetizzano da share nazionali) */
  collegi?: CollegioUninominale[];
  seed?: number;
}

export interface RosatellumResult {
  chamber: SeatAllocation & {
    uninominalByParty: Record<string, number>;
    proportionalByParty: Record<string, number>;
  };
  senate: SeatAllocation & {
    uninominalByParty: Record<string, number>;
    proportionalByParty: Record<string, number>;
  };
  collegioWinners: { id: string; chamber: string; winner: string }[];
  modelVersion: string;
  notes: string[];
}

const DEFAULT_COALITIONS: Record<string, string[]> = {
  CENTRODESTRA: ["fratelli-ditalia", "lega", "forza-italia"],
  CENTROSINISTRA: ["partito-democratico", "avss", "piu-europa"],
  M5S: ["movimento-5-stelle"],
  TERZO_POLO: ["azione-iv"],
  ALTRI: ["italexit"],
};

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function allocateHare(
  shares: Record<string, number>,
  seats: number,
  eligible: Set<string>,
): Record<string, number> {
  const entries = Object.entries(shares).filter(([slug]) => eligible.has(slug));
  const sum = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const quotas = entries.map(([slug, pct]) => {
    const exact = (pct / sum) * seats;
    return {
      slug,
      exact,
      seats: Math.floor(exact),
      rem: exact - Math.floor(exact),
    };
  });
  let assigned = quotas.reduce((a, q) => a + q.seats, 0);
  const sorted = [...quotas].sort((a, b) => b.rem - a.rem);
  let i = 0;
  while (assigned < seats && sorted.length > 0) {
    sorted[i % sorted.length]!.seats += 1;
    assigned++;
    i++;
  }
  const out: Record<string, number> = {};
  for (const slug of Object.keys(shares)) out[slug] = 0;
  for (const q of quotas) out[q.slug] = q.seats;
  return out;
}

function eligibleParties(
  nationalShares: Record<string, number>,
  coalitions: Record<string, string[]>,
  partyThreshold: number,
  coalitionThreshold: number,
): Set<string> {
  const eligible = new Set<string>();
  for (const [, members] of Object.entries(coalitions)) {
    const coalPct = members.reduce((a, s) => a + (nationalShares[s] ?? 0), 0);
    if (coalPct >= coalitionThreshold) {
      for (const m of members) {
        if ((nationalShares[m] ?? 0) >= 1) eligible.add(m);
      }
    }
  }
  for (const [slug, pct] of Object.entries(nationalShares)) {
    if (pct >= partyThreshold) eligible.add(slug);
  }
  return eligible;
}

function synthesizeCollegi(
  chamber: "camera" | "senato",
  count: number,
  national: Record<string, number>,
  rng: () => number,
): CollegioUninominale[] {
  const out: CollegioUninominale[] = [];
  for (let i = 0; i < count; i++) {
    const local: Record<string, number> = {};
    let sum = 0;
    for (const [slug, pct] of Object.entries(national)) {
      const noisy = Math.max(0.1, pct * (0.75 + rng() * 0.5));
      local[slug] = noisy;
      sum += noisy;
    }
    for (const k of Object.keys(local)) local[k] = (local[k]! / sum) * 100;
    out.push({ id: `${chamber}-${i + 1}`, chamber, localShares: local });
  }
  return out;
}

function coalitionCandidateShare(
  local: Record<string, number>,
  members: string[],
): { coalitionShare: number; leadParty: string } {
  let best = members[0] ?? "";
  let bestPct = -1;
  let sum = 0;
  for (const m of members) {
    const v = local[m] ?? 0;
    sum += v;
    if (v > bestPct) {
      bestPct = v;
      best = m;
    }
  }
  return { coalitionShare: sum, leadParty: best };
}

/**
 * Assegna uninominali: ogni collegio vinto dalla coalizione (o partito) con share più alta;
 * il seggio va al partito leader della coalizione nel collegio.
 */
function assignUninominal(
  collegi: CollegioUninominale[],
  coalitions: Record<string, string[]>,
): { byParty: Record<string, number>; winners: RosatellumResult["collegioWinners"] } {
  const byParty: Record<string, number> = {};
  for (const p of PARTIES) byParty[p.slug] = 0;
  const winners: RosatellumResult["collegioWinners"] = [];

  for (const c of collegi) {
    const local = c.localShares ?? {};
    let bestCoal = "";
    let bestShare = -1;
    let winnerParty = "";

    for (const [coalName, members] of Object.entries(coalitions)) {
      const { coalitionShare, leadParty } = coalitionCandidateShare(
        local,
        members,
      );
      if (coalitionShare > bestShare) {
        bestShare = coalitionShare;
        bestCoal = coalName;
        winnerParty = leadParty;
      }
    }

    // Partiti fuori coalizione esplicita: compete individualmente
    for (const [slug, pct] of Object.entries(local)) {
      const inCoal = Object.values(coalitions).some((m) => m.includes(slug));
      if (!inCoal && pct > bestShare) {
        bestShare = pct;
        bestCoal = slug;
        winnerParty = slug;
      }
    }

    if (winnerParty) {
      byParty[winnerParty] = (byParty[winnerParty] ?? 0) + 1;
      winners.push({
        id: c.id,
        chamber: c.chamber,
        winner: winnerParty,
      });
    }
  }

  return { byParty, winners };
}

export function allocateRosatellum(input: RosatellumInput): RosatellumResult {
  const rng = lcg(input.seed ?? 42);
  const coalitions = input.coalitions ?? DEFAULT_COALITIONS;
  const national = { ...input.nationalShares };

  // Normalizza chiavi mancanti
  for (const p of PARTIES) {
    if (national[p.slug] == null) national[p.slug] = 0;
  }

  const notes: string[] = [
    "Modello Rosatellum educativo: collegi sintetici se non forniti; soglie 3%/10%.",
    "Seggi estero uniti al proporzionale per semplicità.",
  ];

  let collegi = input.collegi ?? [];
  const cameraCollegi =
    collegi.filter((c) => c.chamber === "camera").length > 0
      ? collegi.filter((c) => c.chamber === "camera")
      : synthesizeCollegi(
          "camera",
          ROSATELLUM.chamber.uninominal,
          national,
          rng,
        );
  const senateCollegi =
    collegi.filter((c) => c.chamber === "senato").length > 0
      ? collegi.filter((c) => c.chamber === "senato")
      : synthesizeCollegi(
          "senato",
          ROSATELLUM.senate.uninominal,
          national,
          rng,
        );

  const camUni = assignUninominal(cameraCollegi, coalitions);
  const senUni = assignUninominal(senateCollegi, coalitions);

  const camEligible = eligibleParties(
    national,
    coalitions,
    ROSATELLUM.chamber.partyThreshold,
    ROSATELLUM.chamber.coalitionThreshold,
  );
  const senEligible = eligibleParties(
    national,
    coalitions,
    ROSATELLUM.senate.partyThreshold,
    ROSATELLUM.senate.coalitionThreshold,
  );

  const camPropSeats =
    ROSATELLUM.chamber.proportional + ROSATELLUM.chamber.abroad;
  const senPropSeats =
    ROSATELLUM.senate.proportional + ROSATELLUM.senate.abroad;

  const camProp = allocateHare(national, camPropSeats, camEligible);
  const senProp = allocateHare(national, senPropSeats, senEligible);

  const camByParty: Record<string, number> = {};
  const senByParty: Record<string, number> = {};
  for (const p of PARTIES) {
    camByParty[p.slug] =
      (camUni.byParty[p.slug] ?? 0) + (camProp[p.slug] ?? 0);
    senByParty[p.slug] =
      (senUni.byParty[p.slug] ?? 0) + (senProp[p.slug] ?? 0);
  }

  return {
    chamber: {
      total: ROSATELLUM.chamber.total,
      byParty: camByParty,
      majorityThreshold: Math.floor(ROSATELLUM.chamber.total / 2) + 1,
      uninominalByParty: camUni.byParty,
      proportionalByParty: camProp,
    },
    senate: {
      total: ROSATELLUM.senate.total,
      byParty: senByParty,
      majorityThreshold: Math.floor(ROSATELLUM.senate.total / 2) + 1,
      uninominalByParty: senUni.byParty,
      proportionalByParty: senProp,
    },
    collegioWinners: [...camUni.winners, ...senUni.winners],
    modelVersion: "4.0.0-rosatellum",
    notes,
  };
}

/** Helper: da PartyResult[] a share map */
export function sharesFromPartyResults(
  results: PartyResult[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of results) out[r.partySlug] = r.percentage;
  return out;
}

export function toSeatAllocation(
  byParty: Record<string, number>,
  total: number,
): SeatAllocation {
  return {
    total,
    byParty,
    majorityThreshold: Math.floor(total / 2) + 1,
  };
}

export { getParty };
