import type { CoalitionResult, PartyResult, SeatAllocation } from "@/types/simulation";
import { PARTIES, COALITION_LABELS } from "@/lib/electoral/parties";

export function buildCoalitions(
  results: PartyResult[],
  chamber: SeatAllocation,
  senate: SeatAllocation
): CoalitionResult[] {
  const families = ["CENTRODESTRA", "CENTROSINISTRA", "CENTRO", "SINISTRA", "DESTRA", "ALTRO"] as const;

  return families
    .map((family) => {
      const parties = PARTIES.filter((p) => p.coalitionFamily === family);
      const slugs = parties.map((p) => p.slug);
      const percentage = results
        .filter((r) => slugs.includes(r.partySlug))
        .reduce((a, r) => a + r.percentage, 0);
      const seatsChamber = slugs.reduce((a, s) => a + (chamber.byParty[s] ?? 0), 0);
      const seatsSenate = slugs.reduce((a, s) => a + (senate.byParty[s] ?? 0), 0);

      return {
        family,
        name: COALITION_LABELS[family],
        parties: slugs,
        percentage,
        seatsChamber,
        seatsSenate,
        hasMajorityChamber: seatsChamber >= chamber.majorityThreshold,
        hasMajoritySenate: seatsSenate >= senate.majorityThreshold,
      };
    })
    .filter((c) => c.percentage > 0.5)
    .sort((a, b) => b.percentage - a.percentage);
}
