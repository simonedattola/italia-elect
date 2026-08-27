import type {
  CandidateInput,
  CandidateProfile,
  ModelMeta,
  PartyResult,
  ProvinceResult,
  SimulationOutput,
} from "@/types/simulation";
import type {
  ContextBundle,
  InfluenceFactor,
  SimulationScenarios,
} from "@/types/intelligence";
import type { PublicFigureProfile } from "@/lib/intelligence/publicFigure/types";
import { PARTIES, getPartyOrThrow } from "@/lib/electoral/parties";
import { PROVINCES } from "@/lib/electoral/provinces";
import {
  AREA_BIAS,
  PROVINCE_BIAS,
  getCurrentBaseline,
  getPartyHistory,
} from "@/lib/electoral/historical";
import { buildIntelligenceProfile, candidateElectoralDelta } from "@/lib/intelligence/candidateProfile";
import { recognizeCandidate } from "@/lib/intelligence/candidateRecognition";
import { buildContextBundle } from "@/lib/intelligence/contextEngine";
import { allocateChamberSeats, allocateSenateSeats } from "@/lib/simulation/seats";
import { buildCoalitions } from "@/lib/simulation/coalitions";
import {
  clamp,
  createRng,
  mean,
  percentile,
  sampleNormal,
} from "@/lib/utils";

const MODEL_VERSION = "2.3.0-electoral-compatibility";
const DEFAULT_RUNS = 10_000;

export interface EngineInput {
  candidate: CandidateInput;
  seed?: number;
  runs?: number;
  profile?: CandidateProfile;
  context?: ContextBundle;
  /** Profilo da Public Figure Recognition Engine (preferito) */
  publicFigure?: PublicFigureProfile;
  recognition?: import("@/types/intelligence").RecognizedCandidate;
}

export type SimulationOutputV2 = SimulationOutput & {
  profile: CandidateProfile;
  context: ContextBundle;
  influenceFactors: InfluenceFactor[];
  scenarios: SimulationScenarios;
};

/**
 * Motore v2:
 * 1. Riconoscimento figura pubblica
 * 2. Context Intelligence (sondaggi, economia, eventi, social, pesi dinamici)
 * 3. Impatto forte del candidato
 * 4. Monte Carlo ≥10k con trasferimenti e shock residuali
 * 5. Scenari best/worst + probabilità vittoria
 */
export function runSimulation(input: EngineInput): SimulationOutputV2 {
  const seed = input.seed ?? Math.floor(Math.random() * 1e9);
  const runs =
    input.runs ??
    Number(process.env.SIMULATION_MONTE_CARLO_RUNS || DEFAULT_RUNS);
  const rng = createRng(seed);

  const recognition =
    input.recognition ??
    recognizeCandidate(
      input.candidate.firstName,
      input.candidate.lastName,
      input.candidate.partySlug
    );
  const enriched = input.profile
    ? {
        ...input.profile,
        recognition,
        personalBrandScore:
          input.publicFigure?.personalBrandScore ??
          (input.profile as { personalBrandScore?: number }).personalBrandScore ??
          input.profile.notoriety,
      }
    : buildIntelligenceProfile(
        input.candidate,
        recognition,
        input.publicFigure
      );
  const profile = enriched;
  const personalBrand =
    ("personalBrandScore" in enriched && typeof enriched.personalBrandScore === "number"
      ? enriched.personalBrandScore
      : input.publicFigure?.personalBrandScore) ?? profile.notoriety;
  const personalImpact =
    ("personalImpactScore" in enriched &&
    typeof (enriched as { personalImpactScore?: number }).personalImpactScore === "number"
      ? (enriched as { personalImpactScore: number }).personalImpactScore
      : undefined);
  const categoricalRejection = Boolean(
    (enriched as { compatibilityBreakdown?: { categoricalRejection?: boolean } })
      .compatibilityBreakdown?.categoricalRejection
  );
  const leaderParty = getPartyOrThrow(input.candidate.partySlug);

  const context =
    input.context ??
    buildContextBundle({
      profile,
      leaderPartySlug: leaderParty.slug,
      candidateName: `${input.candidate.firstName} ${input.candidate.lastName}`,
    });

  const historical = getCurrentBaseline();
  let cand = candidateElectoralDelta(
    profile,
    personalBrand,
    personalImpact,
    categoricalRejection
  );
  const w = context.weights;

  // Peso candidato più alto se figura pubblica nazionale
  // Con rifiuto categorico il peso serve a DISTRUGGERE il consenso, non a preservarlo
  const candidateWeight =
    recognition.category === "NATIONAL_PUBLIC"
      ? Math.min(0.42, w.candidate + 0.12)
      : w.candidate;

  const expectedShares = applyCandidateToBaseline({
    contextBaseline: context.contextAdjustedBaseline,
    leaderSlug: leaderParty.slug,
    cand,
    candidateWeight,
    partyIdentityWeight: w.partyIdentity,
    historicalShare: historical[leaderParty.slug] ?? 5,
    partyCompatibility: profile.partyCompatibility,
  });

  // Sanity check: compatibilità bassissima non può lasciare il partito vicino allo storico
  const histShare = historical[leaderParty.slug] ?? 5;
  if (
    profile.partyCompatibility < 15 &&
    (expectedShares[leaderParty.slug] ?? 0) > histShare * 0.55
  ) {
    cand = { ...cand, sanityAdjusted: true };
    const corrected = Math.max(
      0.8,
      histShare * (0.12 + (profile.partyCompatibility / 100) * 0.25)
    );
    const prev = expectedShares[leaderParty.slug] ?? histShare;
    expectedShares[leaderParty.slug] = corrected;
    const spilled = prev - corrected;
    const others = PARTIES.filter((p) => p.slug !== leaderParty.slug);
    const otherSum = others.reduce((a, p) => a + (expectedShares[p.slug] || 0.1), 0);
    for (const p of others) {
      expectedShares[p.slug] =
        (expectedShares[p.slug] || 0.1) + spilled * ((expectedShares[p.slug] || 0.1) / otherSum);
    }
    const sum = Object.values(expectedShares).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(expectedShares)) {
      expectedShares[k] = (expectedShares[k] / sum) * 100;
    }
  }

  const samples: Record<string, number[]> = {};
  for (const p of PARTIES) samples[p.slug] = [];

  const volatility =
    0.85 +
    (1 - profile.partyCompatibility / 100) * 0.35 +
    context.economy.abstentionBoost * 0.25 +
    w.events * 0.4;

  for (let i = 0; i < runs; i++) {
    // Eventi casuali residui (± shock)
    const eventNoise = sampleNormal(rng, 0, 0.35 * w.events * 4);
    const transfer = simulateVoteTransfers(expectedShares, leaderParty.slug, rng, profile);
    const draw = noisyDraw(transfer, rng, volatility);
    if (Math.abs(eventNoise) > 0.01) {
      draw[leaderParty.slug] = Math.max(0.3, draw[leaderParty.slug] + eventNoise);
      const normed = normalize(draw);
      for (const slug of Object.keys(normed)) samples[slug].push(normed[slug]);
    } else {
      for (const slug of Object.keys(draw)) samples[slug].push(draw[slug]);
    }
  }

  const nationalResults: PartyResult[] = PARTIES.map((p) => {
    const arr = [...samples[p.slug]].sort((a, b) => a - b);
    const pct = mean(arr);
    const base = historical[p.slug] ?? 0;
    return {
      partySlug: p.slug,
      partyName: p.name,
      shortName: p.shortName,
      color: p.color,
      percentage: round1(pct),
      percentageLow: round1(percentile(arr, 10)),
      percentageHigh: round1(percentile(arr, 90)),
      swing: round1(pct - base),
      seatsChamber: 0,
      seatsSenate: 0,
    };
  }).sort((a, b) => b.percentage - a.percentage);

  const chamberSeats = allocateChamberSeats(nationalResults);
  const senateSeats = allocateSenateSeats(nationalResults);
  for (const r of nationalResults) {
    r.seatsChamber = chamberSeats.byParty[r.partySlug] ?? 0;
    r.seatsSenate = senateSeats.byParty[r.partySlug] ?? 0;
  }

  const coalitions = buildCoalitions(nationalResults, chamberSeats, senateSeats);
  const provincialMap = buildProvincialMap(
    expectedShares,
    leaderParty.slug,
    cand.multiplier,
    rng
  );

  let wins = 0;
  const leaderArr = samples[leaderParty.slug];
  for (let i = 0; i < runs; i++) {
    const row = PARTIES.map((p) => ({
      slug: p.slug,
      pct: samples[p.slug][i],
      family: p.coalitionFamily,
    })).sort((a, b) => b.pct - a.pct);

    const leaderPct = leaderArr[i];
    const coalitionPct = row
      .filter((x) => x.family === leaderParty.coalitionFamily)
      .reduce((a, x) => a + x.pct, 0);
    const shareOfCoalition = coalitionPct > 0 ? leaderPct / coalitionPct : 0;
    const partyFirst = row[0].slug === leaderParty.slug;
    const coalitionWin =
      coalitionPct >= 40 && leaderPct >= 8 && shareOfCoalition >= 0.22;
    if (partyFirst || coalitionWin) wins++;
  }

  const winProbability = round1((wins / runs) * 100);
  const leaderResult = nationalResults.find((r) => r.partySlug === leaderParty.slug)!;
  const leaderSorted = [...leaderArr].sort((a, b) => a - b);

  const scenarios: SimulationScenarios = {
    mean: Object.fromEntries(nationalResults.map((r) => [r.partySlug, r.percentage])),
    best: Object.fromEntries(
      PARTIES.map((p) => {
        const arr = [...samples[p.slug]].sort((a, b) => a - b);
        return [p.slug, round1(percentile(arr, 90))];
      })
    ),
    worst: Object.fromEntries(
      PARTIES.map((p) => {
        const arr = [...samples[p.slug]].sort((a, b) => a - b);
        return [p.slug, round1(percentile(arr, 10))];
      })
    ),
    leaderMean: round1(mean(leaderSorted)),
    leaderBest: round1(percentile(leaderSorted, 90)),
    leaderWorst: round1(percentile(leaderSorted, 10)),
  };

  const modelMeta: ModelMeta = {
    version: MODEL_VERSION,
    method: [
      "Public Figure Recognition Engine",
      "Personal Impact Score",
      "Electoral Compatibility Score (non lineare)",
      "Red-flag multiplicative rejection",
      "Personal Brand Score",
      "Context Intelligence Engine",
      "Poll Aggregator (media ponderata)",
      "Economic Sentiment Index",
      "Event Impact Analysis",
      "Social Momentum Score (secondario)",
      "Bayesian baseline blend",
      "Sanity check compatibilità",
      "Monte Carlo Simulation",
      "Allocazione seggi proporzionale (semplificata)",
    ],
    monteCarloRuns: runs,
    seed,
    variables: [
      "storico elettorale",
      "sondaggi aggregati",
      "economia",
      "eventi politici",
      "social momentum",
      "pesi dinamici di scenario",
      "profilo candidato",
      "compatibilità partito",
      "segmenti elettorali",
      "volatilità / trasferimenti",
    ],
    dataSources: context.sources.slice(0, 12),
    disclaimer: context.disclaimer,
    candidateDataQuality: profile.dataQuality,
    generatedAt: new Date().toISOString(),
  };

  return {
    nationalResults,
    chamberSeats,
    senateSeats,
    coalitions,
    provincialMap,
    winProbability,
    confidenceLow: leaderResult.percentageLow,
    confidenceHigh: leaderResult.percentageHigh,
    modelMeta,
    profile,
    context,
    influenceFactors: context.influenceFactors,
    scenarios,
  };
}

function applyCandidateToBaseline(opts: {
  contextBaseline: Record<string, number>;
  leaderSlug: string;
  cand: ReturnType<typeof candidateElectoralDelta>;
  candidateWeight: number;
  partyIdentityWeight: number;
  historicalShare: number;
  partyCompatibility: number;
}): Record<string, number> {
  const {
    contextBaseline,
    leaderSlug,
    cand,
    candidateWeight,
    partyIdentityWeight,
    historicalShare,
    partyCompatibility,
  } = opts;

  const raw: Record<string, number> = { ...contextBaseline };
  const baseLeader = raw[leaderSlug] ?? historicalShare;
  const compat = partyCompatibility / 100;

  let newLeader: number;

  if (cand.categoricalRejection) {
    // Rifiuto categorico: la notorietà NON preserva il voto storico.
    const toxicity = 0.55 + (cand.personalImpactScore / 100) * 0.35;
    const retained = clamp(
      cand.leakFactor * (0.25 + compat * 0.2) * (1 - toxicity * 0.35),
      0.04,
      0.22
    );
    newLeader = baseLeader * retained - cand.rejectionPts * 0.15;
    newLeader = clamp(newLeader, 0.5, baseLeader * 0.28);
  } else if (partyCompatibility < 25) {
    // Incompatibilità forte (es. Berlusconi/Meloni su PD): fuga del nucleo
    const retained = clamp(
      0.32 + compat * 0.5 + cand.leakFactor * 0.15 - (cand.personalImpactScore / 100) * 0.1,
      0.18,
      0.58
    );
    newLeader =
      baseLeader * retained +
      cand.attractionPts * candidateWeight -
      cand.rejectionPts * 0.3;
    newLeader = clamp(newLeader, 1.2, baseLeader * 0.72);
  } else {
    // Regime normale: candidato può amplificare o erodere
    const identityAnchor = historicalShare * partyIdentityWeight * 0.5 * compat;
    newLeader =
      baseLeader * (1 - candidateWeight * 0.85) +
      baseLeader * cand.multiplier * cand.leakFactor * candidateWeight * 0.85 +
      cand.attractionPts * candidateWeight * 2 -
      cand.rejectionPts * 0.2 * (1 - compat) +
      identityAnchor * 0.15;

    if (cand.leakFactor < 0.5) {
      newLeader *= 0.75 + cand.leakFactor * 0.4;
    }
    if (cand.multiplier > 1.15 && baseLeader < 20 && compat >= 0.55) {
      const boost =
        (cand.multiplier - 1) * (24 - baseLeader) * 0.85 * Math.max(candidateWeight, 0.2);
      newLeader += boost;
    }
    if (cand.multiplier > 1.3 && cand.leakFactor > 0.65 && compat >= 0.6) {
      newLeader += (5 + (1 - baseLeader / 30) * 4) * candidateWeight;
    }
    newLeader = clamp(newLeader, 1.0, 48);
  }

  const delta = newLeader - baseLeader;
  raw[leaderSlug] = newLeader;

  const others = PARTIES.filter((p) => p.slug !== leaderSlug);
  const otherSum = others.reduce((a, p) => a + (raw[p.slug] || 0.1), 0);
  if (delta > 0) {
    for (const p of others) {
      const share = (raw[p.slug] || 0.1) / otherSum;
      raw[p.slug] = Math.max(0.3, raw[p.slug] - delta * share);
    }
  } else {
    const loss = -delta;
    for (const p of others) {
      const share = (raw[p.slug] || 0.1) / otherSum;
      raw[p.slug] = raw[p.slug] + loss * share;
    }
  }
  return normalize(raw);
}

function simulateVoteTransfers(
  expected: Record<string, number>,
  leaderSlug: string,
  rng: () => number,
  profile: CandidateProfile
): Record<string, number> {
  const out = { ...expected };
  // Piccoli trasferimenti stocastici tra partiti contigui
  const slugs = PARTIES.map((p) => p.slug);
  const transfers = 1 + Math.floor(rng() * 3);
  for (let t = 0; t < transfers; t++) {
    const from = slugs[Math.floor(rng() * slugs.length)];
    const to = slugs[Math.floor(rng() * slugs.length)];
    if (from === to) continue;
    const amt = rng() * 0.6 * (from === leaderSlug || to === leaderSlug ? 1.2 : 1);
    if (out[from] > amt + 0.5) {
      out[from] -= amt;
      out[to] += amt;
    }
  }
  // Indecisi → leader se undecidedAppeal alto
  if (profile.undecidedAppeal > 55 && rng() > 0.4) {
    out[leaderSlug] += rng() * 0.8;
  }
  return normalize(out);
}

function noisyDraw(
  expected: Record<string, number>,
  rng: () => number,
  volatilityScale: number
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const [slug, mu] of Object.entries(expected)) {
    const sigma = (0.55 + mu * 0.035) * volatilityScale;
    raw[slug] = Math.max(0.1, sampleNormal(rng, mu, sigma));
  }
  return normalize(raw);
}

function buildProvincialMap(
  national: Record<string, number>,
  leaderSlug: string,
  leaderMult: number,
  rng: () => number
): ProvinceResult[] {
  return PROVINCES.map((prov) => {
    const areaBias = AREA_BIAS[prov.area] ?? {};
    const provBias = PROVINCE_BIAS[prov.code] ?? {};
    const local: Record<string, number> = {};
    for (const p of PARTIES) {
      const ab = areaBias[p.slug] ?? 1;
      const pb = provBias[p.slug] ?? 1;
      let v = (national[p.slug] ?? 0) * ab * pb;
      if (p.slug === leaderSlug) v *= 0.95 + 0.1 * Math.min(leaderMult, 1.4);
      v *= 0.97 + rng() * 0.06;
      local[p.slug] = v;
    }
    const normed = normalize(local);
    const ranked = Object.entries(normed).sort((a, b) => b[1] - a[1]);
    const winnerSlug = ranked[0][0];
    const winner = getPartyOrThrow(winnerSlug);
    return {
      provinceCode: prov.code,
      provinceName: prov.name,
      regionName: prov.regionName,
      winnerSlug,
      winnerName: winner.shortName,
      winnerColor: winner.color,
      percentage: round1(ranked[0][1]),
      swing: round1(ranked[0][1] - (national[winnerSlug] ?? 0)),
      turnout: round1(56 + rng() * 20),
      topParties: ranked.slice(0, 4).map(([slug, percentage]) => ({
        slug,
        percentage: round1(percentage),
        color: getPartyOrThrow(slug).color,
      })),
    };
  });
}

function normalize(shares: Record<string, number>): Record<string, number> {
  const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) out[k] = (v / sum) * 100;
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export { getPartyHistory };
