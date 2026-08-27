/**
 * Context Intelligence Engine — aggrega sondaggi, economia, eventi, social,
 * pesi dinamici e baseline corretta per il Monte Carlo.
 */

import type {
  ContextBundle,
  DynamicWeights,
  InfluenceFactor,
  ScenarioRegime,
  VoterSegmentImpact,
} from "@/types/intelligence";
import type { CandidateProfile } from "@/types/simulation";
import { aggregatePolls, blendBaselineWithPolls } from "@/lib/intelligence/polls";
import {
  computeEconomicSentiment,
  economicPartyShocks,
} from "@/lib/intelligence/economicModel";
import {
  analyzeEvents,
  detectRegimeFromEvents,
} from "@/lib/intelligence/newsAnalysis";
import {
  analyzeSocialMomentum,
  socialPartyShocks,
} from "@/lib/intelligence/socialAnalysis";
import { candidateElectoralDelta } from "@/lib/intelligence/candidateProfile";
import { getCurrentBaseline } from "@/lib/electoral/historical";
import { PARTIES } from "@/lib/electoral/parties";
import { clamp } from "@/lib/utils";

function computeDynamicWeights(opts: {
  economyIndex: number;
  crisisPolitical: boolean;
  crisisEconomic: boolean;
  international: boolean;
  pollReliability: number;
}): DynamicWeights {
  const { economyIndex, crisisPolitical, crisisEconomic, international, pollReliability } = opts;
  const rationale: string[] = [];

  let regime: ScenarioRegime = "stable";
  let weights = {
    historical: 0.22,
    polls: 0.22,
    economy: 0.1,
    events: 0.1,
    social: 0.05,
    candidate: 0.18,
    partyIdentity: 0.08,
    territorialLoyalty: 0.05,
  };

  if (crisisEconomic && !crisisPolitical) {
    regime = "economic_crisis";
    weights = {
      historical: 0.12,
      polls: 0.18,
      economy: 0.22,
      events: 0.12,
      social: 0.05,
      candidate: 0.16,
      partyIdentity: 0.08,
      territorialLoyalty: 0.07,
    };
    rationale.push(
      "Regime crisi economica: aumentati pesi su economia, costo della vita, fiducia nel governo e voto protesta."
    );
  } else if (crisisPolitical) {
    regime = "political_crisis";
    weights = {
      historical: 0.1,
      polls: 0.16,
      economy: 0.1,
      events: 0.16,
      social: 0.06,
      candidate: 0.28,
      partyIdentity: 0.08,
      territorialLoyalty: 0.06,
    };
    rationale.push(
      "Regime crisi politica/reputazionale: aumentati pesi su reputazione candidato, fiducia personale e leadership."
    );
  } else if (international) {
    regime = "international_tension";
    weights = {
      historical: 0.16,
      polls: 0.2,
      economy: 0.1,
      events: 0.16,
      social: 0.06,
      candidate: 0.18,
      partyIdentity: 0.08,
      territorialLoyalty: 0.06,
    };
    rationale.push("Tensione internazionale: maggior peso a eventi e leadership.");
  } else if (Math.abs(economyIndex) < 0.12) {
    regime = "stable";
    weights = {
      historical: 0.2,
      polls: 0.18,
      economy: 0.08,
      events: 0.08,
      social: 0.04,
      candidate: 0.16,
      partyIdentity: 0.14,
      territorialLoyalty: 0.12,
    };
    rationale.push(
      "Periodo stabile: aumentati pesi su identità di partito, struttura territoriale e fedeltà elettorale."
    );
  } else {
    regime = "mixed";
    rationale.push("Scenario misto: bilanciamento tra storico, sondaggi, contesto e candidato.");
  }

  // Affidabilità sondaggi → ribilancia polls vs historical
  if (pollReliability < 0.65) {
    const shift = 0.06;
    weights.polls = Math.max(0.1, weights.polls - shift);
    weights.historical += shift;
    rationale.push("Affidabilità aggregata sondaggi moderata: più peso allo storico.");
  }

  // Normalizza
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(weights) as (keyof typeof weights)[]) {
    weights[k] = weights[k] / sum;
  }

  return { ...weights, regime, rationale };
}

function buildSegments(
  profile: CandidateProfile,
  economyIndex: number
): VoterSegmentImpact[] {
  const compat = profile.partyCompatibility / 100;
  const noto = profile.notoriety / 100;
  const scandal = profile.scandalRisk / 100;
  const lead = profile.leadership / 100;

  return [
    {
      segment: "elettori fedeli",
      attraction: clamp(compat * 0.8 - scandal * 0.5, -1, 1),
      loss: clamp((1 - compat) * 0.9 + scandal * 0.4, 0, 1),
      mobilization: clamp(compat * 0.7 + lead * 0.2, 0, 1),
    },
    {
      segment: "moderati",
      attraction: clamp(profile.undecidedAppeal / 100 * 0.6 + (1 - Math.abs(0.5 - compat)) * 0.3 - scandal * 0.4, -1, 1),
      loss: clamp((1 - compat) * 0.5 + scandal * 0.3, 0, 1),
      mobilization: clamp(profile.credibility / 100 * 0.5, 0, 1),
    },
    {
      segment: "indecisi",
      attraction: clamp(profile.undecidedAppeal / 100 - scandal * 0.35, -1, 1),
      loss: 0.2,
      mobilization: clamp(noto * 0.4 + profile.communication / 100 * 0.4, 0, 1),
    },
    {
      segment: "giovani",
      attraction: clamp(profile.communication / 100 * 0.5 + profile.socialConsensus / 100 * 0.3 - 0.1, -1, 1),
      loss: clamp(scandal * 0.25, 0, 1),
      mobilization: clamp(profile.socialConsensus / 100 * 0.6, 0, 1),
    },
    {
      segment: "anziani",
      attraction: clamp(compat * 0.6 + profile.credibility / 100 * 0.3, -1, 1),
      loss: clamp((1 - compat) * 0.4, 0, 1),
      mobilization: clamp(compat * 0.55, 0, 1),
    },
    {
      segment: "lavoratori",
      attraction: clamp(-economyIndex * 0.3 + compat * 0.3, -1, 1),
      loss: clamp(Math.max(0, -economyIndex) * 0.35, 0, 1),
      mobilization: clamp(0.4 + Math.max(0, -economyIndex) * 0.3, 0, 1),
    },
    {
      segment: "imprenditori",
      attraction: clamp(economyIndex * 0.25 + profile.competence / 100 * 0.3, -1, 1),
      loss: clamp(Math.max(0, -economyIndex) * 0.2, 0, 1),
      mobilization: 0.35,
    },
    {
      segment: "astensionisti",
      attraction: clamp(profile.mobilization / 100 * 0.5 + noto * 0.2 - scandal * 0.4, -1, 1),
      loss: 0.1,
      mobilization: clamp(profile.mobilization / 100, 0, 1),
    },
  ];
}

function applyShocks(
  baseline: Record<string, number>,
  shocks: Record<string, number>[]
): Record<string, number> {
  const out: Record<string, number> = { ...baseline };
  for (const shock of shocks) {
    for (const [slug, pts] of Object.entries(shock)) {
      out[slug] = (out[slug] ?? 0) + pts;
    }
  }
  for (const k of Object.keys(out)) out[k] = Math.max(0.2, out[k]);
  const sum = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(out)) out[k] = (out[k] / sum) * 100;
  return out;
}

export function buildContextBundle(opts: {
  profile: CandidateProfile;
  leaderPartySlug: string;
  candidateName: string;
}): ContextBundle {
  const { profile, leaderPartySlug, candidateName } = opts;
  const historical = getCurrentBaseline();
  const polls = aggregatePolls();
  const economy = computeEconomicSentiment();
  const events = analyzeEvents();
  const social = analyzeSocialMomentum({ profile, candidateName });
  const regimeFlags = detectRegimeFromEvents(events, economy.index);

  const weights = computeDynamicWeights({
    economyIndex: economy.index,
    crisisPolitical: regimeFlags.crisisPolitical || profile.scandalRisk > 75,
    crisisEconomic: regimeFlags.crisisEconomic,
    international: regimeFlags.international,
    pollReliability: polls.sampleWeightedReliability,
  });

  const pollCorrected = blendBaselineWithPolls(
    historical,
    polls,
    0.35 + weights.polls * 0.4
  );

  const ecoShocks = economicPartyShocks(economy);
  const eventShocks = events.netPartyShocks;
  const socShocks = socialPartyShocks(social);

  // Pesa gli shock col peso dinamico del contesto
  const scale = (shock: Record<string, number>, w: number) => {
    const o: Record<string, number> = {};
    for (const [k, v] of Object.entries(shock)) o[k] = v * (w / 0.12);
    return o;
  };

  const contextAdjusted = applyShocks(pollCorrected, [
    scale(ecoShocks, weights.economy),
    scale(eventShocks, weights.events),
    scale(socShocks, weights.social),
  ]);

  const candDelta = candidateElectoralDelta(profile);
  const segments = buildSegments(profile, economy.index);

  const leaderHist = historical[leaderPartySlug] ?? 0;
  const leaderPoll = polls.shares[leaderPartySlug] ?? leaderHist;

  const influenceFactors: InfluenceFactor[] = [
    {
      id: "candidate",
      label: "Effetto candidato",
      effectPts: Math.round(candDelta.expectedPts * 10) / 10,
      weight: weights.candidate,
      detail: `Personal Impact ${candDelta.personalImpactScore}/100 · Electoral Compatibility ${profile.partyCompatibility}/100 · leak ${candDelta.leakFactor.toFixed(2)} · rejection ${candDelta.rejectionPts.toFixed(1)}${candDelta.categoricalRejection ? " · RIFIUTO CATEGORICO" : ""}`,
      polarity:
        candDelta.expectedPts > 0.3
          ? "positive"
          : candDelta.expectedPts < -0.3
            ? "negative"
            : "neutral",
    },
    {
      id: "party",
      label: "Effetto partito / identità",
      effectPts: Math.round((leaderHist - 20) * weights.partyIdentity * 10) / 10,
      weight: weights.partyIdentity + weights.territorialLoyalty,
      detail: `Baseline storica ${leaderHist.toFixed(1)}% · regime ${weights.regime}`,
      polarity: "neutral",
    },
    {
      id: "polls",
      label: "Effetto sondaggi",
      effectPts: Math.round((leaderPoll - leaderHist) * 10) / 10,
      weight: weights.polls,
      detail: `Media ponderata ${polls.pollCount} istituti (${polls.institutes.join(", ")})`,
      polarity:
        leaderPoll - leaderHist > 0.3
          ? "positive"
          : leaderPoll - leaderHist < -0.3
            ? "negative"
            : "neutral",
    },
    {
      id: "economy",
      label: "Effetto economia",
      effectPts: Math.round((ecoShocks[leaderPartySlug] ?? 0) * 10) / 10,
      weight: weights.economy,
      detail: `Economic Sentiment Index ${(economy.index * 100).toFixed(0)} · inflazione ${economy.inflation}% · disoccupazione ${economy.unemployment}%`,
      polarity:
        (ecoShocks[leaderPartySlug] ?? 0) > 0.2
          ? "positive"
          : (ecoShocks[leaderPartySlug] ?? 0) < -0.2
            ? "negative"
            : "neutral",
    },
    {
      id: "events",
      label: "Eventi recenti",
      effectPts: Math.round((eventShocks[leaderPartySlug] ?? 0) * 10) / 10,
      weight: weights.events,
      detail:
        events.events.slice(0, 3).map((e) => e.title).join("; ") ||
        "Nessun evento ad alta intensità residua",
      polarity:
        (eventShocks[leaderPartySlug] ?? 0) > 0.15
          ? "positive"
          : (eventShocks[leaderPartySlug] ?? 0) < -0.15
            ? "negative"
            : "neutral",
    },
    {
      id: "social",
      label: "Trend social",
      effectPts: Math.round((socShocks[leaderPartySlug] ?? 0) * 10) / 10,
      weight: weights.social,
      detail: social.note,
      polarity:
        social.scoreByCandidate > 0.15
          ? "positive"
          : social.scoreByCandidate < -0.15
            ? "negative"
            : "neutral",
    },
  ];

  const sources = [
    ...polls.sources.map((s) => `Sondaggio ${s.institute} (${s.publishedAt})`),
    ...economy.sources,
    ...events.sources,
    ...social.sources,
    "Ministero dell'Interno / Eligendo (storico)",
  ];

  const reliability = clamp(
    0.35 * polls.sampleWeightedReliability +
      0.25 * (profile.dataQuality === "high" ? 0.9 : profile.dataQuality === "medium" ? 0.7 : 0.45) +
      0.2 * 0.8 +
      0.2 * (social.available ? 0.6 : 0.5),
    0.3,
    0.95
  );

  return {
    weights,
    polls,
    economy,
    events,
    social,
    segments,
    influenceFactors,
    pollCorrectedBaseline: pollCorrected,
    contextAdjustedBaseline: contextAdjusted,
    reliability,
    lastUpdated: new Date().toISOString(),
    sources,
    disclaimer:
      "Questa è una simulazione statistica basata su dati storici, informazioni attuali e modelli di intelligenza artificiale. Non rappresenta una previsione certa del risultato elettorale.",
  };
}

export function listPartySlugs() {
  return PARTIES.map((p) => p.slug);
}
