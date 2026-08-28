import { promises as fs } from "fs";
import path from "path";
import type { CoalitionFamily, IdeologySpectrum, PartyDefinition } from "@/types/simulation";
import { slugify } from "@/lib/utils";
import { mergeDiscoveredParties } from "./partyRegistryCore";

const CUSTOM_PATH = path.join(process.cwd(), "src/data/custom-parties.json");

export interface CreatePartyInput {
  name: string;
  color: string;
  ideologyScore: number;
  coalitionFamily: CoalitionFamily;
  program?: string;
  leader?: string;
}

interface CustomPartyRecord extends PartyDefinition {
  program?: string;
  leader?: string;
  isCustom: true;
  createdAt: string;
}

function ideologyFromScore(score: number): IdeologySpectrum {
  if (score <= -0.6) return "LEFT";
  if (score <= -0.25) return "CENTER_LEFT";
  if (score <= 0.15) return "CENTER";
  if (score <= 0.45) return "CENTER_RIGHT";
  if (score <= 0.7) return "RIGHT";
  return "FAR_RIGHT";
}

async function readCustom(): Promise<CustomPartyRecord[]> {
  try {
    const raw = await fs.readFile(CUSTOM_PATH, "utf8");
    return JSON.parse(raw) as CustomPartyRecord[];
  } catch {
    return [];
  }
}

async function writeCustom(parties: CustomPartyRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(CUSTOM_PATH), { recursive: true });
  await fs.writeFile(CUSTOM_PATH, JSON.stringify(parties, null, 2), "utf8");
}

export async function loadCustomPartiesIntoRegistry(): Promise<string[]> {
  const custom = await readCustom();
  const defs: PartyDefinition[] = custom.map((p) => ({
    slug: p.slug,
    name: p.name,
    shortName: p.shortName,
    color: p.color,
    ideology: p.ideology,
    ideologyScore: p.ideologyScore,
    coalitionFamily: p.coalitionFamily,
    foundedYear: p.foundedYear,
    aiDetected: false,
  }));
  return mergeDiscoveredParties(defs);
}

export async function createCustomParty(input: CreatePartyInput): Promise<CustomPartyRecord> {
  const slug = slugify(input.name);
  const existing = await readCustom();
  if (existing.some((p) => p.slug === slug)) {
    throw new Error("Esiste già un partito con questo nome");
  }

  const party: CustomPartyRecord = {
    slug,
    name: input.name.trim(),
    shortName: input.name.trim().slice(0, 8).toUpperCase(),
    color: input.color,
    ideology: ideologyFromScore(input.ideologyScore),
    ideologyScore: input.ideologyScore,
    coalitionFamily: input.coalitionFamily,
    foundedYear: new Date().getFullYear(),
    isCustom: true,
    program: input.program,
    leader: input.leader,
    createdAt: new Date().toISOString(),
  };

  existing.push(party);
  await writeCustom(existing);
  mergeDiscoveredParties([party]);
  return party;
}

export async function listCustomParties(): Promise<CustomPartyRecord[]> {
  return readCustom();
}

export async function getCustomPartyPositioning(): Promise<
  Array<{ slug: string; name: string; color: string; ideologyScore: number; isCustom?: boolean }>
> {
  const { PARTIES } = await import("./parties");
  return PARTIES.map((p) => ({
    slug: p.slug,
    name: p.shortName,
    color: p.color,
    ideologyScore: p.ideologyScore,
    isCustom: (p as PartyDefinition & { isCustom?: boolean }).isCustom,
  }));
}
