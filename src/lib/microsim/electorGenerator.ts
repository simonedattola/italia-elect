/**
 * Generatore di elettori sintetici per comune.
 * Distribuzioni demografiche derivate da BES/ISTAT (proxy) + baseline storica.
 */

import { getBaseline, listAvailableYears } from "../harvester/baseline";
import { readComuneElections } from "../harvester/elections";
import { getISTATData } from "../context/weightsEngine";
import { PARTIES } from "../electoral/parties";
import { REGIONS } from "../electoral/provinces";
import type {
  DemographicBundle,
  EducationLevel,
  ElectorProfile,
  Gender,
  IncomeLevel,
  Occupation,
  Rng,
  ZoneType,
} from "./types";

const AGE_BANDS: Record<string, [number, number]> = {
  "18-30": [18, 30],
  "31-50": [31, 50],
  "51-70": [51, 70],
  "70+": [70, 92],
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    // LCG (Numerical Recipes)
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function sampleFromDistribution(
  dist: Record<string, number>,
  rng: Rng,
): string {
  const entries = Object.entries(dist);
  const sum = entries.reduce((a, [, p]) => a + p, 0) || 1;
  const r = rng() * sum;
  let cum = 0;
  for (const [key, prob] of entries) {
    cum += prob;
    if (r <= cum) return key;
  }
  return entries[0]?.[0] ?? "";
}

function sampleAge(bandKey: string, rng: Rng): number {
  const band = AGE_BANDS[bandKey] ?? [30, 55];
  const [lo, hi] = band;
  return Math.floor(lo + rng() * (hi - lo + 1));
}

/**
 * Costruisce distribuzioni demografiche da BES + euristiche territoriali.
 * (Fase 1 non espone ancora piramidi età comunali complete.)
 */
export async function buildDemographics(
  comuneId: string,
): Promise<DemographicBundle> {
  const bes = await getISTATData(comuneId);
  const unemployment =
    bes.find((b) => b.indicatorId === "03LAV008")?.value ?? 9.5;
  const employment =
    bes.find((b) => b.indicatorId === "03LAV001")?.value ?? 60;
  const lifeSat = bes.find((b) => b.indicatorId === "08SUB001")?.value ?? 6.8;

  const store = await readComuneElections(comuneId);
  const comuneName = store?.comuneName ?? `Comune ${comuneId}`;
  const electorate =
    store?.elections.find((e) => e.electorate)?.electorate ??
    estimateElectorate(comuneId);

  const provinceCode = comuneId.slice(0, 3);
  const regione = resolveRegione(comuneId, bes[0]?.territoryCode);

  const isMetro = ["058091", "015146", "063049", "072006", "001272"].includes(
    comuneId,
  ) || comuneName.toUpperCase().includes("ROMA");

  const u = clamp01((unemployment - 5) / 15);
  const emp = clamp01((employment - 45) / 35);

  const ageDistribution = isMetro
    ? { "18-30": 0.22, "31-50": 0.38, "51-70": 0.28, "70+": 0.12 }
    : { "18-30": 0.16, "31-50": 0.36, "51-70": 0.32, "70+": 0.16 };

  const educationDistribution: Record<EducationLevel, number> = isMetro
    ? { bassa: 0.28, media: 0.42, alta: 0.3 }
    : { bassa: 0.42, media: 0.4, alta: 0.18 };

  const incomeSkew = (lifeSat - 6) / 4;
  const incomeDistribution: Record<IncomeLevel, number> = {
    basso: clamp01(0.32 + u * 0.15 - incomeSkew * 0.08),
    medio: 0.48,
    alto: clamp01(0.2 - u * 0.1 + incomeSkew * 0.1),
  };
  renormalize(incomeDistribution);

  const occupationDistribution: Record<Occupation, number> = {
    operaio: 0.18 + (isMetro ? -0.04 : 0.04),
    impiegato: 0.28 + emp * 0.08,
    libero_professionista: 0.12 + (isMetro ? 0.05 : 0),
    studente: isMetro ? 0.12 : 0.08,
    pensionato: isMetro ? 0.18 : 0.24,
    disoccupato: 0.04 + u * 0.12,
  };
  renormalize(occupationDistribution);

  const genderDistribution: Record<Gender, number> = { M: 0.48, F: 0.52 };

  const zoneDistribution: Record<ZoneType, number> = isMetro
    ? { urbano: 0.72, suburbano: 0.22, rurale: 0.06 }
    : { urbano: 0.28, suburbano: 0.32, rurale: 0.4 };

  return {
    ageDistribution,
    educationDistribution,
    incomeDistribution,
    occupationDistribution,
    genderDistribution,
    zoneDistribution,
    provinceCode,
    comuneName,
    regione,
    electorate,
  };
}

function renormalize(dist: Record<string, number>) {
  const sum = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(dist)) dist[k] = dist[k]! / sum;
}

function estimateElectorate(comuneId: string): number {
  // Ordini di grandezza: Roma noto; altri default medio
  if (comuneId === "058091") return 2_055_000;
  return 25_000;
}

function resolveRegione(comuneId: string, nuts?: string): string {
  if (comuneId === "058091" || nuts === "ITE4") return "Lazio";
  const byNuts: Record<string, string> = {
    ITC4: "Lombardia",
    ITF3: "Campania",
    ITF4: "Puglia",
    ITH3: "Veneto",
    ITI1: "Toscana",
  };
  if (nuts && byNuts[nuts]) return byNuts[nuts]!;
  // fallback: prima regione del catalogo (meglio di stringa vuota)
  return REGIONS.find((r) => r.code === "12")?.name ?? "Italia";
}

export async function resolveBaselineShares(
  comuneId: string,
  preferredYear = 2022,
): Promise<Record<string, number>> {
  let shares = await getBaseline(comuneId, preferredYear);
  if (Object.keys(shares).length > 0) return shares;
  const years = await listAvailableYears(comuneId);
  for (const y of [...years].sort((a, b) => b - a)) {
    shares = await getBaseline(comuneId, y);
    if (Object.keys(shares).length > 0) return shares;
  }
  // Soft national fallback
  return {
    "fratelli-ditalia": 26,
    "partito-democratico": 19,
    "movimento-5-stelle": 15,
    lega: 9,
    "forza-italia": 8,
    "azione-iv": 4,
    avss: 3.5,
    "piu-europa": 2.5,
    italexit: 1.5,
  };
}

/**
 * Genera un campione di elettori per un comune.
 */
export async function generateElectors(
  comuneId: string,
  sampleSize = 1000,
  rng: Rng = Math.random,
): Promise<ElectorProfile[]> {
  const istat = await buildDemographics(comuneId);
  const baseline = await resolveBaselineShares(comuneId, 2022);

  // Converti % storiche 0..100 → pesi 0..1
  const baseAffinity: Record<string, number> = {};
  for (const party of PARTIES) {
    baseAffinity[party.slug] = (baseline[party.slug] ?? 0) / 100;
  }
  const baseSum = Object.values(baseAffinity).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(baseAffinity)) {
    baseAffinity[k] = baseAffinity[k]! / baseSum;
  }

  const electors: ElectorProfile[] = [];
  for (let i = 0; i < sampleSize; i++) {
    const ageBand = sampleFromDistribution(istat.ageDistribution, rng);
    const age = sampleAge(ageBand, rng);
    const gender = sampleFromDistribution(istat.genderDistribution, rng) as Gender;
    const education = sampleFromDistribution(
      istat.educationDistribution,
      rng,
    ) as EducationLevel;
    const income = sampleFromDistribution(
      istat.incomeDistribution,
      rng,
    ) as IncomeLevel;
    const occupation = sampleFromDistribution(
      istat.occupationDistribution,
      rng,
    ) as Occupation;
    const zone = sampleFromDistribution(istat.zoneDistribution, rng) as ZoneType;

    const partyAffinity: Record<string, number> = {};
    for (const party of PARTIES) {
      const noise = (rng() - 0.5) * 0.08;
      partyAffinity[party.slug] = Math.max(0, baseAffinity[party.slug]! + noise);
    }

    // Tilt leggero per demografia
    tiltAffinityByDemographics(partyAffinity, {
      age,
      education,
      occupation,
      zone,
      income,
    });

    const total = Object.values(partyAffinity).reduce((a, b) => a + b, 0) || 1;
    for (const key of Object.keys(partyAffinity)) {
      partyAffinity[key] = partyAffinity[key]! / total;
    }

    const previousVote = pickMax(partyAffinity);

    electors.push({
      id: `elector-${comuneId}-${i}`,
      age,
      gender,
      education,
      income,
      occupation,
      zone,
      province: istat.provinceCode,
      comuneId,
      previousVote,
      socialInfluence: 0.2 + rng() * 0.8,
      localCandidateKnowledge: 0.2 + rng() * 0.6,
      partyAffinity,
    });
  }

  return electors;
}

function tiltAffinityByDemographics(
  affinity: Record<string, number>,
  d: {
    age: number;
    education: EducationLevel;
    occupation: Occupation;
    zone: ZoneType;
    income: IncomeLevel;
  },
) {
  const bump = (slug: string, delta: number) => {
    affinity[slug] = Math.max(0, (affinity[slug] ?? 0) + delta);
  };

  if (d.age >= 65) {
    bump("fratelli-ditalia", 0.03);
    bump("lega", 0.015);
    bump("forza-italia", 0.01);
  } else if (d.age <= 30) {
    bump("movimento-5-stelle", 0.02);
    bump("avss", 0.015);
    bump("partito-democratico", 0.01);
  }

  if (d.education === "alta") {
    bump("partito-democratico", 0.02);
    bump("azione-iv", 0.015);
    bump("piu-europa", 0.01);
  }
  if (d.occupation === "disoccupato") {
    bump("movimento-5-stelle", 0.025);
    bump("avss", 0.01);
  }
  if (d.zone === "rurale") {
    bump("lega", 0.02);
    bump("fratelli-ditalia", 0.015);
  }
  if (d.zone === "urbano" && d.income === "alto") {
    bump("azione-iv", 0.015);
    bump("forza-italia", 0.01);
  }
}

function pickMax(affinity: Record<string, number>): string | null {
  let best: string | null = null;
  let v = -1;
  for (const [k, n] of Object.entries(affinity)) {
    if (n > v) {
      v = n;
      best = k;
    }
  }
  return best;
}

export { buildDemographics as getComuneDemographics };
