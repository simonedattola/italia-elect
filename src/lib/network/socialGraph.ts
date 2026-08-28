import type { DigitalAgent } from "../agents/types";
import { createRng } from "../microsim/electorGenerator";

export interface SocialGraph {
  adjacency: Record<string, string[]>;
  avgDegree: number;
}

/**
 * Network Watts-Strogatz semplificato: k contatti locali + alcuni salti casuali.
 */
export function buildSocialGraph(
  agents: DigitalAgent[],
  k = 80,
  rewireProb = 0.08,
  seed = 99,
): SocialGraph {
  const rng = createRng(seed);
  const ids = agents.map((a) => a.id);
  const adjacency: Record<string, string[]> = {};

  for (let i = 0; i < ids.length; i++) {
    const contacts: string[] = [];
    const tieStrength: Record<string, number> = {};
    const agent = agents[i]!;

    for (let j = 1; j <= Math.min(k, ids.length - 1); j++) {
      const idx = (i + j) % ids.length;
      const peerId = ids[idx]!;
      if (peerId === agent.id) continue;
      contacts.push(peerId);
      tieStrength[peerId] = 0.4 + rng() * 0.6;
    }

    // Rewire ~8% dei legami
    for (let c = 0; c < contacts.length; c++) {
      if (rng() < rewireProb) {
        const randomIdx = Math.floor(rng() * ids.length);
        const newId = ids[randomIdx]!;
        if (newId !== agent.id && !contacts.includes(newId)) {
          contacts[c] = newId;
          tieStrength[newId] = 0.3 + rng() * 0.5;
        }
      }
    }

    agent.network.contacts = contacts.slice(0, Math.min(200, contacts.length));
    agent.network.tieStrength = tieStrength;
    adjacency[agent.id] = agent.network.contacts;
  }

  const totalEdges = Object.values(adjacency).reduce((s, a) => s + a.length, 0);
  return {
    adjacency,
    avgDegree: totalEdges / Math.max(1, ids.length),
  };
}
