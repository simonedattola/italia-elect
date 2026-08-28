import type { DigitalAgent } from "../agents/types";
import { scrapeSocialPosts, postsForAgent } from "./scraper";
import { computePostImpact, cumulativeVoteShift } from "./impactCalculator";

/**
 * Aggiorna esposizione social e pesi individuali degli agenti.
 */
export async function updateSocialExposure(
  agents: DigitalAgent[],
): Promise<DigitalAgent[]> {
  const posts = await scrapeSocialPosts();

  return agents.map((agent) => {
    const exposed = postsForAgent(agent, posts);
    if (exposed.length === 0) return agent;

    let impactSum = 0;
    for (const post of exposed) {
      impactSum += computePostImpact(agent, post, {
        priorExposure: agent.socialProfile.followsMeloni ? 0.6 : 0.15,
        networkInfluence: 0.2,
      });
    }
    const avgImpact = impactSum / exposed.length;
    const voteShift = cumulativeVoteShift(exposed.length) / 100;

    const weights = { ...agent.weights };
    weights.social = Math.min(1, weights.social + avgImpact * 0.001);
    weights.politics = Math.min(1, weights.politics + voteShift * 0.5);

    const emotional = { ...agent.emotionalState };
    const sentimentAvg =
      exposed.reduce((s, p) => s + p.sentiment, 0) / exposed.length;
    emotional.mood = Math.max(-1, Math.min(1, emotional.mood + sentimentAvg * 0.05));

    return {
      ...agent,
      weights,
      emotionalState: emotional,
    };
  });
}
