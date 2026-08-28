/**
 * Ridistribuzione voti quando partiti assenti (modalità solo candidati).
 */
import { PARTIES } from "@/lib/electoral/parties";
import { normalizePartyShares } from "@/lib/electoral/normalizeShares";

/** Flussi storici semplificati: partito assente → destinazioni (pesi) */
export const HISTORICAL_FLOWS: Record<string, Record<string, number>> = {
  "fratelli-ditalia": { lega: 0.35, "forza-italia": 0.25, "futuro-nazionale": 0.22, "azione-iv": 0.08 },
  lega: { "fratelli-ditalia": 0.4, "futuro-nazionale": 0.3, "forza-italia": 0.15 },
  "forza-italia": { "fratelli-ditalia": 0.35, lega: 0.25, "azione-iv": 0.2 },
  "partito-democratico": { "movimento-5-stelle": 0.35, avss: 0.3, "azione-iv": 0.15, "piu-europa": 0.1 },
  "movimento-5-stelle": { "partito-democratico": 0.4, avss: 0.25, lega: 0.1 },
  avss: { "partito-democratico": 0.45, "piu-europa": 0.25, "movimento-5-stelle": 0.15 },
  "azione-iv": { "partito-democratico": 0.3, "forza-italia": 0.25, "fratelli-ditalia": 0.2 },
  "futuro-nazionale": { lega: 0.45, "fratelli-ditalia": 0.35 },
  "piu-europa": { "partito-democratico": 0.4, avss: 0.35, "azione-iv": 0.15 },
  italexit: { lega: 0.4, "futuro-nazionale": 0.3, "fratelli-ditalia": 0.15 },
};

function ideologyNeighbors(slug: string): string[] {
  const party = PARTIES.find((p) => p.slug === slug);
  if (!party) return [];
  return PARTIES.filter(
    (p) => p.slug !== slug && Math.abs(p.ideologyScore - party.ideologyScore) < 0.35,
  )
    .sort(
      (a, b) =>
        Math.abs(a.ideologyScore - party.ideologyScore) -
        Math.abs(b.ideologyScore - party.ideologyScore),
    )
    .slice(0, 3)
    .map((p) => p.slug);
}

export class VoterRedistribution {
  redistribute(
    baseline: Record<string, number>,
    presentPartySlugs: Set<string>,
  ): Record<string, number> {
    const out = { ...baseline };
    const absent = PARTIES.map((p) => p.slug).filter((s) => !presentPartySlugs.has(s));

    for (const absentSlug of absent) {
      const share = out[absentSlug] ?? 0;
      if (share <= 0.01) {
        out[absentSlug] = 0;
        continue;
      }

      const flows = HISTORICAL_FLOWS[absentSlug];
      const targets: Array<{ slug: string; weight: number }> = [];

      if (flows) {
        for (const [dest, w] of Object.entries(flows)) {
          if (presentPartySlugs.has(dest)) targets.push({ slug: dest, weight: w });
        }
      }

      if (targets.length === 0) {
        for (const n of ideologyNeighbors(absentSlug)) {
          if (presentPartySlugs.has(n)) targets.push({ slug: n, weight: 1 });
        }
      }

      const wsum = targets.reduce((a, t) => a + t.weight, 0) || 1;
      for (const t of targets) {
        out[t.slug] = (out[t.slug] ?? 0) + (share * t.weight) / wsum;
      }
      out[absentSlug] = 0;
    }

    return normalizePartyShares(out);
  }

  /** Modalità tutti i partiti: partiti senza candidato restano con quota ridotta */
  dampenAbsent(
    baseline: Record<string, number>,
    presentPartySlugs: Set<string>,
    factor = 0.55,
  ): Record<string, number> {
    const out = { ...baseline };
    for (const p of PARTIES) {
      if (!presentPartySlugs.has(p.slug)) {
        out[p.slug] = (out[p.slug] ?? 0) * factor;
      }
    }
    return normalizePartyShares(out);
  }
}

export const voterRedistribution = new VoterRedistribution();
