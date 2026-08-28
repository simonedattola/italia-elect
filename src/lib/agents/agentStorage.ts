import { promises as fs } from "fs";
import path from "path";
import type { AgentPopulationMeta, DigitalAgent } from "./types";
import { VIRTUAL_POPULATION } from "./constants";

const AGENT_DIR = path.join(process.cwd(), "src/data/agents");
const SAMPLE_PATH = path.join(AGENT_DIR, "latest-sample.json");
const META_PATH = path.join(AGENT_DIR, "meta.json");

export interface StoredAgentPopulation {
  meta: AgentPopulationMeta;
  agents: DigitalAgent[];
}

export async function saveAgentSample(
  agents: DigitalAgent[],
  meta: Omit<AgentPopulationMeta, "virtualPopulation" | "sampleSize" | "scalingFactor">,
): Promise<void> {
  await fs.mkdir(AGENT_DIR, { recursive: true });
  const payload: StoredAgentPopulation = {
    meta: {
      ...meta,
      virtualPopulation: VIRTUAL_POPULATION,
      sampleSize: agents.length,
      scalingFactor: VIRTUAL_POPULATION / agents.length,
    },
    agents,
  };
  await fs.writeFile(SAMPLE_PATH, JSON.stringify(payload), "utf8");
  await fs.writeFile(META_PATH, JSON.stringify(payload.meta, null, 2), "utf8");
}

export async function loadAgentSample(): Promise<StoredAgentPopulation | null> {
  try {
    const raw = await fs.readFile(SAMPLE_PATH, "utf8");
    return JSON.parse(raw) as StoredAgentPopulation;
  } catch {
    return null;
  }
}

export async function loadAgentMeta(): Promise<AgentPopulationMeta | null> {
  try {
    const raw = await fs.readFile(META_PATH, "utf8");
    return JSON.parse(raw) as AgentPopulationMeta;
  } catch {
    return null;
  }
}
