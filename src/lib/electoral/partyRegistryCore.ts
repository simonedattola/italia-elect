import type { PartyDefinition } from "@/types/simulation";
import { CORE_PARTIES } from "@/lib/electoral/coreParties";
import { markAiDetectedParties } from "@/lib/intelligence/party-scanner";

/** Registry live — mutato in-place (client-safe, no DB) */
export const PARTIES: PartyDefinition[] = [...CORE_PARTIES];

export const COALITION_LABELS: Record<string, string> = {
  CENTRODESTRA: "Centrodestra",
  CENTROSINISTRA: "Centrosinistra",
  CENTRO: "Centro",
  SINISTRA: "Sinistra",
  DESTRA: "Destra",
  ALTRO: "Altri",
};

export function getPartiesSnapshot(): PartyDefinition[] {
  return [...PARTIES];
}

export function getParty(slug: string): PartyDefinition | undefined {
  return PARTIES.find((p) => p.slug === slug);
}

export function getPartyOrThrow(slug: string): PartyDefinition {
  const p = getParty(slug);
  if (!p) throw new Error(`Partito sconosciuto: ${slug}`);
  return p;
}

/** Merge partiti scoperti nel registry in-memory */
export function mergeDiscoveredParties(discovered: PartyDefinition[]): string[] {
  const added: string[] = [];
  const slugs = new Set(PARTIES.map((p) => p.slug));

  for (const p of discovered) {
    if (slugs.has(p.slug)) continue;
    PARTIES.push({ ...p, aiDetected: p.aiDetected ?? true });
    slugs.add(p.slug);
    added.push(p.slug);
  }

  markAiDetectedParties(PARTIES);
  return added;
}
