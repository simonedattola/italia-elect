import type { DigitalAgent } from "../agents/types";
import type { SocialGraph } from "./socialGraph";

/**
 * Influenza reciproca: 0.7 * proprio stato + 0.3 * media amici (pesi su economia/politica).
 */
export function propagateOpinions(
  agents: DigitalAgent[],
  graph: SocialGraph,
): DigitalAgent[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const economyCache: Record<string, number> = {};

  for (const agent of agents) {
    const neighbors = graph.adjacency[agent.id] ?? [];
    if (neighbors.length === 0) {
      economyCache[agent.id] = agent.weights.economy;
      continue;
    }
    let sum = 0;
    let wSum = 0;
    for (const nid of neighbors) {
      const peer = byId.get(nid);
      if (!peer) continue;
      const tie = agent.network.tieStrength[nid] ?? 0.5;
      sum += peer.weights.economy * tie;
      wSum += tie;
    }
    const neighborAvg = wSum > 0 ? sum / wSum : agent.weights.economy;
    economyCache[agent.id] = agent.weights.economy * 0.7 + neighborAvg * 0.3;
  }

  return agents.map((agent) => ({
    ...agent,
    weights: {
      ...agent.weights,
      economy: economyCache[agent.id] ?? agent.weights.economy,
      politics:
        agent.weights.politics * 0.7 +
        (economyCache[agent.id] ?? agent.weights.politics) * 0.3,
    },
  }));
}
