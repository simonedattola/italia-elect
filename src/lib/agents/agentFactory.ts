import {
  DEFAULT_AGENT_WEIGHTS,
  buildDefaultEmotionalState,
  buildSocialProfile,
} from "./profile";
import type { DigitalAgent, Gender, VotingHistory, Zone } from "./types";
import {
  DEFAULT_AGENT_SAMPLE_SIZE,
  EDUCATION_LEVELS,
  INCOME_DECILES,
  ITALIAN_REGIONS,
  VIRTUAL_POPULATION,
  ZONE_TYPES,
} from "./constants";
import { createRng } from "../microsim/electorGenerator";

const PARTY_SLUGS = [
  "fratelli-ditalia",
  "partito-democratico",
  "movimento-5-stelle",
  "lega",
  "forza-italia",
  "azione-iv",
  "futuro-nazionale",
  "avss",
];

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function weightedPick(
  weights: Record<string, number>,
  rng: () => number,
): string {
  const entries = Object.entries(weights);
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * sum;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0]?.[0] ?? "";
}

function sampleAge(rng: () => number): number {
  // ISTAT-like: più 35-64
  const band = weightedPick(
    {
      "18-30": 0.18,
      "31-50": 0.32,
      "51-70": 0.35,
      "70+": 0.15,
    },
    rng,
  );
  if (band === "18-30") return 18 + Math.floor(rng() * 13);
  if (band === "31-50") return 31 + Math.floor(rng() * 20);
  if (band === "51-70") return 51 + Math.floor(rng() * 20);
  return 70 + Math.floor(rng() * 25);
}

function sampleVotingHistory(rng: () => number): VotingHistory {
  const pickParty = () => pick(PARTY_SLUGS, rng);
  return {
    politiche2018: pickParty(),
    politiche2022: pickParty(),
    europee2024: pickParty(),
    regionali2023: pickParty(),
    comunali2024: pickParty(),
  };
}

function comuneIdForRegion(region: string, rng: () => number): string {
  const base = region.slice(0, 2).toUpperCase();
  return `${base}${String(Math.floor(rng() * 900) + 100).padStart(3, "0")}`;
}

/**
 * Genera un campione stratificato di agenti digitali.
 * Il campione rappresenta statisticamente i 60M virtuali.
 */
export function generateAgentSample(
  sampleSize = DEFAULT_AGENT_SAMPLE_SIZE,
  seed = 42,
): DigitalAgent[] {
  const rng = createRng(seed);
  const scalingFactor = VIRTUAL_POPULATION / sampleSize;
  const agents: DigitalAgent[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const age = sampleAge(rng);
    const gender: Gender = rng() < 0.52 ? "F" : "M";
    const region = pick(ITALIAN_REGIONS, rng);
    const education = pick(EDUCATION_LEVELS, rng);
    const zone = weightedPick(
    { urbano: 0.45, suburbano: 0.3, rurale: 0.25 },
    rng,
  ) as Zone;
    const income = pick(INCOME_DECILES, rng);
    const followsMeloni = rng() < 0.22;
    const socialProfile = buildSocialProfile(age, rng, {
      followsMeloni,
      followsPd: rng() < 0.18,
    });

    agents.push({
      id: `agent_${i.toString().padStart(8, "0")}`,
      age,
      gender,
      region,
      comuneId: comuneIdForRegion(region, rng),
      income,
      education,
      zone,
      votingHistory: sampleVotingHistory(rng),
      socialProfile,
      emotionalState: buildDefaultEmotionalState(rng),
      weights: { ...DEFAULT_AGENT_WEIGHTS },
      network: { contacts: [], tieStrength: {} },
      virtualWeight: scalingFactor,
      updatedAt: new Date().toISOString(),
    });
  }

  return agents;
}

export function summarizeDemographics(agents: DigitalAgent[]): Record<string, number> {
  const out: Record<string, number> = {
    femalePct: 0,
    avgAge: 0,
    urbanPct: 0,
    highEducationPct: 0,
  };
  for (const a of agents) {
    if (a.gender === "F") out.femalePct++;
    out.avgAge += a.age;
    if (a.zone === "urbano") out.urbanPct++;
    if (a.education === "alta") out.highEducationPct++;
  }
  const n = agents.length || 1;
  out.femalePct = (out.femalePct / n) * 100;
  out.avgAge = out.avgAge / n;
  out.urbanPct = (out.urbanPct / n) * 100;
  out.highEducationPct = (out.highEducationPct / n) * 100;
  return out;
}
