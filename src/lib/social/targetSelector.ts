import { ageToBand } from "../agents/agcomMatrix";
import type { DigitalAgent } from "../agents/types";

export function isAgentInTargetBand(agent: DigitalAgent, bands: string[]): boolean {
  return bands.includes(ageToBand(agent.age));
}

export function demographicMatchScore(agent: DigitalAgent, bands: string[]): number {
  return isAgentInTargetBand(agent, bands) ? 1 : 0.2;
}
