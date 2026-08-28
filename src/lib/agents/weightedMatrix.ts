import type { DigitalAgent } from "./types";
import { normalizeWeights, DEFAULT_AGENT_WEIGHTS } from "./profile";

/**
 * Peso_individuale = Baseline*0.3 + Demografia*0.2 + Media_Amici*0.2 +
 *                    Esposizione_Mediatica*0.15 + Umore*0.15
 */
export function applyWeightedMatrix(agents: DigitalAgent[]): DigitalAgent[] {
  return agents.map((agent) => {
    const demo =
      (agent.education === "alta" ? 0.15 : 0) +
      (agent.zone === "urbano" ? 0.1 : agent.zone === "rurale" ? -0.05 : 0) +
      (agent.age < 35 ? 0.05 : agent.age > 64 ? -0.05 : 0);

    const mediaExposure = computeMediaExposure(agent);
    const moodFactor = agent.emotionalState.mood * 0.15;

    const friendsAvg = agent.weights.economy; // proxy post-propagazione
    const baseline = DEFAULT_AGENT_WEIGHTS;

    const merged: typeof agent.weights = {
      economy:
        baseline.economy * 0.3 +
        demo * 0.2 +
        friendsAvg * 0.2 +
        mediaExposure * 0.15 +
        moodFactor,
      security:
        baseline.security * 0.3 +
        demo * 0.15 +
        agent.weights.security * 0.25 +
        mediaExposure * 0.1 +
        moodFactor * 0.5,
      health: baseline.health * 0.35 + agent.weights.health * 0.35 + moodFactor,
      education: baseline.education * 0.4 + demo * 0.2 + agent.weights.education * 0.2,
      environment: baseline.environment * 0.4 + agent.weights.environment * 0.3,
      geopolitics: baseline.geopolitics * 0.35 + agent.weights.geopolitics * 0.35,
      politics: baseline.politics * 0.3 + mediaExposure * 0.25 + agent.weights.politics * 0.25,
      taxes: baseline.taxes * 0.35 + agent.weights.taxes * 0.35,
      weather: baseline.weather,
      sports: baseline.sports,
      social: baseline.social * 0.2 + mediaExposure * 0.5,
      news: baseline.news * 0.2 + mediaExposure * 0.5,
      personal: baseline.personal * 0.4 + demo * 0.3,
    };

    return {
      ...agent,
      weights: normalizeWeights(merged),
    };
  });
}

function computeMediaExposure(agent: DigitalAgent): number {
  const sp = agent.socialProfile;
  let h = 0;
  if (sp.x.active) h += sp.x.hoursPerDay * 0.2;
  if (sp.facebook.active) h += sp.facebook.hoursPerDay * 0.15;
  if (sp.instagram.active) h += sp.instagram.hoursPerDay * 0.2;
  if (sp.tiktok.active) h += sp.tiktok.hoursPerDay * 0.25;
  if (sp.reddit.active) h += sp.reddit.hoursPerDay * 0.1;
  return Math.min(1, h / 4);
}
