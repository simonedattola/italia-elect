import type { PartyResult, SeatAllocation } from "@/types/simulation";

/**
 * Allocazione seggi semplificata ispirata al Rosatellum (Camera)
 * e al sistema senato — modello proporzionale con soglie,
 * NON una replica legale completa della legge elettorale.
 *
 * Camera: 400 seggi (post-riforma)
 * Senato: 200 seggi
 */

const CHAMBER_TOTAL = 400;
const SENATE_TOTAL = 200;
const THRESHOLD = 3.0; // soglia semplificata %

function allocateProportional(
  results: { slug: string; percentage: number }[],
  totalSeats: number,
  threshold: number
): SeatAllocation {
  const eligible = results.filter((r) => r.percentage >= threshold);
  const sumEligible = eligible.reduce((a, r) => a + r.percentage, 0) || 1;

  // Hare quota + largest remainders
  const quotas = eligible.map((r) => {
    const exact = (r.percentage / sumEligible) * totalSeats;
    return { slug: r.slug, exact, seats: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  let assigned = quotas.reduce((a, q) => a + q.seats, 0);
  const sorted = [...quotas].sort((a, b) => b.remainder - a.remainder);
  let i = 0;
  while (assigned < totalSeats && sorted.length > 0) {
    sorted[i % sorted.length].seats += 1;
    assigned++;
    i++;
  }

  const byParty: Record<string, number> = {};
  for (const r of results) byParty[r.slug] = 0;
  for (const q of quotas) byParty[q.slug] = q.seats;

  return {
    total: totalSeats,
    byParty,
    majorityThreshold: Math.floor(totalSeats / 2) + 1,
  };
}

export function allocateChamberSeats(results: PartyResult[]): SeatAllocation {
  return allocateProportional(
    results.map((r) => ({ slug: r.partySlug, percentage: r.percentage })),
    CHAMBER_TOTAL,
    THRESHOLD
  );
}

export function allocateSenateSeats(results: PartyResult[]): SeatAllocation {
  // Senato: soglia leggermente più alta nel modello semplificato
  return allocateProportional(
    results.map((r) => ({ slug: r.partySlug, percentage: r.percentage })),
    SENATE_TOTAL,
    3.0
  );
}

/** Preferire allocateRosatellum per Camera/Senato misti (Fase 4). */
export { allocateRosatellum, ROSATELLUM } from "../electoral/rosatellum";

export { CHAMBER_TOTAL, SENATE_TOTAL };
