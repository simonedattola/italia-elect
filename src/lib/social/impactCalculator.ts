import type { DigitalAgent } from "../agents/types";
import type { SocialGraph } from "../network/socialGraph";

export interface ImpactContext {
  priorExposure?: number;
  networkInfluence?: number;
}

/**
 * Impatto = Credibilità*0.3 + Engagement*0.2 + Esposizione*0.2 +
 *           Stato_Emotivo*0.15 + Network*0.15
 */
export function computePostImpact(
  agent: DigitalAgent,
  post: {
    authorCredibility: number;
    engagement: number;
    sentiment: number;
  },
  ctx: ImpactContext = {},
): number {
  const credibility = post.authorCredibility;
  const engagement = Math.min(1, post.engagement);
  const prior = ctx.priorExposure ?? 0.1;
  const emotional =
    (agent.emotionalState.mood + agent.emotionalState.optimism) / 2;
  const network = ctx.networkInfluence ?? 0.1;

  const raw =
    credibility * 0.3 +
    engagement * 0.2 +
    prior * 0.2 +
    emotional * 0.15 +
    network * 0.15;

  return Math.max(0, Math.min(1, raw));
}

/** Effetto cumulativo su intenzione di voto (%). */
export function cumulativeVoteShift(postCount: number): number {
  if (postCount <= 0) return 0;
  if (postCount === 1) return 0.1;
  if (postCount <= 5) return 0.5;
  if (postCount <= 10) return 1.0;
  if (postCount <= 20) return 1.8;
  return 3.0;
}

export function meloniFollowerImpact(agent: DigitalAgent, graph?: SocialGraph): number {
  const follows = agent.socialProfile.followsMeloni ?? false;
  if (!follows) return 0.1;

  let networkInfluence = 0.35;
  if (graph) {
    const neighbors = graph.adjacency[agent.id] ?? [];
    if (neighbors.length > 0) {
      networkInfluence =
        neighbors.reduce((s, id) => {
          const tie = agent.network.tieStrength[id] ?? 0.5;
          return s + tie;
        }, 0) / neighbors.length;
    }
  }

  const base = computePostImpact(
    agent,
    { authorCredibility: 0.92, engagement: 0.85, sentiment: 0.35 },
    { priorExposure: 0.85, networkInfluence },
  );

  return Math.max(0.85, base);
}
