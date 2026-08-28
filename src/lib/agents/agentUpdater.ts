import { buildSocialGraph } from "../network/socialGraph";
import { propagateOpinions } from "../network/opinionPropagation";
import { updateSocialExposure } from "../social/updater";
import { applyWeightedMatrix } from "./weightedMatrix";
import type { DigitalAgent } from "./types";

/**
 * Aggiornamento orario degli agenti: social → network → pesi individuali.
 */
export async function updateAgentsHourly(agents: DigitalAgent[]): Promise<DigitalAgent[]> {
  const withSocial = await updateSocialExposure(agents);
  const graph = buildSocialGraph(withSocial);
  const propagated = propagateOpinions(withSocial, graph);
  const weighted = applyWeightedMatrix(propagated);
  const now = new Date().toISOString();
  return weighted.map((a) => ({ ...a, updatedAt: now }));
}
